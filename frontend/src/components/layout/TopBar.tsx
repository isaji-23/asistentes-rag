import type { ReactNode } from 'react';

interface TopBarProps {
  children: ReactNode;
}

export default function TopBar({ children }: TopBarProps) {
  return (
    <div
      style={{
        height: 'var(--bar-height)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        padding: '0 var(--space-6)',
        borderBottom: '1px solid var(--color-border-light)',
        backgroundColor: 'var(--color-surface-bar)',
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}
