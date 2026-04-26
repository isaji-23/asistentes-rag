import type { Assistant } from '../../types/api';
import TopBar from '../layout/TopBar';
import IconButton from '../common/IconButton';
import { useUIStore } from '../../store/uiStore';

interface ChatHeaderProps {
  assistant: Assistant | null;
}

export default function ChatHeader({ assistant }: ChatHeaderProps) {
  const { toggleLeft, toggleRight, leftOpen, rightOpen } = useUIStore();

  return (
    <TopBar>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)', width: '100%' }}>
        <IconButton
          label={leftOpen ? 'Colapsar sidebar izquierda' : 'Expandir sidebar izquierda'}
          onClick={toggleLeft}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {leftOpen
              ? <path d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
              : <path d="M13 5l7 7-7 7M6 5l7 7-7 7" />}
          </svg>
        </IconButton>

        <div style={{ flex: 1, minWidth: 0 }}>
          {assistant ? (
            <>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 400, color: 'var(--color-black)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {assistant.name}
              </div>
              {assistant.description && (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted-slate)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {assistant.description}
                </div>
              )}
            </>
          ) : (
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted-slate)' }}>
              Selecciona un asistente
            </span>
          )}
        </div>

        <IconButton
          label={rightOpen ? 'Colapsar sidebar derecha' : 'Expandir sidebar derecha'}
          onClick={toggleRight}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {rightOpen
              ? <path d="M13 5l7 7-7 7M6 5l7 7-7 7" />
              : <path d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />}
          </svg>
        </IconButton>
      </div>
    </TopBar>
  );
}
