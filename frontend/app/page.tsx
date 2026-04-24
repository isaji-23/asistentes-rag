import { AssistantsList } from "@/components/AssistantsList";
import * as api from "@/lib/api";
import type { Assistant } from "@/lib/types";

export default async function HomePage() {
  let assistants: Assistant[] = [];
  try {
    assistants = await api.assistants.list();
  } catch {
    // Backend may not be running; render empty state
  }

  return <AssistantsList initialAssistants={assistants} />;
}
