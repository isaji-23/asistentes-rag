import { useState } from 'react';
import type { Assistant, Conversation } from '../../types/api';
import IconButton from '../common/IconButton';
import ConfirmDialog from '../common/ConfirmDialog';

interface AssistantListItemProps {
  assistant: Assistant;
  active: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onHover?: () => void;
  conversations?: Conversation[];
  activeConversationId?: string | null;
  onSelectConversation?: (id: string) => void;
  onNewConversation?: () => void;
  onDeleteConversation?: (id: string) => void;
}

export default function AssistantListItem({
  assistant, active, onSelect, onEdit, onDelete, onHover,
  conversations, activeConversationId, onSelectConversation, onNewConversation, onDeleteConversation,
}: AssistantListItemProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <div>
        <div
          role="button"
          tabIndex={0}
          onClick={onSelect}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(); }}
          onMouseEnter={() => { setHovered(true); onHover?.(); }}
          onMouseLeave={() => setHovered(false)}
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
            padding: 'var(--space-4) var(--space-5)',
            border: active ? '1px solid var(--color-interaction-blue)' : '1px solid transparent',
            borderRadius: 'var(--radius-sharp)',
            cursor: 'pointer',
            background: active ? 'var(--color-lightest-gray)' : hovered ? 'var(--color-snow)' : 'transparent',
            color: active ? 'var(--color-interaction-blue)' : 'var(--color-near-black)',
            transition: 'background var(--transition-base)',
            userSelect: 'none',
          }}
        >
          {/* CPU/chip icon — represents AI agent */}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ flexShrink: 0, color: active ? 'var(--color-interaction-blue)' : 'var(--color-muted-slate)' }}>
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <rect x="9" y="9" width="6" height="6" />
            <line x1="9" y1="1" x2="9" y2="4" />
            <line x1="15" y1="1" x2="15" y2="4" />
            <line x1="9" y1="20" x2="9" y2="23" />
            <line x1="15" y1="20" x2="15" y2="23" />
            <line x1="20" y1="9" x2="23" y2="9" />
            <line x1="20" y1="14" x2="23" y2="14" />
            <line x1="1" y1="9" x2="4" y2="9" />
            <line x1="1" y1="14" x2="4" y2="14" />
          </svg>

          <span style={{
            flex: 1, fontSize: 'var(--text-sm)', fontWeight: active ? 500 : 400,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {assistant.name}
          </span>

          <span style={{ opacity: hovered || active ? 1 : 0, transition: 'opacity var(--transition-base)', flexShrink: 0, display: 'flex', gap: 'var(--space-1)' }}>
            <IconButton
              label={`Editar ${assistant.name}`}
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              style={{ color: 'var(--color-muted-slate)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </IconButton>
            <IconButton
              label={`Borrar ${assistant.name}`}
              onClick={(e) => { e.stopPropagation(); setConfirmOpen(true); }}
              style={{ color: 'var(--color-muted-slate)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
            </IconButton>
          </span>
        </div>

        {/* Conversations dropdown — visible when this assistant is active */}
        {active && conversations && (
          <div style={{
            paddingLeft: 'var(--space-6)',
            paddingTop: 'var(--space-1)',
            paddingBottom: 'var(--space-2)',
            display: 'flex', flexDirection: 'column', gap: 'var(--space-1)',
          }}>
            {conversations.map((c) => (
              <ConversationRow
                key={c.id}
                label={c.title ?? new Date(c.updated_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })}
                isActive={c.id === activeConversationId}
                onClick={() => onSelectConversation?.(c.id)}
                onDelete={onDeleteConversation ? () => onDeleteConversation(c.id) : undefined}
              />
            ))}
            <NewConversationRow onClick={() => onNewConversation?.()} />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Borrar asistente"
        message={`¿Seguro que quieres borrar "${assistant.name}"? Se borrarán todos sus documentos y conversaciones.`}
        confirmLabel="Borrar"
        danger
        onConfirm={() => { setConfirmOpen(false); onDelete(); }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

function ConversationRow({ label, isActive, onClick, onDelete }: { label: string; isActive: boolean; onClick: () => void; onDelete?: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center',
        borderRadius: 'var(--radius-sharp)',
        background: isActive ? 'var(--color-lightest-gray)' : hovered ? 'var(--color-snow)' : 'transparent',
        transition: 'background var(--transition-base)',
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
        style={{
          flex: 1,
          padding: 'var(--space-2) var(--space-5)',
          fontSize: 'var(--text-xs)',
          cursor: 'pointer',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          color: isActive ? 'var(--color-interaction-blue)' : 'var(--color-muted-slate)',
          fontWeight: isActive ? 500 : 400,
          userSelect: 'none',
        }}
      >
        {label}
      </div>
      {onDelete && (
        <span style={{ opacity: hovered || isActive ? 1 : 0, transition: 'opacity var(--transition-base)', flexShrink: 0 }}>
          <IconButton
            label="Borrar conversación"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            style={{ color: 'var(--color-muted-slate)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </IconButton>
        </span>
      )}
    </div>
  );
}

function NewConversationRow({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: 'var(--space-2) var(--space-5)',
        borderRadius: 'var(--radius-sharp)',
        fontSize: 'var(--text-xs)',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
        color: 'var(--color-muted-slate)',
        background: hovered ? 'var(--color-snow)' : 'transparent',
        transition: 'background var(--transition-base)',
        userSelect: 'none',
      }}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      Nueva conversación
    </div>
  );
}
