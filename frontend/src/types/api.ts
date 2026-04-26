export interface Assistant {
  id: string;
  name: string;
  description?: string;
  instructions?: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  assistant_id: string;
  filename: string;
  storage_path: string;
  status: 'pending' | 'indexed' | 'failed';
  chunk_count?: number;
  uploaded_at: string;
}

export interface Conversation {
  id: string;
  assistant_id: string;
  title?: string;
  created_at: string;
  updated_at: string;
}

export interface Citation {
  id: string;
  document_id: string;
  document_name: string;
  chunk_index: number;
  content_snippet: string;
  citation_number?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  citations: Citation[];
}

export interface ConversationDetail extends Conversation {
  messages: Message[];
}

export interface ChatResponse {
  user_message: Message;
  assistant_message: Message;
}
