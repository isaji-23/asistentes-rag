import type { Citation } from '../../types/api';

interface CitationsListProps {
  citations: Citation[];
}

export default function CitationsList({ citations }: CitationsListProps) {
  if (!citations.length) return null;

  return (
    <div style={{ marginTop: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <span style={{
        fontSize: 10,
        color: 'var(--color-muted-slate)',
        fontFamily: 'var(--font-mono)',
        fontWeight: 400,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        Fuentes
      </span>
      {citations.map((c) => (
        <div
          key={c.id}
          style={{
            padding: 'var(--space-4) var(--space-5)',
            background: 'var(--color-snow)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border-light)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)', marginBottom: 'var(--space-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minWidth: 0 }}>
              {c.citation_number != null && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 18,
                  height: 18,
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  color: 'var(--color-white)',
                  background: 'var(--color-near-black)',
                  borderRadius: 'var(--radius-sm)',
                  flexShrink: 0,
                  lineHeight: 1,
                }}>
                  {c.citation_number}
                </span>
              )}
              <span style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 500,
                color: 'var(--color-near-black)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
              }}>
                {c.document_name}
              </span>
            </div>
            <span style={{
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--color-muted-slate)',
              flexShrink: 0,
            }}>
              FRAG. {c.chunk_index}
            </span>
          </div>
          <div style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-muted-slate)',
            lineHeight: 'var(--leading-normal)',
          }}>
            {c.content_snippet}
          </div>
        </div>
      ))}
    </div>
  );
}
