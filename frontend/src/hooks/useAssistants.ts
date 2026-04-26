import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listAssistants,
  getAssistant,
  createAssistant,
  updateAssistant,
  deleteAssistant,
  type CreateAssistantBody,
  type UpdateAssistantBody,
} from '../api/assistants';
import { useToastStore } from '../store/toastStore';

export function useAssistants() {
  return useQuery({
    queryKey: ['assistants'],
    queryFn: listAssistants,
  });
}

export function useGetAssistant(id: string | null) {
  return useQuery({
    queryKey: ['assistants', id],
    queryFn: () => getAssistant(id!),
    enabled: !!id,
  });
}

export function useCreateAssistant() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.add);
  return useMutation({
    mutationFn: (body: CreateAssistantBody) => createAssistant(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['assistants'] });
      addToast('Asistente creado');
    },
  });
}

export function useUpdateAssistant() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.add);
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateAssistantBody }) => updateAssistant(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['assistants'] });
      addToast('Asistente actualizado');
    },
  });
}

export function useDeleteAssistant() {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.add);
  return useMutation({
    mutationFn: (id: string) => deleteAssistant(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['assistants'] });
      addToast('Asistente eliminado');
    },
  });
}
