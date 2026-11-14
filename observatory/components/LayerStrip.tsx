'use client';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import Popover from './Popover';
import { COPY, type LayerId } from '@/lib/copy';
import type { LegendItem } from '@/lib/data';

/*
  The strip above the map: three primary layers as a segmented control, the
  other four in a "More layers" menu (a bottom sheet on phones), one plain
  description line for the active layer, and a "How to read this map" popover.
  No layer opens an external site; every option changes the map in place.
*/
export const PRIMARY_LAYERS: LayerId[] = ['class', 'rgb', 'viirs'];
export const MORE_LAYERS: LayerId[] = ['nasa', 'dswx', 'history', 'hh'];
const L = COPY.layers;

type Props = {
  active: LayerId;
  view: 'nisar' | 'history';
  /** false = no image for the selected date; the option stays visible but disabled. */
  available: Record<LayerId, boolean>;
  onSelect: (id: LayerId) => void;
  /** Classification legend from the feed (open water, flooded vegetation). */
  legend: LegendItem[];
  /** Technical details that come from the feed metadata. */
  extraTech: Partial<Record<LayerId, string[]>>;
};

const descId = (base: string, id: LayerId) => `${base}-desc-${id}`;
const sentence = (id: LayerId) => `${L.items[id].what}. ${L.items[id].best}.`;

function Chevron() {
  return <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>;
}

export default function LayerStrip({ active, view, available, onSelect, legend, extraTech }: Props) {
  const base = useId().replace(/:/g, '');
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIsMore = MORE_LAYERS.includes(active);

  const close = (refocus = true) => { setOpen(false); if (refocus) trigger.current?.focus(); };

  useEffect(() => {
    if (!open) return;
    // Focus the selected option, or the first one, when the menu opens.
    const start = Math.max(0, MORE_LAYERS.indexOf(active));
    const id = requestAnimationFrame(() => items.current[start]?.focus());
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); trigger.current?.focus(); } };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !trigger.current?.contains(t)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => { cancelAnimationFrame(id); document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown); };
  }, [open, active]);

  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const list = items.current.filter(Boolean) as HTMLButtonElement[];
    const i = list.indexOf(document.activeElement as HTMLButtonElement);
    const go = (n: number) => { e.preventDefault(); list[(n + list.length) % list.length]?.focus(); };
    if (e.key === 'ArrowDown') go(i + 1);
    else if (e.key === 'ArrowUp') go(i - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(list.length - 1);
    else if (e.key === 'Tab') setOpen(false);
  };

  const choose = (id: LayerId) => {
    if (!available[id]) return;
    onSelect(id);
    if (MORE_LAYERS.includes(id)) close();
  };

  const item = L.items[active];
  const legendRows = view === 'history'
    ? COPY.howToRead.historyLegend
    : legend.map(l => ({ label: l.label, color: `rgb(${l.color.slice(0, 3).join(',')})` }));

  return (
    <div className="v2-layerbar" data-open={open || undefined}>
      <div className="v2-layerbar-row">
        <div className="v2-layer-controls">
          <div className="v2-seg" role="group" aria-label={L.groupLabel}>
            {PRIMARY_LAYERS.map(id => (
              <button
                key={id} type="button" className="v2-seg-btn"
                aria-pressed={active === id}
                aria-disabled={!available[id] || undefined}
                aria-describedby={descId(base, id)}
                title={available[id] ? sentence(id) : `${L.unavailable}. ${sentence(id)}`}
                onClick={() => choose(id)}
              >
                {L.items[id].label}
              </button>
            ))}
          </div>
          <div className="v2-more">
            <button
              ref={trigger} type="button" className="v2-more-btn"
              data-active={activeIsMore || undefined}
              aria-haspopup="menu" aria-expanded={open} aria-controls={`${base}-menu`}
              onClick={() => setOpen(o => !o)}
              onKeyDown={e => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); setOpen(true); } }}
            >
              <span>{activeIsMore ? L.moreActive(item.label) : L.more}</span><Chevron />
            </button>
            {open && <>
              <div className="v2-sheet-backdrop" aria-hidden="true" onClick={() => close(false)} />
              <div ref={panel} className="v2-menu-panel">
                <div className="v2-sheet-head">
                  <span>{L.sheetTitle}</span>
                  <button type="button" className="v2-sheet-close" aria-label={L.close} onClick={() => close()}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                  </button>
                </div>
                <div id={`${base}-menu`} role="menu" aria-label={L.menuLabel} className="v2-menu" onKeyDown={onMenuKey}>
                  {MORE_LAYERS.map((id, i) => (
                    <button
                      key={id} ref={el => { items.current[i] = el; }}
                      type="button" role="menuitemradio" tabIndex={-1}
                      className="v2-menu-item"
                      aria-checked={active === id}
                      aria-disabled={!available[id] || undefined}
                      aria-describedby={descId(base, id)}
                      title={available[id] ? sentence(id) : `${L.unavailable}. ${sentence(id)}`}
                      onClick={() => choose(id)}
                    >
                      <span className="v2-menu-name">{L.items[id].label}</span>
                      <span className="v2-menu-desc">{available[id] ? L.items[id].best : L.unavailable}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>}
          </div>
        </div>

        <div className="v2-caption">
          <span>{view === 'history' ? COPY.caption.history : COPY.caption.nisar}</span>
          <Popover label={COPY.howToRead.button} align="end" triggerClassName="v2-link-btn" panelClassName="v2-howto" trigger={<>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" strokeLinecap="round" /></svg>
            {COPY.howToRead.button}
          </>}>
            <strong className="v2-pop-title">{COPY.howToRead.title}</strong>
            <div className="v2-pop-sub">{COPY.howToRead.legend}</div>
            <ul className="v2-howto-legend">
              {legendRows.map(r => <li key={r.label}><i style={{ background: r.color }} aria-hidden="true" />{r.label}</li>)}
              {view !== 'history' && <li><i className="v2-swatch-empty" aria-hidden="true" />{COPY.howToRead.noData}</li>}
            </ul>
            <ul className="v2-howto-bullets">
              {(view === 'history' ? COPY.howToRead.historyBullets : COPY.howToRead.bullets).map(b => <li key={b}>{b}</li>)}
            </ul>
          </Popover>
        </div>
      </div>

      <div className="v2-layer-desc" aria-live="polite">
        <span>
          {!available[active] && <strong className="v2-unavailable">{L.unavailable}. </strong>}
          {sentence(active)}
        </span>
        <Popover label={L.infoButton(item.label)} title={L.infoButton(item.label)} triggerClassName="v2-info-btn" panelClassName="v2-layer-info" trigger={<span aria-hidden="true">?</span>}>
          <strong className="v2-pop-title">{item.label}</strong>
          {item.more.map(s => <p key={s}>{s}</p>)}
          <div className="v2-pop-sub">{L.techHeading}</div>
          <ul className="v2-tech">
            {[...item.tech, ...(extraTech[active] || [])].map(t => <li key={t}>{t}</li>)}
          </ul>
        </Popover>
      </div>

      {/* Descriptions for aria-describedby; hidden elements can still be referenced. */}
      <div hidden>
        {[...PRIMARY_LAYERS, ...MORE_LAYERS].map(id => <span key={id} id={descId(base, id)}>{available[id] ? '' : `${L.unavailable}. `}{sentence(id)}</span>)}
      </div>
    </div>
  );
}
