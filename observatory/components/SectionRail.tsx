'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Section } from '@/lib/sections';

/*
  The stacked boxes on the right of every page after the opening screen.
  Each box is one section: the current one is lit and fills as it is read,
  sections already read stay filled, and the head shows how much of the page
  is left. Below 1100 px the same information becomes a bar at the bottom
  that opens the full list.
*/
type State = { active: number; fill: number[]; left: number };

export default function SectionRail({ sections, onActive, mobileAction }: { sections: readonly Section[]; onActive?: (id: string) => void; mobileAction?: ReactNode }) {
  const [state, setState] = useState<State>({ active: 0, fill: sections.map(() => 0), left: 1 });
  const [open, setOpen] = useState(false);
  const last = useRef('');

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const line = innerHeight * 0.38;
      let active = 0;
      const fill = sections.map((s, i) => {
        const el = document.getElementById(s.id);
        if (!el) return 0;
        const r = el.getBoundingClientRect();
        if (r.top <= line) active = i;
        return Math.max(0, Math.min(1, (line - r.top) / Math.max(1, r.height)));
      });
      const first = document.getElementById(sections[0].id);
      const start = first ? first.getBoundingClientRect().top + scrollY : 0;
      const end = document.documentElement.scrollHeight - innerHeight;
      const read = Math.max(0, Math.min(1, (scrollY - start + innerHeight * 0.38) / Math.max(1, end - start + innerHeight * 0.38)));
      const left = scrollY >= end - 2 ? 0 : 1 - read;
      const key = `${active}|${fill.map(f => f.toFixed(3)).join(',')}|${left.toFixed(3)}`;
      if (key !== last.current) { last.current = key; setState({ active, fill, left }); }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule);
    const ro = new ResizeObserver(schedule);
    ro.observe(document.body);
    return () => { removeEventListener('scroll', schedule); removeEventListener('resize', schedule); ro.disconnect(); cancelAnimationFrame(frame); };
  }, [sections]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open]);

  const { active, fill, left } = state;
  const activeId = sections[active]?.id ?? '';
  useEffect(() => { onActive?.(activeId); }, [activeId, onActive]);
  const n = sections.length;
  const num = (i: number) => String(i + 1).padStart(2, '0');
  const leftLabel = left <= 0.005 ? 'End of the page' : `${Math.max(1, Math.round(left * 100))}% of the page left`;
  const items = (onPick?: () => void) => sections.map((s, i) => (
    <li key={s.id}>
      <a href={`#${s.id}`} onClick={onPick} data-state={i < active ? 'done' : i === active ? 'active' : 'next'} aria-current={i === active ? 'location' : undefined}>
        <span className="rail-num">{num(i)}</span>
        <span className="rail-text"><strong>{s.label}</strong><small>{s.hint}</small></span>
        <i className="rail-fill" style={{ transform: `scaleX(${i < active ? 1 : fill[i]})` }} aria-hidden="true" />
      </a>
    </li>
  ));

  return <>
    <nav className="section-rail" aria-label="Page sections">
      <div className="rail-head">
        <span>ON THIS PAGE</span>
        <strong>{num(active)} <em>/ {num(n - 1)}</em></strong>
      </div>
      <ol>{items()}</ol>
      <div className="rail-foot" aria-live="off">
        <div className="rail-meter" aria-hidden="true"><i style={{ transform: `scaleX(${1 - left})` }} /></div>
        <span>{leftLabel}</span>
      </div>
    </nav>

    <div className="rail-mobile" data-open={open}>
      <ol className="rail-sheet" id="rail-sheet" hidden={!open}>{items(() => setOpen(false))}</ol>
      <div className="rail-mobile-controls">
        <button type="button" className="rail-bar" aria-expanded={open} aria-controls="rail-sheet" onClick={() => setOpen(o => !o)}>
          <span className="rail-num">{num(active)}/{num(n - 1)}</span>
          <span className="rail-bar-label">{sections[active].label}</span>
          <span className="rail-bar-left">{left <= 0.005 ? 'End' : `${Math.max(1, Math.round(left * 100))}% left`}</span>
          <i className="rail-bar-meter" style={{ transform: `scaleX(${1 - left})` }} aria-hidden="true" />
        </button>
        {mobileAction}
      </div>
    </div>
  </>;
}
