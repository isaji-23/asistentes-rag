export function unescapeNewlines(s: string): string {
  return s.replace(/\\n/g, '\n');
}
