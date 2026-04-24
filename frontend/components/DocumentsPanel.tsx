"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Trash2, Upload, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import * as api from "@/lib/api";
import type { Document } from "@/lib/types";

const ACCEPTED_TYPES = ".pdf,.docx,.pptx,.txt,.md";
const MAX_SIZE_MB = 25;

interface DocumentsPanelProps {
  assistantId: string;
  initialDocuments: Document[];
}

export function DocumentsPanel({
  assistantId,
  initialDocuments,
}: DocumentsPanelProps) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll while any doc is pending
  useEffect(() => {
    const hasPending = documents.some((d) => d.status === "pending");
    if (hasPending && !pollRef.current) {
      pollRef.current = setInterval(async () => {
        try {
          const updated = await api.documents.list(assistantId);
          setDocuments(updated);
          const stillPending = updated.some((d) => d.status === "pending");
          if (!stillPending && pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        } catch {
          // Silently ignore poll errors
        }
      }, 3000);
    } else if (!hasPending && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [assistantId, documents]);

  async function uploadFile(file: File) {
    setError(null);
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`El archivo supera el límite de ${MAX_SIZE_MB} MB.`);
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx", "pptx", "txt", "md"].includes(ext ?? "")) {
      setError("Formato no soportado. Usa PDF, DOCX, PPTX, TXT o MD.");
      return;
    }
    setUploading(true);
    try {
      const doc = await api.documents.upload(assistantId, file);
      setDocuments((prev) => [doc, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir el archivo");
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assistantId]
  );

  async function handleDelete(docId: string) {
    try {
      await api.documents.delete(assistantId, docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar el documento");
    }
  }

  return (
    <div className="flex h-full flex-col border-l border-border-light bg-pure-white">
      {/* Header */}
      <div className="border-b border-border-light px-5 py-4">
        <h2 className="font-display text-base font-normal text-cohere-black">
          Documentos
        </h2>
        <p className="mt-0.5 text-xs text-muted-slate">
          {documents.length} {documents.length === 1 ? "documento" : "documentos"}
        </p>
      </div>

      {/* Drop zone */}
      <div className="px-5 py-4">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={[
            "flex cursor-pointer flex-col items-center gap-2 rounded-[22px] border-2 border-dashed px-4 py-6 text-center transition-colors",
            dragOver
              ? "border-interaction-blue bg-blue-50"
              : "border-border-cool hover:border-interaction-blue hover:bg-snow",
          ].join(" ")}
          style={{ borderRadius: "22px" }}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload
            size={20}
            className={dragOver ? "text-interaction-blue" : "text-muted-slate"}
          />
          <div>
            <p className="text-sm text-cohere-black">
              {uploading ? "Subiendo..." : "Arrastra un archivo o haz clic"}
            </p>
            <p className="mt-0.5 text-xs text-muted-slate">
              PDF, DOCX, PPTX, TXT, MD · máx. {MAX_SIZE_MB} MB
            </p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mx-5 mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
          <button
            className="ml-2 underline"
            onClick={() => setError(null)}
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Document list */}
      <div className="flex-1 overflow-y-auto">
        {documents.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
            <FileText size={24} className="text-muted-slate" />
            <p className="text-sm text-muted-slate">Sin documentos</p>
          </div>
        ) : (
          <ul className="divide-y divide-border-light px-5">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-start gap-3 py-3">
                <FileText size={15} className="mt-0.5 shrink-0 text-muted-slate" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-cohere-black" title={doc.filename}>
                    {doc.filename}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge status={doc.status} />
                    {doc.chunk_count != null && doc.status === "indexed" && (
                      <span className="text-xs text-muted-slate">
                        {doc.chunk_count} fragmentos
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="shrink-0 rounded p-1 text-muted-slate transition-colors hover:text-red-600"
                  title="Eliminar documento"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
