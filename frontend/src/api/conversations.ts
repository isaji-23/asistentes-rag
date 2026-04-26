import { client } from './client';
import type { Conversation, ConversationDetail } from '../types/api';

export async function listConversations(assistantId: string): Promise<Conversation[]> {
  const { data } = await client.get<Conversation[]>(`/assistants/${assistantId}/conversations`);
  return data;
}

export async function createConversation(assistantId: string, title?: string): Promise<Conversation> {
  const { data } = await client.post<Conversation>(`/assistants/${assistantId}/conversations`, { title });
  return data;
}

export async function getConversation(conversationId: string): Promise<ConversationDetail> {
  const { data } = await client.get<ConversationDetail>(`/conversations/${conversationId}`);
  return data;
}

export async function deleteConversation(conversationId: string): Promise<void> {
  await client.delete(`/conversations/${conversationId}`);
}
