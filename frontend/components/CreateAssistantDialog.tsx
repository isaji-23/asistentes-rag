"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import * as api from "@/lib/api";
import type { Assistant } from "@/lib/types";

interface CreateAssistantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (assistant: Assistant) => void;
  trigger?: React.ReactNode;
}

export function CreateAssistantDialog({
  open,
  onOpenChange,
  onCreated,
  trigger,
}: CreateAssistantDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const assistant = await api.assistants.create({
        name: name.trim(),
        description: description.trim() || undefined,
        instructions: instructions.trim() || undefined,
      });
      onCreated(assistant);
      onOpenChange(false);
      setName("");
      setDescription("");
      setInstructions("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el asistente");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      title="Nuevo asistente"
      description="Crea un asistente personalizado con sus propios documentos."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="asst-name" className="text-sm text-cohere-black">
            Nombre <span className="text-red-500">*</span>
          </label>
          <Input
            id="asst-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Mi asistente"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="asst-desc" className="text-sm text-cohere-black">
            Descripción
          </label>
          <Input
            id="asst-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Breve descripción del asistente"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="asst-instr" className="text-sm text-cohere-black">
            Instrucciones
          </label>
          <Textarea
            id="asst-instr"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Eres un asistente especializado en..."
            rows={5}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="solid"
            pill
            disabled={loading || !name.trim()}
          >
            {loading ? "Creando..." : "Crear asistente"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
