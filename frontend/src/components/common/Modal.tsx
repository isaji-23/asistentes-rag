import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-modal)' as unknown as number,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.25)',
        animation: 'modal-overlay-in 150ms ease',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-white)',
          borderRadius: 'var(--radius-signature)',
          border: '1px solid var(--color-border-cool)',
          padding: 'var(--space-10)',
          minWidth: 380,
          maxWidth: '92vw',
          animation: 'modal-dialog-in 200ms ease',
        }}
      >
        <h2
          id="modal-title"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-lg)',
            fontWeight: 400,
            marginBottom: 'var(--space-8)',
            color: 'var(--color-black)',
          }}
        >
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
