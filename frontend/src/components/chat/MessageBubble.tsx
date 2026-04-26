import type { Message } from '../../types/api';
import CitationsList from './CitationsList';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

export default function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        padding: 'var(--space-2) var(--space-6)',
      }}
    >
      <div style={{ maxWidth: '72%', minWidth: 0 }}>
        <div
          style={{
            padding: '10px var(--space-5)',
            borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            background: isUser ? 'var(--color-near-black)' : 'var(--color-lightest-gray)',
            color: isUser ? 'var(--color-white)' : 'var(--color-near-black)',
            fontSize: 'var(--text-sm)',
            lineHeight: 1.6,
            fontFamily: 'var(--font-body)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {message.content}
          {isStreaming && (
            <span
              style={{
                display: 'inline-block',
                width: 2,
                height: '1em',
                background: 'var(--color-muted-slate)',
                marginLeft: 2,
                verticalAlign: 'text-bottom',
                animation: 'blink 1s step-end infinite',
              }}
            />
          )}
        </div>
        {!isUser && <CitationsList citations={message.citations} />}
        <style>{`
          @keyframes blink { 0%, 100% { opacity: 1 } 50% { opacity: 0 } }
        `}</style>
      </div>
    </div>
  );
}
