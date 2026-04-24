"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Bot, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateAssistantDialog } from "@/components/CreateAssistantDialog";
import type { Assistant } from "@/lib/types";

interface AssistantsSidebarProps {
  assistants: Assistant[];
  activeAssistantId: string;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AssistantsSidebar({
  assistants: initialAssistants,
  activeAssistantId,
  mobileOpen,
  onMobileClose,
}: AssistantsSidebarProps) {
  const [assistants, setAssistants] = useState(initialAssistants);
  const [dialogOpen, setDialogOpen] = useState(false);

  function handleCreated(assistant: Assistant) {
    setAssistants((prev) => [assistant, ...prev]);
    setDialogOpen(false);
  }

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border-light bg-pure-white transition-transform duration-200 md:static md:z-auto md:translate-x-0 md:transition-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between border-b border-border-light px-4 py-4">
          <Link href="/" className="font-display text-base font-normal text-cohere-black hover:text-interaction-blue transition-colors">
            Asistentes RAG
          </Link>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDialogOpen(true)}
              className="rounded-lg p-1.5 text-muted-slate transition-colors hover:bg-snow hover:text-cohere-black"
              title="Nuevo asistente"
            >
              <Plus size={16} />
            </button>
            <button
              className="rounded-lg p-1.5 text-muted-slate transition-colors hover:bg-snow hover:text-cohere-black md:hidden"
              onClick={onMobileClose}
              title="Cerrar"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Assistants list */}
        <nav className="flex-1 overflow-y-auto py-2">
          {assistants.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-slate">Sin asistentes</p>
          ) : (
            assistants.map((assistant) => {
              const isActive = assistant.id === activeAssistantId;
              return (
                <Link
                  key={assistant.id}
                  href={`/assistants/${assistant.id}`}
                  onClick={onMobileClose}
                  className={[
                    "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                    isActive
                      ? "border-l-2 border-interaction-blue bg-snow text-cohere-black"
                      : "border-l-2 border-transparent text-near-black hover:bg-snow hover:text-cohere-black",
                  ].join(" ")}
                >
                  <Bot size={15} className={isActive ? "text-interaction-blue" : "text-muted-slate"} />
                  <span className="truncate">{assistant.name}</span>
                </Link>
              );
            })
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-border-light p-3">
          <Button
            variant="outlined"
            size="sm"
            pill
            className="w-full justify-center"
            onClick={() => setDialogOpen(true)}
          >
            <Plus size={14} />
            Nuevo asistente
          </Button>
        </div>
      </aside>

      <CreateAssistantDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={handleCreated}
      />
    </>
  );
}
