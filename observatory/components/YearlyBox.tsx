'use client';
import { useEffect, useRef, type CSSProperties, type KeyboardEvent } from 'react';
import { COPY, signed } from '@/lib/copy';
import { formatArea } from '@/lib/data';
import { compareYear, DRIVER_ORDER, push, yearSentences, type Driver, type YearChange, type YearDrivers, type YearPoint, type YearSeries } from '@/lib/yearly';

/*
  "Open water by year": one diverging bar per year (Landsat WOfS annual open
  water against the long-term average), a card for the selected year, and the
  drivers that went with it. Colour is never the only signal: every bar has an
  icon, and the card names the class in words.
*/
const Y = COPY.yearly;
const V = COPY.drivers.values;
type StoryLike = { years?: Record<string, { mismatch?: unknown; events?: unknown } | undefined> };
type StoryEvent = { title: string; source: string; url: string };

type Props = {
  series: YearSeries | null;
  failed: boolean;
  drivers: Map<number, YearDrivers>;
  story: StoryLike;
  /** Selected year; null picks the latest year with a full-coverage value. */
  year: number | null;
  onYear: (year: number) => void;
  onAsk: (year: number) => void;
  /** Called once when the box nears the viewport, so the record loads lazily. */
  onNeed: () => void;
};

const drawn = (p: YearPoint) => p.cls === 'dry' || p.cls === 'near' || p.cls === 'wet';
const pctRound = (v: number) => Math.round(Math.abs(v));

function anomalyText(p: YearPoint | undefined) {
  if (!p || p.water === null) return Y.noValue;
  if (p.cls === 'uncertain' || p.anomaly === null) return Y.notComparable;
  const n = pctRound(p.anomaly);
  const text = n === 0 ? Y.same : p.anomaly > 0 ? Y.above(n) : Y.below(n);
  return p.partial ? `${Y.atLeast} ${text}` : text;
}

function changeText(c: YearChange) {
  const diff = `${c.diff > 0 ? '+' : c.diff < 0 ? '−' : ''}${formatArea(Math.abs(c.diff))}`;
  return `${Y.changeValue(diff, c.pct === null ? null : signed(Math.round(c.pct)))}${c.partial ? ` ${Y.partialSuffix}` : ''}`;
}

function driverValue(d: Driver) {
  if (d.id === 'enso') return V.oni(d.value, COPY.drivers.phases[d.phase ?? 'neutral']);
  if (d.id === 'inflow') return V.inflow(Math.round(d.value), d.rank ?? 0, d.of ?? 0);
  if (d.id === 'heat') return V.heat(d.value);
  return d.pct !== undefined ? V.rain(d.value, d.pct) : `${d.value} mm`;
}

