import { fetchEventSource } from '@microsoft/fetch-event-source';
import { baseURL } from './client';
import { unescapeNewlines } from '../utils/unescape';
import { parseCitationsEvent } from '../utils/sse';
import type { Citation } from '../types/api';

export interface StreamOptions {
  conversationId: string;
  content: string;
  onToken: (token: string) => void;
  onCitations: (citations: Citation[]) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

export function sendMessageStream({
  conversationId,
  content,
  onToken,
  onCitations,
  onDone,
  onError,
}: StreamOptions): AbortController {
  const ctrl = new AbortController();

  fetchEventSource(`${baseURL}/conversations/${conversationId}/messages/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
    signal: ctrl.signal,
    onmessage(ev) {
      if (ev.event === 'token') {
        onToken(unescapeNewlines(ev.data));
      } else if (ev.event === 'citations') {
        onCitations(parseCitationsEvent(ev.data));
      } else if (ev.event === 'done') {
        onDone();
        ctrl.abort();
      }
    },
    onerror(err) {
      onError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    },
  }).catch((err: unknown) => {
    if ((err as { name?: string }).name !== 'AbortError') {
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  });

  return ctrl;
}
