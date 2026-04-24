import { AssistantView } from "@/components/AssistantView";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import type { Assistant, Document } from "@/lib/types";

interface PageProps {
  params: Promise<{ assistantId: string }>;
}

export default async function AssistantPage({ params }: PageProps) {
  const { assistantId } = await params;

  let assistant: Assistant | null = null;
  let documents: Document[] = [];
  let allAssistants: Assistant[] = [];

  try {
    [assistant, documents, allAssistants] = await Promise.all([
      api.assistants.get(assistantId),
      api.documents.list(assistantId),
      api.assistants.list(),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      const { notFound } = await import("next/navigation");
      notFound();
    }
    // Fall through — AssistantView will fetch client-side
  }

  return (
    <AssistantView
      assistantId={assistantId}
      initialAssistant={assistant}
      allAssistants={allAssistants}
      initialDocuments={documents}
    />
  );
}
