import type { Assistant, Conversation, Document, Message } from "./types";

const API = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, `${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const assistants = {
  list(): Promise<Assistant[]> {
    return request("/assistants");
  },
  get(id: string): Promise<Assistant> {
    return request(`/assistants/${id}`);
  },
  create(body: { name: string; description?: string; instructions?: string }): Promise<Assistant> {
    return request("/assistants", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  update(id: string, body: { name?: string; description?: string; instructions?: string }): Promise<Assistant> {
    return request(`/assistants/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
  delete(id: string): Promise<void> {
    return request(`/assistants/${id}`, { method: "DELETE" });
  },
};

export const documents = {
  list(assistantId: string): Promise<Document[]> {
    return request(`/assistants/${assistantId}/documents`);
  },
  upload(assistantId: string, file: File): Promise<Document> {
    const form = new FormData();
    form.append("file", file);
    return request(`/assistants/${assistantId}/documents`, {
      method: "POST",
      headers: {},
      body: form,
    });
  },
  delete(assistantId: string, documentId: string): Promise<void> {
    return request(`/assistants/${assistantId}/documents/${documentId}`, { method: "DELETE" });
  },
};

export const conversations = {
  list(assistantId: string): Promise<Conversation[]> {
    return request(`/assistants/${assistantId}/conversations`);
  },
  create(assistantId: string, title?: string): Promise<Conversation> {
    return request(`/assistants/${assistantId}/conversations`, {
      method: "POST",
      body: JSON.stringify({ title: title ?? null }),
    });
  },
  get(conversationId: string): Promise<Conversation & { messages: Message[] }> {
    return request(`/conversations/${conversationId}`);
  },
  delete(conversationId: string): Promise<void> {
    return request(`/conversations/${conversationId}`, { method: "DELETE" });
  },
};

export const messages = {
  stream(conversationId: string, content: string): Promise<Response> {
    return fetch(`${API}/conversations/${conversationId}/messages/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
  },
};
