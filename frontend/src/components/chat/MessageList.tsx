import { useEffect, useRef } from 'react';
import type { Message } from '../../types/api';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import Spinner from '../common/Spinner';

interface MessageListProps {
  messages: Message[];
  isSending: boolean;
  streamingId?: string | null;
  isLoading?: boolean;
  hasConversation?: boolean;
}

const centeredBox: React.CSSProperties = {
  height: '100%',
  minHeight: 200,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export default function MessageList({ messages, isSending, streamingId, isLoading, hasConversation }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const streamingMsg = streamingId ? messages.find((m) => m.id === streamingId) : null;
  const showTyping = isSending && (!streamingMsg || streamingMsg.content === '');
  const visibleMessages = messages.filter((m) => !(m.id === streamingId && m.content === ''));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  if (isLoading) {
    return (
      <div style={centeredBox}>
        <Spinner size="md" />
      </div>
    );
  }

  if (!visibleMessages.length && !isSending) {
    if (hasConversation) return null;
    return (
      <div style={{ ...centeredBox, color: 'var(--color-muted-slate)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-body)' }}>
        Escribe un mensaje para comenzar
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: 'var(--space-5) 0', gap: 'var(--space-2)' }}>
      <div style={{ maxWidth: 760, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {visibleMessages.map((m) => (
          <MessageBubble key={m.id} message={m} isStreaming={m.id === streamingId} />
        ))}
        {showTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
