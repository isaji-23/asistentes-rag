import { useState, useRef, useEffect } from 'react';
import AppShell from './components/layout/AppShell';
import AssistantsSidebar from './components/sidebar-left/AssistantsSidebar';
import ChatHeader from './components/chat/ChatHeader';
import ChatPanel from './components/chat/ChatPanel';
import MessageInput from './components/chat/MessageInput';
import type { MessageInputHandle } from './components/chat/MessageInput';
import DocumentsSidebar from './components/sidebar-right/DocumentsSidebar';
import { useChat } from './hooks/useChat';
import { useGetAssistant } from './hooks/useAssistants';
import ToastContainer from './components/common/Toast';
import { useUIStore } from './store/uiStore';

export default function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const inputRef = useRef<MessageInputHandle>(null);
  const darkMode = useUIStore((s) => s.darkMode);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Always derive the assistant from the cache so edits are reflected instantly
  const { data: selectedAssistant = null } = useGetAssistant(selectedId);

  const {
    conversations,
    conversationId,
    detail,
    isLoadingChat,
    hasConversation,
    send,
    isStreaming,
    streamingId,
    deleteConversation,
    selectConversation,
    newConversation,
  } = useChat(selectedAssistant);

  useEffect(() => {
    if (!isStreaming) {
      inputRef.current?.focus();
    }
  }, [isStreaming]);

  return (
    <>
    <AppShell
      left={
        <AssistantsSidebar
          selectedId={selectedId}
          onSelect={(a) => setSelectedId(a.id)}
          onAssistantDeleted={(id) => { if (selectedId === id) setSelectedId(null); }}
          conversations={conversations ?? []}
          activeConversationId={conversationId}
          onSelectConversation={selectConversation}
          onNewConversation={newConversation}
          onDeleteConversation={deleteConversation}
        />
      }

      chatTopBar={<ChatHeader assistant={selectedAssistant} />}
      chatContent={
        selectedAssistant ? (
          <ChatPanel
            messages={detail?.messages ?? []}
            isSending={isStreaming}
            streamingId={streamingId}
            isLoading={isLoadingChat}
            hasConversation={hasConversation}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-muted-slate)', fontSize: 'var(--text-sm)' }}>
            Selecciona un asistente para chatear
          </div>
        )
      }
      chatBottomBar={
        selectedAssistant
          ? <MessageInput ref={inputRef} onSend={send} disabled={isStreaming} />
          : null
      }

      right={
        selectedAssistant
          ? <DocumentsSidebar assistant={selectedAssistant} />
          : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-muted-slate)', fontSize: 'var(--text-sm)', padding: 'var(--space-6)', textAlign: 'center' }}>
              Selecciona un asistente
            </div>
      }
    />
    <ToastContainer />
    </>
  );
}
