import { useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { sendMessageStream } from '../api/stream';
import { createConversation } from '../api/conversations';
import type { Citation, ConversationDetail } from '../types/api';

interface UseSendMessageStreamOptions {
  assistantId: string;
  conversationId: string | null;
  onConversationCreated: (id: string) => void;
}

export function useSendMessageStream({
  assistantId,
  conversationId,
  onConversationCreated,
}: UseSendMessageStreamOptions) {
  const qc = useQueryClient();
  const ctrlRef = useRef<AbortController | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      setIsStreaming(true);
      setError(null);

      // Lazy conversation creation
      let convId = conversationId;
      if (!convId) {
        try {
          const conv = await createConversation(assistantId, content.slice(0, 40));
          convId = conv.id;
          onConversationCreated(convId);
          void qc.invalidateQueries({ queryKey: ['conversations', assistantId] });
        } catch {
          setError('No se pudo crear la conversación.');
          setIsStreaming(false);
          return;
        }
      }

      const streamingId = `streaming-${Date.now()}`;
      const now = new Date().toISOString();

      // Optimistic update
      qc.setQueryData<ConversationDetail>(['conversation', convId], (prev) => {
        const base = prev ?? {
          id: convId!,
          assistant_id: assistantId,
          created_at: now,
          updated_at: now,
          messages: [],
        };
        return {
          ...base,
          messages: [
            ...base.messages,
            {
              id: `user-opt-${streamingId}`,
              conversation_id: convId!,
              role: 'user' as const,
              content,
              created_at: now,
              citations: [],
            },
            {
              id: streamingId,
              conversation_id: convId!,
              role: 'assistant' as const,
              content: '',
              created_at: now,
              citations: [],
            },
          ],
        };
      });

      let accumulated = '';
      let pendingCitations: Citation[] = [];

      ctrlRef.current = sendMessageStream({
        conversationId: convId,
        content,
        onToken(token) {
          accumulated += token;
          qc.setQueryData<ConversationDetail>(['conversation', convId!], (prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              messages: prev.messages.map((m) =>
                m.id === streamingId ? { ...m, content: accumulated } : m,
              ),
            };
          });
        },
        onCitations(citations) {
          pendingCitations = citations;
        },
        onDone() {
          // Attach citations to streaming bubble, then refresh from server
          qc.setQueryData<ConversationDetail>(['conversation', convId!], (prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              messages: prev.messages.map((m) =>
                m.id === streamingId
                  ? { ...m, content: accumulated, citations: pendingCitations }
                  : m,
              ),
            };
          });
          void qc.invalidateQueries({ queryKey: ['conversation', convId!] });
          setIsStreaming(false);
          ctrlRef.current = null;
        },
        onError(err) {
          setError(err.message);
          setIsStreaming(false);
          ctrlRef.current = null;
        },
      });
    },
    [assistantId, conversationId, isStreaming, onConversationCreated, qc],
  );

  const cancel = useCallback(() => {
    ctrlRef.current?.abort();
    ctrlRef.current = null;
    setIsStreaming(false);
  }, []);

  return { send, cancel, isStreaming, error };
}
