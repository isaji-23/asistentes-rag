import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listDocuments, uploadDocument, deleteDocument } from '../api/documents';
import type { Document } from '../types/api';
import { useToastStore } from '../store/toastStore';

export function useDocuments(assistantId: string | null) {
  return useQuery({
    queryKey: ['documents', assistantId],
    queryFn: () => listDocuments(assistantId!),
    enabled: !!assistantId,
    refetchInterval: (query) => {
      const data = query.state.data as Document[] | undefined;
      const hasPending = data?.some((d) => d.status === 'pending') ?? false;
      return hasPending ? 3000 : false;
    },
  });
}

export function useUploadDocument(assistantId: string) {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.add);
  return useMutation({
    mutationFn: (file: File) => uploadDocument(assistantId, file),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['documents', assistantId] });
      addToast('Documento subido');
    },
  });
}

export function useDeleteDocument(assistantId: string) {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.add);
  return useMutation({
    mutationFn: (docId: string) => deleteDocument(assistantId, docId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['documents', assistantId] });
      addToast('Documento eliminado');
    },
  });
}
