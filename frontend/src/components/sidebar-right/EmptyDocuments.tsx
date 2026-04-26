import { useState } from 'react';
import { useUIStore } from '../../store/uiStore';

interface EmptyDocumentsProps {
  onUploadClick: () => void;
}

export default function EmptyDocuments({ onUploadClick }: EmptyDocumentsProps) {
  const [hovered, setHovered] = useState(false);
  const darkMode = useUIStore((s) => s.darkMode);

  // --color-black flips: #000 light / #fff dark. Hover needs to be in-between.
  const btnBg = hovered
    ? darkMode ? '#e0e0e0' : '#2a2a2a'
    : 'var(--color-black)';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: 'var(--space-10)', textAlign: 'center',
      color: 'var(--color-muted-slate)', fontSize: 'var(--text-sm)',
    }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 'var(--space-5)', opacity: 0.4 }}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" />
        <line x1="9" y1="15" x2="15" y2="15" />
      </svg>
      <p style={{ marginBottom: 'var(--space-2)' }}>Sin documentos.</p>
      <p style={{ marginBottom: 'var(--space-6)' }}>Sube archivos para que el asistente pueda responder.</p>
      <button
        onClick={onUploadClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          padding: '7px var(--space-6)',
          borderRadius: 'var(--radius-sm)',
          border: 'none',
          background: btnBg,
          fontSize: 'var(--text-sm)',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          color: 'var(--color-white)',
          transition: 'background var(--transition-base)',
        }}
      >
        Subir documento
      </button>
    </div>
  );
}
