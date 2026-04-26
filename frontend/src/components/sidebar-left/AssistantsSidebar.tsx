import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import TopBar from '../layout/TopBar';
import Spinner from '../common/Spinner';
import IconButton from '../common/IconButton';
import AssistantListItem from './AssistantListItem';
import NewAssistantModal from './NewAssistantModal';
import EditAssistantModal from './EditAssistantModal';
import { useAssistants, useGetAssistant, useCreateAssistant, useUpdateAssistant, useDeleteAssistant } from '../../hooks/useAssistants';
import { getAssistant } from '../../api/assistants';
import { useUIStore } from '../../store/uiStore';
import type { Assistant, Conversation } from '../../types/api';

interface AssistantsSidebarProps {
  selectedId: string | null;
  onSelect: (assistant: Assistant) => void;
  onAssistantDeleted: (id: string) => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
}

export default function AssistantsSidebar({
  selectedId, onSelect, onAssistantDeleted, conversations, activeConversationId, onSelectConversation, onNewConversation, onDeleteConversation,
}: AssistantsSidebarProps) {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { data: assistants, isLoading } = useAssistants();
  const { data: fullEditingAssistant } = useGetAssistant(editingId);
  const createMutation = useCreateAssistant();
  const updateMutation = useUpdateAssistant();
  const deleteMutation = useDeleteAssistant();
  const darkMode = useUIStore((s) => s.darkMode);
  const toggleDarkMode = useUIStore((s) => s.toggleDarkMode);

  function prefetch(id: string) {
    void qc.prefetchQuery({
      queryKey: ['assistants', id],
      queryFn: () => getAssistant(id),
      staleTime: 30_000,
    });
  }

  function handleCreate(body: { name: string; description?: string; instructions?: string }) {
    createMutation.mutate(body, {
      onSuccess: (created) => {
        setModalOpen(false);
        onSelect(created);
      },
    });
  }

  function handleSave(body: { name?: string; description?: string; instructions?: string }) {
    if (!editingId) return;
    updateMutation.mutate({ id: editingId, body }, {
      onSuccess: () => setEditingId(null),
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--color-surface-sidebar)' }}>
      <TopBar>
        <span style={{
          flex: 1, fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)',
          fontWeight: 500, color: 'var(--color-black)',
          letterSpacing: '-0.03em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          Radix
        </span>
        <IconButton label={darkMode ? 'Modo claro' : 'Modo oscuro'} onClick={toggleDarkMode}>
          {darkMode ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </IconButton>
        <IconButton label="Nuevo asistente" onClick={() => setModalOpen(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </IconButton>
      </TopBar>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: 'var(--space-3)' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Spinner size="md" />
          </div>
        ) : !assistants?.length ? (
          <div style={{ textAlign: 'center', color: 'var(--color-muted-slate)', fontSize: 'var(--text-sm)', paddingTop: 'var(--space-10)' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto var(--space-5)', display: 'block', opacity: 0.35 }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              <circle cx="12" cy="16" r="1" fill="currentColor" />
            </svg>
            <p>Sin asistentes.</p>
            <p>Crea uno para empezar.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {assistants.map((a) => (
              <AssistantListItem
                key={a.id}
                assistant={a}
                active={a.id === selectedId}
                onSelect={() => onSelect(a)}
                onEdit={() => setEditingId(a.id)}
                onDelete={() => deleteMutation.mutate(a.id, { onSuccess: () => onAssistantDeleted(a.id) })}
                onHover={() => prefetch(a.id)}
                conversations={a.id === selectedId ? conversations : undefined}
                activeConversationId={a.id === selectedId ? activeConversationId : undefined}
                onSelectConversation={onSelectConversation}
                onNewConversation={onNewConversation}
                onDeleteConversation={onDeleteConversation}
              />
            ))}
            <NewAssistantRow onClick={() => setModalOpen(true)} />
          </div>
        )}
      </div>

      <NewAssistantModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
        isPending={createMutation.isPending}
      />

      <EditAssistantModal
        open={editingId !== null}
        onClose={() => setEditingId(null)}
        onSave={handleSave}
        isPending={updateMutation.isPending}
        assistant={fullEditingAssistant ?? null}
      />
    </div>
  );
}

function NewAssistantRow({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const darkMode = useUIStore((s) => s.darkMode);
  const btnBg = hovered
    ? darkMode ? '#e0e0e0' : '#2a2a2a'
    : 'var(--color-black)';
  return (
    <div style={{ padding: 'var(--space-3) var(--space-5) var(--space-4)' }}>
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: '100%',
          padding: '7px var(--space-6)',
          borderRadius: 'var(--radius-sm)',
          border: 'none',
          background: btnBg,
          fontSize: 'var(--text-sm)',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          color: 'var(--color-white)',
          transition: 'background var(--transition-base)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-2)',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Nuevo asistente
      </button>
    </div>
  );
}
