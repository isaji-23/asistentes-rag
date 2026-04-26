import { useState, useEffect } from 'react';
import type { Assistant } from '../types/api';
import { useConversations, useDeleteConversation } from './useConversations';
import { useConversationDetail } from './useConversationDetail';
import { useSendMessageStream } from './useSendMessageStream';

export function useChat(assistant: Assistant | null) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [conversationsResolved, setConversationsResolved] = useState(false);

  const { data: conversations, isLoading: isLoadingConversations } = useConversations(assistant?.id ?? null);
  const { mutate: doDelete } = useDeleteConversation(assistant?.id ?? '');

  // Reset when assistant changes
  useEffect(() => {
    setConversationId(null);
    setConversationsResolved(false);
    setStreamingId(null);
  }, [assistant?.id]);

  // Auto-select latest conversation on initial load only
  useEffect(() => {
    if (!assistant?.id || isLoadingConversations || conversations === undefined) return;
    if (conversationsResolved) return;
    if (conversations.length > 0) {
      const latest = conversations.reduce((a, b) =>
        a.updated_at > b.updated_at ? a : b
      );
      setConversationId(latest.id);
    } else {
      setConversationId(null);
    }
    setConversationsResolved(true);
  }, [assistant?.id, conversations, isLoadingConversations, conversationsResolved]);

  const { data: detail } = useConversationDetail(conversationId);

  const { send, cancel, isStreaming, error } = useSendMessageStream({
    assistantId: assistant?.id ?? '',
    conversationId,
    onConversationCreated: setConversationId,
  });

  useEffect(() => {
    if (!isStreaming) {
      setStreamingId(null);
      return;
    }
    const messages = detail?.messages ?? [];
    const last = messages[messages.length - 1];
    if (last?.role === 'assistant' && last.id.startsWith('streaming-')) {
      setStreamingId(last.id);
    }
  }, [isStreaming, detail?.messages]);

  function selectConversation(id: string) {
    setConversationId(id);
  }

  function newConversation() {
    setConversationId(null);
    // conversationsResolved stays true so the empty chat state shows immediately
    // useSendMessageStream will create the conversation with the first message as title
  }

  function deleteConversation(id: string) {
    doDelete(id, {
      onSuccess: () => {
        if (id === conversationId) setConversationId(null);
      },
    });
  }

  const isLoadingChat = !!assistant?.id && (
    !conversationsResolved ||
    (conversationId !== null && detail === undefined)
  );

  return {
    conversations,
    conversationId,
    detail,
    isLoadingChat,
    hasConversation: conversationId !== null,
    send,
    cancel,
    isStreaming,
    streamingId,
    error,
    selectConversation,
    newConversation,
    deleteConversation,
  };
}
