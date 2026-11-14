'use client';
import { useEffect, useRef, useState } from 'react';
import { useAssistant, type ChatContext } from '@/lib/assistant';
import { COPY } from '@/lib/copy';

/*
  The one "Ask AI about Okavango" chat. Three entry points open it: the header
  pill, the "Ask AI about <year>" button in the yearly box and the floating
  button. It opens as a bottom-right panel (a full-screen sheet on phones),
  can be expanded, minimised to a bar, or closed.
*/
type Mode = 'small' | 'large' | 'min';
const C = COPY.chat;

function Icon({ d }: { d: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
}

type Props = {
  open: boolean;
  /** Increments on every summon, so the same entry point can reopen it. */
  summon: number;
  onClose: () => void;
  /** Question placed in the input (not sent) when the window is summoned. */
  prefill?: string;
  /** Selection sent with every question; the server builds the data context from it. */
  context?: ChatContext;
  contextLabel?: string;
};

export default function AskWindow({ open, summon, onClose, prefill, context, contextLabel }: Props) {
  const { messages, busy, ask } = useAssistant();
  const [mode, setMode] = useState<Mode>('small');
  const [question, setQuestion] = useState('');
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const minToggle = useRef<HTMLButtonElement>(null);

  // Every summon brings the window back at its small size, with the prefilled
  // question (if any) ready to edit and send.
  useEffect(() => {
    if (!open) return;
    if (document.activeElement instanceof HTMLElement && !document.activeElement.closest('.ask-window')) opener.current = document.activeElement;
    setMode('small');
    if (prefill) setQuestion(prefill);
    const id = setTimeout(() => {
      const el = input.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }, 60);
    return () => clearTimeout(id);
  }, [open, summon, prefill]);

  // Give focus back to whatever opened the chat.
  useEffect(() => {
    if (open) return;
    const el = opener.current;
    opener.current = null;
    if (el?.isConnected) el.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }); }, [messages, busy, mode]);

  // Minimising (Escape or the button) removes the input; if it had focus, keep focus in the chat bar.
  useEffect(() => {
    if (mode === 'min' && (!document.activeElement || document.activeElement === document.body)) minToggle.current?.focus();
  }, [mode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMode((m) => (m === 'large' ? 'small' : 'min')); };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  const send = (q = question) => { if (!q.trim() || busy) return; setQuestion(''); void ask(q, context); };

  return (
    <section className="ask-window" data-mode={mode} role="dialog" aria-label={C.title}>
      <div className="ask-window-head" onClick={() => mode === 'min' && setMode('small')}>
        <span className="ask-window-title"><span className="signal-dot" /> {C.title}</span>
        <div className="ask-window-buttons" onClick={(e) => e.stopPropagation()}>
          {/* One element per toggle (label and icon swap), so keyboard focus survives the mode change. */}
          <button type="button" ref={minToggle} title={mode === 'min' ? C.restore : C.minimise} aria-label={mode === 'min' ? C.restore : C.minimise} onClick={() => setMode(mode === 'min' ? 'small' : 'min')}>
            <Icon d={mode === 'min' ? 'M6 15l6-6 6 6' : 'M5 12h14'} />
          </button>
          {mode !== 'min' && <button type="button" className={mode === 'small' ? 'ask-expand' : undefined} title={mode === 'large' ? C.shrink : C.expand} aria-label={mode === 'large' ? C.shrink : C.expand} onClick={() => setMode(mode === 'large' ? 'small' : 'large')}>
            <Icon d={mode === 'large' ? 'M20 4l-6 6M14 4v6h6M4 20l6-6M10 20v-6H4' : 'M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7'} />
          </button>}
          <button type="button" title={C.close} aria-label={C.close} onClick={onClose}><Icon d="M6 6l12 12M18 6L6 18" /></button>
        </div>
      </div>

      {mode !== 'min' && <>
        <div className="ask-window-log" ref={log} aria-live="polite">
          {!messages.length && <div className="ask-window-hello">
            <p>{C.intro}</p>
            {contextLabel && <p className="ask-window-context">{contextLabel}</p>}
            <div className="ask-window-prompts">{C.prompts.map((p) => <button type="button" key={p} onClick={() => send(p)}>{p}</button>)}</div>
          </div>}
          {messages.map((m, i) => <div key={i} className={`ask-msg ${m.role}${m.failed ? ' failed' : ''}`}><span>{m.role === 'user' ? C.you : C.ai}</span><p>{m.content}</p></div>)}
          {busy && <div className="assistant-thinking">{C.thinking} <i /></div>}
        </div>
        <form className="ask-window-form" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <textarea
            ref={input} rows={1} maxLength={800} value={question}
            aria-label={C.inputLabel}
            placeholder={C.placeholder}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <button disabled={busy || !question.trim()}>{busy ? '…' : `${C.send} ↗`}</button>
        </form>
        <small className="ask-window-note">{C.note}</small>
      </>}
    </section>
  );
}
