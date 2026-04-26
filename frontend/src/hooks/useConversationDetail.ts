import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getConversation } from '../api/conversations';
import type { ConversationDetail } from '../types/api';

export function useConversationDetail(conversationId: string | null) {
  return useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => getConversation(conversationId!),
    enabled: !!conversationId,
  });
}

export function useConversationDetailUpdater(conversationId: string | null) {
  const qc = useQueryClient();

  function appendOptimisticMessage(
    userContent: string,
    streamingId: string,
  ) {
    if (!conversationId) return;
    qc.setQueryData<ConversationDetail>(['conversation', conversationId], (prev) => {
      if (!prev) return prev;
      const now = new Date().toISOString();
      return {
        ...prev,
        messages: [
          ...prev.messages,
          {
            id: `user-${streamingId}`,
            conversation_id: conversationId,
            role: 'user' as const,
            content: userContent,
            created_at: now,
            citations: [],
          },
          {
            id: streamingId,
            conversation_id: conversationId,
            role: 'assistant' as const,
            content: '',
            created_at: now,
            citations: [],
          },
        ],
      };
    });
  }

  function updateStreamingContent(streamingId: string, content: string) {
    if (!conversationId) return;
    qc.setQueryData<ConversationDetail>(['conversation', conversationId], (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        messages: prev.messages.map((m) =>
          m.id === streamingId ? { ...m, content } : m,
        ),
      };
    });
  }

  function finalizeMessage(streamingId: string) {
    if (!conversationId) return;
    void qc.invalidateQueries({ queryKey: ['conversation', conversationId] });
    // Remove optimistic user message placeholder (server returns real IDs)
    void qc.invalidateQueries({ queryKey: ['conversation', conversationId] });
  }

  return { appendOptimisticMessage, updateStreamingContent, finalizeMessage };
}
