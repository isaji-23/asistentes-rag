import { client } from './client';
import type { Assistant } from '../types/api';

export interface CreateAssistantBody {
  name: string;
  description?: string;
  instructions?: string;
}

export interface UpdateAssistantBody {
  name?: string;
  description?: string;
  instructions?: string;
}

export async function listAssistants(): Promise<Assistant[]> {
  const { data } = await client.get<Assistant[]>('/assistants');
  return data;
}

export async function getAssistant(id: string): Promise<Assistant> {
  const { data } = await client.get<Assistant>(`/assistants/${id}`);
  return data;
}

export async function createAssistant(body: CreateAssistantBody): Promise<Assistant> {
  const { data } = await client.post<Assistant>('/assistants', body);
  return data;
}

export async function updateAssistant(id: string, body: UpdateAssistantBody): Promise<Assistant> {
  const { data } = await client.patch<Assistant>(`/assistants/${id}`, body);
  return data;
}

export async function deleteAssistant(id: string): Promise<void> {
  await client.delete(`/assistants/${id}`);
}
