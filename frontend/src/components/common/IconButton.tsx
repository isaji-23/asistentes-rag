import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

export default function IconButton({ label, children, style, ...rest }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: 'var(--radius-sharp)',
        border: 'none',
        background: 'transparent',
        color: 'var(--color-muted-slate)',
        cursor: 'pointer',
        transition: 'color var(--transition-base), background var(--transition-base)',
        flexShrink: 0,
        ...style,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-interaction-blue)';
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-lightest-gray)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-muted-slate)';
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
