interface NewAssistantButtonProps {
  onClick: () => void;
}

export default function NewAssistantButton({ onClick }: NewAssistantButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-3)',
        padding: '10px var(--space-6)',
        border: '1px solid var(--color-border-cool)',
        borderRadius: 'var(--radius-sharp)',
        background: 'transparent',
        fontSize: 'var(--text-sm)',
        color: 'var(--color-near-black)',
        cursor: 'pointer',
        transition: 'color var(--transition-base), border-color var(--transition-base)',
        fontFamily: 'var(--font-body)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--color-interaction-blue)';
        e.currentTarget.style.borderColor = 'var(--color-interaction-blue)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--color-near-black)';
        e.currentTarget.style.borderColor = 'var(--color-border-cool)';
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 16 }}>+</span>
      Nuevo asistente
    </button>
  );
}
