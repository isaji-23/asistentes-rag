import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendMessage } from '../api/messages';
import { createConversation } from '../api/conversations';
import type { ConversationDetail } from '../types/api';

interface UseSendMessageOptions {
  assistantId: string;
  conversationId: string | null;
  onConversationCreated: (id: string) => void;
}

const OPTIMISTIC_USER_ID = '__optimistic_user__';

export function useSendMessage({ assistantId, conversationId, onConversationCreated }: UseSendMessageOptions) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      let convId = conversationId;
      if (!convId) {
        const conv = await createConversation(assistantId);
        convId = conv.id;
        onConversationCreated(convId);
      }
      return sendMessage(convId, content);
    },
    onMutate: (content) => {
      // Only possible if conversation already exists; new conversations have no cache yet
      if (!conversationId) return;
      const now = new Date().toISOString();
      qc.setQueryData<ConversationDetail>(['conversation', conversationId], (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [
            ...prev.messages,
            {
              id: OPTIMISTIC_USER_ID,
              conversation_id: conversationId,
              role: 'user' as const,
              content,
              created_at: now,
              citations: [],
            },
          ],
        };
      });
    },
    onSuccess: (response) => {
      const convId = response.user_message.conversation_id;
      qc.setQueryData<ConversationDetail>(['conversation', convId], (prev) => {
        const base = prev ?? {
          id: convId,
          assistant_id: assistantId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          messages: [],
        };
        // Remove optimistic placeholder and add real messages from server
        const withoutOptimistic = base.messages.filter((m) => m.id !== OPTIMISTIC_USER_ID);
        const already = withoutOptimistic.some((m) => m.id === response.assistant_message.id);
        if (already) return { ...base, messages: withoutOptimistic };
        return {
          ...base,
          messages: [...withoutOptimistic, response.user_message, response.assistant_message],
        };
      });
      void qc.invalidateQueries({ queryKey: ['conversations', assistantId] });
    },
    onError: (_err, _content, _ctx) => {
      // Remove optimistic message on error
      if (!conversationId) return;
      qc.setQueryData<ConversationDetail>(['conversation', conversationId], (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.filter((m) => m.id !== OPTIMISTIC_USER_ID),
        };
      });
    },
  });
}
