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
  status: "pending" | "indexed" | "failed";
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
  document_id: string;
  document_name: string;
  chunk_index: number;
  content_snippet: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  citations: Citation[];
}
