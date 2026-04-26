import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import type { KeyboardEvent } from 'react';

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export interface MessageInputHandle {
  focus: () => void;
}

const MAX_ROWS_HEIGHT = 126; // ~6 lines of content (no padding — container handles it)

const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>(
  function MessageInput({ onSend, disabled }, ref) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [focused, setFocused] = useState(false);
    const [hasValue, setHasValue] = useState(false);
    const [btnHovered, setBtnHovered] = useState(false);

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
    }));

    function autoGrow() {
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, MAX_ROWS_HEIGHT) + 'px';
      el.style.overflowY = el.scrollHeight >= MAX_ROWS_HEIGHT ? 'auto' : 'hidden';
      setHasValue(el.value.trim().length > 0);
    }

    useEffect(() => { autoGrow(); }, []);

    function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    }

    function submit() {
      const el = textareaRef.current;
      const trimmed = el?.value.trim() ?? '';
      if (!trimmed || disabled) return;
      onSend(trimmed);
      if (el) { el.value = ''; autoGrow(); }
      setHasValue(false);
    }

    const canSend = hasValue && !disabled;

    return (
      <div style={{
        border: `1px solid ${focused ? 'var(--color-focus-purple)' : 'var(--color-border-cool)'}`,
        borderRadius: 'var(--radius-sm)',
        background: disabled ? 'var(--color-lightest-gray)' : 'var(--color-input-bg)',
        transition: 'border-color var(--transition-base)',
        display: 'flex',
        alignItems: 'flex-end',
        padding: 'var(--space-5)',
        gap: 'var(--space-3)',
      }}>
        <textarea
          ref={textareaRef}
          rows={1}
          onInput={autoGrow}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          placeholder="Escribe un mensaje… (Enter para enviar, Shift+Enter nueva línea)"
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            resize: 'none',
            padding: 0,
            marginBottom: '3.5px',
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font-body)',
            color: 'var(--color-near-black)',
            background: 'transparent',
            lineHeight: 1.5,
            overflowY: 'hidden',
            width: '100%',
            boxSizing: 'border-box',
          }}
        />
        <button
          onClick={submit}
          disabled={!canSend}
          onMouseEnter={() => canSend && setBtnHovered(true)}
          onMouseLeave={() => setBtnHovered(false)}
          aria-label="Enviar mensaje"
          style={{
            width: 28,
            height: 28,
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: !canSend
              ? 'var(--color-lightest-gray)'
              : btnHovered
                ? 'var(--color-interaction-blue)'
                : 'var(--color-near-black)',
            color: canSend ? 'var(--color-white)' : 'var(--color-muted-slate)',
            cursor: canSend ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background var(--transition-base), color var(--transition-base)',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </button>
      </div>
    );
  }
);

export default MessageInput;