export default function YearlyBox({ series, failed, drivers, story, year, onYear, onAsk, onNeed }: Props) {
  const root = useRef<HTMLElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { onNeed(); io.disconnect(); } }, { rootMargin: '400px' });
    io.observe(el);
    return () => io.disconnect();
  }, [onNeed]);

  const points = series?.points ?? [];
  const fallback = [...points].reverse().find(p => p.water !== null && !p.partial)?.year ?? points.at(-1)?.year ?? null;
  const sel = year !== null && points.some(p => p.year === year) ? year : fallback;
  const lastValue = Math.max(-Infinity, ...points.filter(p => p.water !== null).map(p => p.year));
  const scale = Math.max(40, ...points.filter(drawn).map(p => Math.abs(p.anomaly ?? 0)));

  // Keep the selected year visible inside the horizontally scrolling strip
  // without scrolling the page itself.
  useEffect(() => {
    const sc = scroller.current, el = sc?.querySelector<HTMLElement>(`[data-year="${sel}"]`);
    if (!sc || !el) return;
    const left = el.offsetLeft, right = left + el.offsetWidth;
    if (left < sc.scrollLeft) sc.scrollLeft = left - 24;
    else if (right > sc.scrollLeft + sc.clientWidth) sc.scrollLeft = right - sc.clientWidth + 24;
  }, [sel, points.length]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = points.findIndex(p => p.year === sel);
    if (i < 0) return;
    const n = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? i + 1
      : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? i - 1
      : e.key === 'Home' ? 0 : e.key === 'End' ? points.length - 1 : null;
    if (n === null) return;
    e.preventDefault();
    const next = points[Math.max(0, Math.min(points.length - 1, n))];
    onYear(next.year);
    requestAnimationFrame(() => scroller.current?.querySelector<HTMLElement>(`[data-year="${next.year}"]`)?.focus());
  };

  const p = points.find(x => x.year === sel);
  const d = sel !== null ? drivers.get(sel) : undefined;
  const prev = series && sel !== null ? compareYear(series, sel, sel - 1) : null;
  const next = series && sel !== null ? compareYear(series, sel, sel + 1) : null;
  const storyYear = sel !== null ? story.years?.[String(sel)] : undefined;
  const mismatch = typeof storyYear?.mismatch === 'string' ? storyYear.mismatch : null;
  const events = (Array.isArray(storyYear?.events) ? storyYear.events as StoryEvent[] : [])
    .filter(e => e && typeof e.title === 'string' && typeof e.url === 'string' && e.url.startsWith('https://'));
  const sentences = yearSentences(p?.cls ?? 'none', d, COPY.sentence, k => COPY.drivers.phases[k]);
  const cls = Y.classes[p?.cls ?? 'none'];

  return (
    <section ref={root} className="v2-yearly" aria-labelledby="v2-yearly-title">
      <div className="v2-yearly-head">
        <div>
          <h3 id="v2-yearly-title">{Y.title}</h3>
          <p>{Y.subtitle}</p>
        </div>
        {series?.mean != null && series.meanFirst !== null && series.meanLast !== null &&
          <p className="v2-yearly-mean">{Y.meanNote(formatArea(series.mean), series.meanCount, series.meanFirst, series.meanLast)}</p>}
      </div>

      {!series || sel === null ? <div className="v2-yearly-state" role="status">{failed ? Y.failed : Y.loading}</div> : <>
        <div className="v2-yearstrip-scroll" ref={scroller}>
          <div className="v2-yearstrip" role="radiogroup" aria-label={Y.stripLabel} onKeyDown={onKey} style={{ '--n': points.length } as CSSProperties}>
            <span className="v2-yearstrip-mean" aria-hidden="true" />
            {points.map(pt => {
              const c = Y.classes[pt.cls];
              const h = drawn(pt) ? Math.max(5, Math.min(100, Math.abs(pt.anomaly!) / scale * 100)) : 0;
              const label = Y.barLabel(pt.year, pt.water === null ? Y.noValue : `${formatArea(pt.water)} ${Y.unit}`, anomalyText(pt), pt.partial ? `${c.label}, ${Y.partialBadge.toLowerCase()}` : c.label);
              return (
                <button
                  key={pt.year} type="button" role="radio" data-year={pt.year}
                  className="v2-yr" data-cls={pt.cls} data-partial={pt.partial || undefined}
                  aria-checked={pt.year === sel} tabIndex={pt.year === sel ? 0 : -1}
                  aria-label={label} title={label}
                  onClick={() => onYear(pt.year)}
                >
                  <span className="v2-yr-plot" aria-hidden="true">
                    {drawn(pt) && <span className="v2-yr-bar" data-dir={(pt.anomaly ?? 0) >= 0 ? 'up' : 'down'} style={{ '--h': `${h}%` } as CSSProperties} />}
                    {pt.cls === 'uncertain' && <span className="v2-yr-stub" />}
                  </span>
                  <span className="v2-yr-icon" aria-hidden="true">{c.icon}</span>
                  <span className="v2-yr-label" aria-hidden="true">{pt.year % 5 === 0 ? pt.year : ''}</span>
                </button>
              );
            })}
          </div>
        </div>
        <ul className="v2-yearstrip-legend" aria-label={Y.legendTitle}>
          {(['dry', 'near', 'wet', 'uncertain', 'none'] as const).map(k => (
            <li key={k} data-cls={k}><span className="v2-yr-icon" aria-hidden="true">{Y.classes[k].icon}</span>{Y.classes[k].label}<small>{Y.classes[k].hint}</small></li>
          ))}
        </ul>

        <div className="v2-yearcard">
          <div className="v2-yearcard-main" aria-live="polite">
            <div className="v2-yearcard-year">
              <span className="v2-num">{sel}</span>
              <span className="v2-badge" data-cls={p?.cls ?? 'none'}><span aria-hidden="true">{cls.icon}</span> {cls.label}</span>
              {p?.partial && <span className="v2-badge" data-cls="partial">{Y.partialBadge}</span>}
            </div>
            <dl className="v2-yearcard-stats">
              <div className="v2-stat-big">
                <dt>{Y.openWater}</dt>
                <dd><span className="v2-num">{p?.water != null ? formatArea(p.water) : '—'}</span>{p?.water != null && <small> {Y.unit}</small>}</dd>
              </div>
              <div><dt>{Y.vsAverage}</dt><dd>{anomalyText(p)}</dd></div>
              {prev && <div><dt>{Y.vsPrev(prev.year)}</dt><dd>{changeText(prev)}</dd></div>}
              {next && <div><dt>{Y.vsNext(next.year)}</dt><dd>{changeText(next)}</dd></div>}
            </dl>
            {p?.partial && <p className="v2-note">{Y.partialNote}</p>}
            {p?.cls === 'none' && <p className="v2-note">{sel > lastValue ? Y.noData2026 : Y.noData1988}</p>}
          </div>

          <div className="v2-yearcard-drivers">
            <h4>{Y.driversTitle}</h4>
            <p className="v2-summary">{sentences.join(' ')}</p>
            {mismatch && <p className="v2-note">{mismatch}</p>}
            {d && Object.keys(d).length ? <ul className="v2-drivers">
              {DRIVER_ORDER.filter(id => d[id]).map(id => {
                const x = d[id]!, dir = push(x.level);
                return (
                  <li key={id}>
                    <span className="v2-push" data-dir={dir} aria-hidden="true">{dir === 'dry' ? '▼' : dir === 'wet' ? '▲' : '●'}</span>
                    <div>
                      <div className="v2-driver-top"><b>{COPY.drivers[id].label}</b><span className="v2-driver-value">{driverValue(x)}</span></div>
                      <small>{COPY.drivers[id].indicator}</small>
                      <small className="v2-driver-push">{Y.pushes[dir]}</small>
                    </div>
                  </li>
                );
              })}
            </ul> : <p className="v2-note">{Y.driversEmpty}</p>}
            {events.length > 0 && <div className="v2-events">
              <div className="v2-pop-sub">{Y.eventsTitle}</div>
              {events.map(e => (
                <a key={e.url + e.title} href={e.url} target="_blank" rel="noopener noreferrer">
                  {e.title} <small>{e.source}</small>
                  <span className="v2-ext">↗ {Y.eventOpens}</span>
                </a>
              ))}
            </div>}
            <button type="button" className="v2-btn-primary" aria-haspopup="dialog" onClick={() => onAsk(sel)}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" /></svg>
              {Y.askAi(sel)}
            </button>
          </div>
        </div>
      </>}
    </section>
  );
}
