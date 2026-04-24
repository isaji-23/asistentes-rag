"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateAssistantDialog } from "@/components/CreateAssistantDialog";
import * as api from "@/lib/api";
import type { Assistant } from "@/lib/types";

interface AssistantsListProps {
  initialAssistants: Assistant[];
}

export function AssistantsList({ initialAssistants }: AssistantsListProps) {
  const [assistants, setAssistants] = useState(initialAssistants);
  const [loaded, setLoaded] = useState(initialAssistants.length > 0);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Client-side fetch — covers the case where SSR fetch failed silently
  useEffect(() => {
    api.assistants
      .list()
      .then((data) => { setAssistants(data); setLoaded(true); })
      .catch(() => { setLoaded(true); });
  }, []);

  function handleCreated(assistant: Assistant) {
    setAssistants((prev) => [assistant, ...prev]);
  }

  return (
    <div className="min-h-full bg-pure-white">
      {/* Header */}
      <header className="border-b border-border-light px-8 py-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1
              className="font-display text-3xl font-normal tracking-tight text-cohere-black"
              style={{ letterSpacing: "-0.32px" }}
            >
              Asistentes RAG
            </h1>
            <p className="mt-1 text-sm text-muted-slate">
              Gestiona tus asistentes de inteligencia artificial
            </p>
          </div>
          <Button
            variant="solid"
            pill
            onClick={() => setDialogOpen(true)}
          >
            <Plus size={16} />
            Nuevo asistente
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-8 py-10">
        {!loaded ? (
          <div className="flex justify-center py-24">
            <LoadingDots />
          </div>
        ) : assistants.length === 0 ? (
          <EmptyState onCreateClick={() => setDialogOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {assistants.map((assistant) => (
              <AssistantCard key={assistant.id} assistant={assistant} />
            ))}
          </div>
        )}
      </main>

      <CreateAssistantDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={handleCreated}
      />
    </div>
  );
}

function AssistantCard({ assistant }: { assistant: Assistant }) {
  return (
    <div
      className="flex flex-col gap-4 rounded-[22px] border border-lightest-gray bg-pure-white p-6 transition-colors hover:border-border-cool"
      style={{ borderRadius: "22px" }}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-snow">
          <Bot size={20} className="text-muted-slate" />
        </div>
        <div className="min-w-0 flex-1">
          <h2
            className="truncate font-display text-lg font-normal text-cohere-black"
            style={{ letterSpacing: "-0.18px" }}
          >
            {assistant.name}
          </h2>
          {assistant.description && (
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-slate">
              {assistant.description}
            </p>
          )}
        </div>
      </div>
      <div className="mt-auto pt-2">
        <Link href={`/assistants/${assistant.id}`}>
          <Button variant="outlined" size="sm" pill className="w-full justify-center">
            Abrir
          </Button>
        </Link>
      </div>
    </div>
  );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-lightest-gray bg-snow">
        <Bot size={32} className="text-muted-slate" />
      </div>
      <div>
        <h2 className="font-display text-2xl font-normal text-cohere-black">
          Sin asistentes todavía
        </h2>
        <p className="mt-2 text-sm text-muted-slate">
          Crea tu primer asistente para empezar a usar RAG.
        </p>
      </div>
      <Button variant="solid" pill onClick={onCreateClick}>
        <Plus size={16} />
        Crear mi primer asistente
      </Button>
    </div>
  );
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1.5">
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
