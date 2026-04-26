import { client } from './client';
import type { Document } from '../types/api';

export async function listDocuments(assistantId: string): Promise<Document[]> {
  const { data } = await client.get<Document[]>(`/assistants/${assistantId}/documents`);
  return data;
}

export async function uploadDocument(assistantId: string, file: File): Promise<Document> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await client.post<Document>(
    `/assistants/${assistantId}/documents`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

export async function deleteDocument(assistantId: string, docId: string): Promise<void> {
  await client.delete(`/assistants/${assistantId}/documents/${docId}`);
}
