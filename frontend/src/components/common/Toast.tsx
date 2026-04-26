import { useToastStore } from '../../store/toastStore';

export default function ToastContainer() {
  const { toasts, remove } = useToastStore();

  if (!toasts.length) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'var(--space-8)',
        right: 'var(--space-8)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        zIndex: 'var(--z-toast)',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => remove(t.id)}
          style={{
            display: 'flex',
            alignItems: 'stretch',
            width: 288,
            background: 'var(--color-white)',
            border: '1px solid var(--color-border-cool)',
            borderRadius: 'var(--radius-sharp)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            overflow: 'hidden',
            animation: t.exiting
              ? 'toast-out 200ms ease forwards'
              : 'toast-in 180ms ease both',
            cursor: 'pointer',
            pointerEvents: 'auto',
          }}
        >
          <span
            style={{
              width: 3,
              flexShrink: 0,
              background: t.type === 'error' ? 'var(--color-danger)' : 'var(--color-interaction-blue)',
            }}
          />
          <span
            style={{
              flex: 1,
              padding: 'var(--space-4) var(--space-5)',
              fontSize: 'var(--text-sm)',
              fontFamily: 'var(--font-body)',
              color: 'var(--color-near-black)',
              lineHeight: 'var(--leading-normal)',
            }}
          >
            {t.message}
          </span>
        </div>
      ))}
    </div>
  );
}
