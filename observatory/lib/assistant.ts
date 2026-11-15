'use client';
import { useCallback, useRef, useState } from 'react';

// One assistant client for the whole page: the AI section and the "Ask AI"
// window (header pill, floating button) both use it.
export const ASSISTANT_API = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/chat`;

export type Message = { role: 'user' | 'assistant'; content: string; failed?: boolean };

export function useAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const history = useRef<Message[]>([]);

  const ask = useCallback(async (question: string) => {
    const content = question.trim();
    if (!content || busy) return;
    const next = [...history.current, { role: 'user' as const, content: content.slice(0, 800) }];
    history.current = next;
    setMessages(next);
    setBusy(true);
    try {
      // Failed replies are shown to the reader but never sent back to the model.
      const sent = next.filter((m) => !m.failed).slice(-8).map(({ role, content }) => ({ role, content }));
      const response = await fetch(ASSISTANT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: sent }),
      });
      const data = await response.json();
      if (!response.ok || !data.answer) throw new Error(data.error || `Assistant request failed (${response.status}).`);
      history.current = [...next, { role: 'assistant', content: String(data.answer).slice(0, 1800) }];
    } catch (e) {
      history.current = [...next, {
        role: 'assistant',
        content: e instanceof Error ? e.message : 'Assistant unavailable. Try again.',
        failed: true,
      }];
    } finally {
      setMessages(history.current);
      setBusy(false);
    }
  }, [busy]);

  return { messages, busy, ask };
}

/** One conversation shared by every chat surface on the page. */
export type AssistantChat = ReturnType<typeof useAssistant>;
