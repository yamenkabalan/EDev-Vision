'use client';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

/*
  Small disclosure popover: a button that shows a panel of text.
  Closes on Escape (focus returns to the button) and on a click outside.
  `inline` expands it in the flow, for use inside scrolling panels where a
  floating panel would be clipped.
*/
type Props = {
  /** Accessible name of the trigger and the panel. */
  label: string;
  trigger: ReactNode;
  /** Native tooltip on hover. */
  title?: string;
  inline?: boolean;
  align?: 'start' | 'end';
  className?: string;
  triggerClassName?: string;
  panelClassName?: string;
  children: ReactNode;
};

export default function Popover({ label, trigger, title, inline = false, align = 'start', className = '', triggerClassName = '', panelClassName = '', children }: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Keep Escape from also minimising the chat window, which listens on window.
      e.stopPropagation();
      setOpen(false);
      button.current?.focus();
    };
    const onDown = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown); };
  }, [open]);

  return (
    <div ref={box} className={`v2-pop ${className}`} data-inline={inline || undefined}>
      <button ref={button} type="button" className={triggerClassName} aria-label={label} title={title} aria-expanded={open} aria-controls={id} onClick={() => setOpen(o => !o)}>
        {trigger}
      </button>
      <div id={id} role="dialog" aria-label={label} hidden={!open} className={`v2-pop-panel ${panelClassName}`} data-align={align}>
        {children}
      </div>
    </div>
  );
}
