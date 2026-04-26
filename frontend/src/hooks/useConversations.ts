import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listConversations, createConversation, deleteConversation } from '../api/conversations';
import { useToastStore } from '../store/toastStore';

export function useConversations(assistantId: string | null) {
  return useQuery({
    queryKey: ['conversations', assistantId],
    queryFn: () => listConversations(assistantId!),
    enabled: !!assistantId,
  });
}

export function useCreateConversation(assistantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (title?: string) => createConversation(assistantId, title),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['conversations', assistantId] });
    },
  });
}

export function useDeleteConversation(assistantId: string) {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.add);
  return useMutation({
    mutationFn: (conversationId: string) => deleteConversation(conversationId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['conversations', assistantId] });
      addToast('Conversación eliminada');
    },
  });
}
