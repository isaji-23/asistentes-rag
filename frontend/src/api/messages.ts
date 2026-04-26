import { client } from './client';
import type { ChatResponse } from '../types/api';

export async function sendMessage(conversationId: string, content: string): Promise<ChatResponse> {
  const { data } = await client.post<ChatResponse>(`/conversations/${conversationId}/messages`, { content });
  return data;
}
