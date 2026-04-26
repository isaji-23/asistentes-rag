import type { Document } from '../../types/api';

const config = {
  pending: { label: 'Procesando', bg: '#fff7ed', color: '#c2410c', dot: '#f97316' },
  indexed: { label: 'Indexado',   bg: '#f0fdf4', color: '#15803d', dot: '#22c55e' },
  failed:  { label: 'Error',      bg: '#fef2f2', color: '#b91c1c', dot: '#ef4444' },
};

export default function DocumentStatusBadge({ status }: { status: Document['status'] }) {
  const { label, bg, color, dot } = config[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 'var(--radius-pill)',
      background: bg, color, fontSize: 11, fontWeight: 500,
      fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0,
        animation: status === 'pending' ? 'pulse 1.5s ease-in-out infinite' : undefined,
      }} />
      {label}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
    </span>
  );
}
