'use client';
import { useEffect, useRef, useState } from 'react';
import type { AssistantChat } from '@/lib/assistant';

/*
  Inline chat console. The Future section (side panel) and the AI section use
  it; both show the same page-wide conversation as the floating "Ask AI"
  window, so a question asked in one place is still there in the others.
*/
type Props = {
  chat: AssistantChat;
  title: string;
  intro: string;
  prompts: readonly string[];
  /** Visible height of the message log. */
  size?: 'side' | 'large';
  placeholder?: string;
};

export default function ChatPanel({ chat, title, intro, prompts, size = 'large', placeholder = 'Ask about water in the Okavango Delta…' }: Props) {
  const { messages, busy, ask } = chat;
  const [question, setQuestion] = useState('');
  const log = useRef<HTMLDivElement>(null);
  // Follow new messages inside the log only; never scroll the page itself.
  useEffect(() => { const el = log.current; if (el) el.scrollTop = el.scrollHeight; }, [messages, busy]);
  const send = (q = question) => { if (!q.trim() || busy) return; setQuestion(''); void ask(q); };
  return (
    <div className={`chat-panel chat-${size}`}>
      <div className="chat-panel-head"><span><i className="signal-dot" /> {title}</span><span className="chat-panel-model">DATA-GROUNDED · CAN BE WRONG</span></div>
      <div className="chat-panel-log" ref={log} aria-live="polite">
        {!messages.length && <div className="chat-panel-hello">
          <p>{intro}</p>
          <div className="chat-panel-prompts">{prompts.map(p => <button type="button" key={p} onClick={() => send(p)}>{p} <span aria-hidden="true">↗</span></button>)}</div>
        </div>}
        {messages.map((m, i) => <div key={i} className={`ask-msg ${m.role}${m.failed ? ' failed' : ''}`}><span>{m.role === 'user' ? 'YOU' : 'RSYNTHESIS AI'}</span><p>{m.content}</p></div>)}
        {busy && <div className="assistant-thinking">Reading the field notes <i /></div>}
      </div>
      <form className="chat-panel-form" onSubmit={e => { e.preventDefault(); send(); }}>
        <textarea rows={1} maxLength={800} value={question} aria-label={`${title}: your question`} placeholder={placeholder}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <button disabled={busy || !question.trim()}>{busy ? '…' : 'Ask ↗'}</button>
      </form>
    </div>
  );
}
