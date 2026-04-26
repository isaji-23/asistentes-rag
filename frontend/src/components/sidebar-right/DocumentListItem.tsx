import { useState } from 'react';
import type { Document } from '../../types/api';
import DocumentStatusBadge from './DocumentStatusBadge';
import ConfirmDialog from '../common/ConfirmDialog';

interface DocumentListItemProps {
  doc: Document;
  onDelete: () => void;
  isDeleting: boolean;
}

export default function DocumentListItem({ doc, onDelete, isDeleting }: DocumentListItemProps) {
  const [hovered, setHovered] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)',
          padding: 'var(--space-4) var(--space-5)',
          borderRadius: 'var(--radius-sm)',
          background: hovered ? 'var(--color-lightest-gray)' : 'transparent',
          transition: 'background var(--transition-base)',
          opacity: isDeleting ? 0.5 : 1,
        }}
      >
        {/* File icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted-slate)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 'var(--text-sm)', color: 'var(--color-near-black)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            marginBottom: 'var(--space-1)',
          }}>
            {doc.filename}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <DocumentStatusBadge status={doc.status} />
            {doc.chunk_count != null && doc.status === 'indexed' && (
              <span style={{ fontSize: 11, color: 'var(--color-muted-slate)' }}>
                {doc.chunk_count} fragmentos
              </span>
            )}
          </div>
        </div>

        {/* Delete button */}
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={isDeleting}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-danger)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-muted-slate)'; }}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--color-muted-slate)', padding: 4, flexShrink: 0,
            opacity: hovered ? 1 : 0,
            transition: 'opacity var(--transition-base), color var(--transition-base)',
            display: 'flex', alignItems: 'center',
          }}
          aria-label={`Eliminar ${doc.filename}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar documento"
        message={`¿Eliminar "${doc.filename}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        onConfirm={() => { setConfirmOpen(false); onDelete(); }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
