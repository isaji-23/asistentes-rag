"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { AssistantsSidebar } from "@/components/AssistantsSidebar";
import { ChatPanel } from "@/components/ChatPanel";
import { DocumentsPanel } from "@/components/DocumentsPanel";
import * as api from "@/lib/api";
import type { Assistant, Document } from "@/lib/types";

interface AssistantViewProps {
  assistantId: string;
  initialAssistant: Assistant | null;
  allAssistants: Assistant[];
  initialDocuments: Document[];
}

export function AssistantView({
  assistantId,
  initialAssistant,
  allAssistants: initialAllAssistants,
  initialDocuments,
}: AssistantViewProps) {
  const [allAssistants, setAllAssistants] = useState<Assistant[]>(initialAllAssistants);
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);

  // Optimistic: use data from the sidebar list immediately while full data loads.
  // allAssistants already contains name + description for every assistant.
  const optimistic = initialAssistant ?? allAssistants.find((a) => a.id === assistantId) ?? null;
  const [assistant, setAssistant] = useState<Assistant | null>(optimistic);
  const [loaded, setLoaded] = useState(initialAssistant !== null);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Client-side fetch only when SSR didn't supply data.
  // Runs in the background — the UI is already rendered optimistically.
  useEffect(() => {
    if (initialAssistant !== null) return;

    async function fetchAll() {
      try {
        const [asst, docs, all] = await Promise.all([
          api.assistants.get(assistantId),
          api.documents.list(assistantId),
          api.assistants.list(),
        ]);
        setAssistant(asst);
        setDocuments(docs);
        setAllAssistants(all);
      } catch {
        // assistant stays as the optimistic value from allAssistants
      } finally {
        setLoaded(true);
      }
    }

    fetchAll();
  }, [assistantId, initialAssistant]);

  return (
    <div className="flex h-full overflow-hidden bg-pure-white">
      {/* Left sidebar */}
      <AssistantsSidebar
        assistants={allAssistants}
        activeAssistantId={assistantId}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 border-b border-border-light px-4 py-3 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-1.5 text-muted-slate hover:bg-snow hover:text-cohere-black"
          >
            <Menu size={20} />
          </button>
          {assistant ? (
            <span className="font-display text-base font-normal text-cohere-black">
              {assistant.name}
            </span>
          ) : (
            <span className="h-4 w-32 animate-pulse rounded bg-lightest-gray" />
          )}
        </div>

        {/* Desktop + mobile content */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Chat (center) */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {/* Desktop assistant name header */}
            <div className="hidden items-center border-b border-border-light px-6 py-3 md:flex">
              {assistant ? (
                <div>
                  <h1
                    className="font-display text-lg font-normal text-cohere-black"
                    style={{ letterSpacing: "-0.18px" }}
                  >
                    {assistant.name}
                  </h1>
                  {assistant.description && (
                    <p className="text-xs text-muted-slate">{assistant.description}</p>
                  )}
                </div>
              ) : (
                <span className="h-5 w-40 animate-pulse rounded bg-lightest-gray" />
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              {assistant ? (
                /* key prop resets ChatPanel state when switching assistants */
                <ChatPanel key={assistantId} assistant={assistant} />
              ) : loaded ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-muted-slate">Asistente no encontrado.</p>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-2 w-2 rounded-full bg-muted-slate"
                        style={{ animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Documents panel (right column on desktop) */}
          <div className="hidden w-72 shrink-0 overflow-hidden md:flex md:flex-col">
            <DocumentsPanel assistantId={assistantId} initialDocuments={documents} />
          </div>
        </div>

        {/* Documents panel on mobile — below chat */}
        <div
          className="shrink-0 border-t border-border-light md:hidden"
          style={{ maxHeight: "40vh", overflowY: "auto" }}
        >
          <DocumentsPanel assistantId={assistantId} initialDocuments={documents} />
        </div>
      </div>
    </div>
  );
}
