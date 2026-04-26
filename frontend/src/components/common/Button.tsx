import { type ButtonHTMLAttributes, type ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ghost' | 'solid' | 'danger';
  children: ReactNode;
}

const base: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '7px 16px',
  borderRadius: 'var(--radius-sharp)',
  fontSize: 'var(--text-sm)',
  fontFamily: 'var(--font-body)',
  fontWeight: 400,
  cursor: 'pointer',
  border: 'none',
  transition: 'background var(--transition-base), color var(--transition-base), border-color var(--transition-base), opacity var(--transition-base)',
  whiteSpace: 'nowrap',
};

const variants = {
  ghost: {
    default: { background: 'transparent', color: 'var(--color-near-black)', border: '1px solid var(--color-border-cool)' },
    hover:   { background: 'var(--color-snow)',  color: 'var(--color-interaction-blue)', border: '1px solid var(--color-interaction-blue)' },
  },
  solid: {
    default: { background: 'var(--color-black)', color: 'var(--color-white)', border: '1px solid transparent' },
    hover:   { background: 'var(--color-btn-solid-hover)', color: 'var(--color-white)', border: '1px solid transparent' },
  },
  danger: {
    default: { background: 'var(--color-danger)',       color: 'var(--color-white)', border: '1px solid transparent' },
    hover:   { background: 'var(--color-danger-hover)', color: 'var(--color-white)', border: '1px solid transparent' },
  },
};

export default function Button({ variant = 'ghost', children, style, disabled, ...rest }: ButtonProps) {
  const v = variants[variant];

  return (
    <button
      disabled={disabled}
      style={{ ...base, ...v.default, opacity: disabled ? 0.45 : 1, ...style }}
      onMouseEnter={(e) => {
        if (disabled) return;
        Object.assign((e.currentTarget as HTMLButtonElement).style, v.hover);
      }}
      onMouseLeave={(e) => {
        Object.assign((e.currentTarget as HTMLButtonElement).style, v.default, { opacity: disabled ? '0.45' : '1' });
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
