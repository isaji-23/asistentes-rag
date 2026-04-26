import type { Citation } from '../types/api';

export function parseTokenEvent(data: string): string {
  return data;
}

export function parseCitationsEvent(data: string): Citation[] {
  try {
    return JSON.parse(data) as Citation[];
  } catch {
    return [];
  }
}
