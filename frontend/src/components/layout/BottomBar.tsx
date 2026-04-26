import type { ReactNode } from 'react';

interface BottomBarProps {
  children?: ReactNode;
}

export default function BottomBar({ children }: BottomBarProps) {
  return (
    <div
      style={{
        height: 'var(--bar-height)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        padding: '0 var(--space-6)',
        borderTop: '1px solid var(--color-border-light)',
        backgroundColor: 'var(--color-white)',
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}
