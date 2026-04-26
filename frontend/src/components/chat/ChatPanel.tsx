import type { Message } from '../../types/api';
import MessageList from './MessageList';

interface ChatPanelProps {
  messages: Message[];
  isSending: boolean;
  streamingId?: string | null;
  isLoading?: boolean;
  hasConversation?: boolean;
}

export default function ChatPanel({ messages, isSending, streamingId, isLoading, hasConversation }: ChatPanelProps) {
  return <MessageList messages={messages} isSending={isSending} streamingId={streamingId} isLoading={isLoading} hasConversation={hasConversation} />;
}
