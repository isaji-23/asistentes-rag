"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import * as api from "@/lib/api";
import type { Assistant, Citation, Message } from "@/lib/types";

interface ChatPanelProps {
  assistant: Assistant;
}

export function ChatPanel({ assistant }: ChatPanelProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingCitations, setStreamingCitations] = useState<Citation[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch the most recent conversation for this assistant on mount.
  // The rest of the UI (header, documents) is already visible — this only
  // affects the messages area.
  useEffect(() => {
    let cancelled = false;
    async function loadConversation() {
      try {
        const convList = await api.conversations.list(assistant.id);
        if (cancelled) return;
        if (convList.length > 0) {
          const detail = await api.conversations.get(convList[0].id);
          if (cancelled) return;
          setConversationId(detail.id);
          setMessages(detail.messages ?? []);
        }
      } catch {
        // No conversations yet — empty state is fine
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    }
    loadConversation();
    return () => { cancelled = true; };
  }, [assistant.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  async function handleSend() {
    const content = input.trim();
    if (!content || isStreaming) return;

    setInput("");
    setError(null);
    setIsStreaming(true);
    setStreamingContent("");
    setStreamingCitations([]);

    // Optimistically add user message
    const tempUserMsg: Message = {
      id: crypto.randomUUID(),
      conversation_id: conversationId ?? "",
      role: "user",
      content,
      created_at: new Date().toISOString(),
      citations: [],
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      let convId = conversationId;
      if (!convId) {
        const conv = await api.conversations.create(assistant.id);
        convId = conv.id;
        setConversationId(convId);
        setMessages((prev) =>
          prev.map((m) => (m.id === tempUserMsg.id ? { ...m, conversation_id: convId! } : m))
        );
      }

      const res = await api.messages.stream(convId, content);
      if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);
      if (!res.body) throw new Error("Sin cuerpo de respuesta");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";
      let finalContent = "";
      let finalCitations: Citation[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (currentEvent === "token") {
              finalContent += data.replace(/\\n/g, "\n");
              setStreamingContent(finalContent);
            } else if (currentEvent === "citations") {
              try {
                finalCitations = JSON.parse(data) as Citation[];
                setStreamingCitations(finalCitations);
              } catch {
                // ignore parse errors
              }
            }
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          conversation_id: convId!,
          role: "assistant",
          content: finalContent,
          created_at: new Date().toISOString(),
          citations: finalCitations,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar el mensaje");
      // Remove the optimistic user message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
      setStreamingCitations([]);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {loadingHistory ? (
          <div className="flex h-full items-center justify-center">
            <TypingIndicator />
          </div>
        ) : messages.length === 0 && !isStreaming ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div
              className="font-display text-2xl font-normal text-cohere-black"
              style={{ letterSpacing: "-0.24px" }}
            >
              {assistant.name}
            </div>
            <p className="max-w-sm text-sm text-muted-slate">
              {assistant.description ?? "Haz una pregunta para comenzar la conversación."}
            </p>
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-6">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isStreaming && (
              <div className="flex flex-col items-start gap-2">
                <div
                  className="max-w-[85%] rounded-[22px] bg-snow px-5 py-4 text-sm text-cohere-black"
                  style={{ borderRadius: "22px" }}
                >
                  {streamingContent ? (
                    <p className="whitespace-pre-wrap">{streamingContent}</p>
                  ) : (
                    <TypingIndicator />
                  )}
                </div>
                {streamingCitations.length > 0 && (
                  <CitationsList citations={streamingCitations} />
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {error && (
        <div className="mx-6 mb-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>
            Cerrar
          </button>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border-light px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-end gap-3">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje… (Enter para enviar, Shift+Enter para nueva línea)"
            rows={2}
            disabled={isStreaming || loadingHistory}
            className="flex-1"
          />
          <Button
            variant="solid"
            pill
            size="md"
            onClick={handleSend}
            disabled={isStreaming || loadingHistory || !input.trim()}
            className="shrink-0 self-end"
          >
            <Send size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={[
          "max-w-[85%] px-5 py-4 text-sm",
          isUser
            ? "rounded-[22px] bg-cohere-black text-pure-white"
            : "rounded-[22px] bg-snow text-cohere-black",
        ].join(" ")}
        style={{ borderRadius: "22px" }}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
      {message.citations && message.citations.length > 0 && (
        <CitationsList citations={message.citations} />
      )}
    </div>
  );
}

function CitationsList({ citations }: { citations: Citation[] }) {
  return (
    <div className="flex max-w-[85%] flex-col gap-2">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-slate">Fuentes</p>
      {citations.map((citation, i) => (
        <div key={i} className="rounded-lg border border-border-light bg-pure-white px-3 py-2">
          <p className="text-xs font-medium text-cohere-black">{citation.document_name}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-slate">{citation.content_snippet}</p>
        </div>
      ))}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-muted-slate"
          style={{ animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </div>
  );
}
