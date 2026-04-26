import type { ReactNode } from 'react';
import { useUIStore } from '../../store/uiStore';

interface AppShellProps {
  left: ReactNode;
  chatTopBar: ReactNode;
  chatContent: ReactNode;
  chatBottomBar: ReactNode;
  right: ReactNode;
}

export default function AppShell({
  left,
  chatTopBar,
  chatContent,
  chatBottomBar,
  right,
}: AppShellProps) {
  const { leftOpen, rightOpen } = useUIStore();

  const leftW = leftOpen ? 'var(--sidebar-left-w)' : '0px';
  const rightW = rightOpen ? 'var(--sidebar-right-w)' : '0px';

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Left sidebar — self-contained flex column */}
      <div style={{
        width: leftW, minWidth: 0, flexShrink: 0, overflow: 'hidden',
        borderRight: leftOpen ? '1px solid var(--color-border-light)' : undefined,
        transition: 'width 200ms ease',
      }}>
        {left}
      </div>

      {/* Center column */}
      <div style={{
        flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
        height: '100vh', overflow: 'hidden',
        borderRight: '1px solid var(--color-border-light)',
      }}>
        <div style={{ height: 'var(--bar-height)', flexShrink: 0, overflow: 'hidden', borderBottom: '1px solid var(--color-border-light)' }}>
          {chatTopBar}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {chatContent}
        </div>
        <div style={{ flexShrink: 0, borderTop: '1px solid var(--color-border-light)', padding: 'var(--space-5)', background: 'var(--color-surface-bar)' }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            {chatBottomBar}
          </div>
        </div>
      </div>

      {/* Right sidebar — self-contained flex column */}
      <div style={{
        width: rightW, minWidth: 0, flexShrink: 0, overflow: 'hidden',
        transition: 'width 200ms ease',
      }}>
        {right}
      </div>
    </div>
  );
}
