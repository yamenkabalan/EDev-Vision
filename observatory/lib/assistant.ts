'use client';
import { useCallback, useRef, useState } from 'react';

// One assistant client for the whole page: the "Ask the Okavango" section and
// the "Ask AI" window (header pill, yearly box, floating button) all use it.
export const ASSISTANT_API = 'https://edev-vision-assistant.vercel.app/api/chat';

export type Message = { role: 'user' | 'assistant'; content: string; failed?: boolean };

/**
 * What the reader is looking at. Only identifiers are sent: the server builds
 * the numbers itself from the published data feed, so the model never relies
 * on values supplied by the browser. Older servers ignore this field.
 */
export type ChatContext = { date?: string; year?: number; view?: 'nisar' | 'history' };

export function useAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const history = useRef<Message[]>([]);

  const ask = useCallback(async (question: string, context?: ChatContext) => {
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
        body: JSON.stringify(context ? { messages: sent, context } : { messages: sent }),
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
