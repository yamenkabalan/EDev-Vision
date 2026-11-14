'use client';
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { formatArea, formatDate, highest, inGap, segments, stamp, type Feed, type Metric } from '@/lib/data';
import { chanceBelow, km, pct, type FutureDoc, type ProjectionYear } from '@/lib/future';
import type { HistoryRow, YearDrivers } from '@/lib/yearly';
import { sectionNumber } from '@/lib/sections';

/*
  Graphics: the radar and satellite layers above, turned into charts.
  One row of controls scopes every chart: the data source (Landsat yearly
  water with the projection to 2030, the NISAR 2026 season, or rain against
  water) and the range of years. Measured values are solid; everything from
  2026 on is our projection, dashed, inside its uncertainty band, and the
  chart says FUTURE there. Colours were checked for colour-blind separation
  and contrast on the dark surface (dataviz validator):
  open water #2a94d4, flooded vegetation #6ea83c, model #c4842a.
*/
const C = { water: '#2a94d4', veg: '#6ea83c', model: '#c4842a', grid: '#ffffff14', axis: '#8fa79a', text: '#eef1e8', muted: '#93aa9d', surface: '#0b1c16', now: '#c9e6a0' };
type Source = 'landsat' | 'nisar' | 'rain';
const PRESETS: { label: string; from: number }[] = [{ label: '1984–2030', from: 1984 }, { label: '1989–2030 · well observed', from: 1989 }, { label: '2013–2030 · Landsat 8 era', from: 2013 }];
const LAST = 2030;
const W = 1000, H = 380, M = { l: 62, r: 30, t: 30, b: 42 };

const niceMax = (v: number) => { const step = v > 2000 ? 500 : v > 600 ? 200 : 100; return Math.ceil(v / step) * step; };
const ticks = (max: number) => { const step = max > 2000 ? 500 : max > 600 ? 200 : 100; return Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step); };

type Props = { feed: Feed | null; history: HistoryRow[]; future: FutureDoc | null; futureFailed?: boolean; drivers: Map<number, YearDrivers>; onNeed: () => void };

export default function GraphicsSection({ feed, history, future, futureFailed = false, drivers, onNeed }: Props) {
  const [source, setSource] = useState<Source>('landsat');
  const [from, setFrom] = useState(1984);
  const [selected, setSelected] = useState(2026);
  const host = useRef<HTMLElement>(null);
  useEffect(() => { const el = host.current; if (!el) return; const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { onNeed(); io.disconnect(); } }, { rootMargin: '600px' }); io.observe(el); return () => io.disconnect(); }, [onNeed]);

  const years = useMemo(() => Array.from({ length: LAST - from + 1 }, (_, i) => from + i), [from]);
  const maxWater = feed ? highest(feed.observations, 'open_water_km2', feed.meta.gaps) : null;
  const maxVeg = feed ? highest(feed.observations, 'flooded_veg_km2', feed.meta.gaps) : null;
  const wettest = history.filter(r => !r.low_coverage).reduce<HistoryRow | null>((b, r) => (!b || r.water_km2 > b.water_km2 ? r : b), null);
  const trend = future?.stage1.coef.c2_km2_per_year;
  const yearOptions = Array.from({ length: LAST - 1984 + 1 }, (_, i) => 1984 + i);

  return (
    <section className="graphics-section" id="graphics" ref={host} aria-labelledby="graphics-title">
      <div className="wrap">
        <div className="section-heading">
          <div><div className="eyebrow"><span className="section-number">{sectionNumber('graphics')}</span> GRAPHICS</div><h2 id="graphics-title">The layers above,<br /><em>as numbers to 2030.</em></h2></div>
          <p className="section-description">Pick a source and a range of years. Solid = measured. Dashed = our projection, with its range of uncertainty.</p>
        </div>

        <div className="kpi-row">
          <div className="kpi"><span><i style={{ background: C.water }} /> Highest open water · NISAR 2026</span><strong>{maxWater ? formatArea(maxWater.open_water_km2) : '—'}<small> km²</small></strong><em>{maxWater ? formatDate(maxWater.date, true) : 'Loading'}</em></div>
          <div className="kpi"><span><i style={{ background: C.veg }} /> Highest flooded vegetation · NISAR 2026</span><strong>{maxVeg ? formatArea(maxVeg.flooded_veg_km2) : '—'}<small> km²</small></strong><em>{maxVeg ? formatDate(maxVeg.date, true) : 'Loading'}</em></div>
          <div className="kpi"><span>Largest flood mapped · Landsat</span><strong>{wettest ? km(wettest.water_km2) : '—'}<small> km²</small></strong><em>{wettest ? wettest.year : 'Loading'}</em></div>
          <div className="kpi"><span>Trend with the causes held equal</span><strong>{trend != null ? `${trend < 0 ? '−' : '+'}${Math.abs(trend).toFixed(0)}` : '—'}<small> km² / year</small></strong><em>{future ? `${future.stage1.years[0]}–${future.stage1.years[1]} · z = ${future.stage1.t_values.year}` : 'Loading'}</em></div>
        </div>

        <div className="graphics-controls" role="group" aria-label="Chart controls">
          <div className="seg" role="radiogroup" aria-label="Data source">
            {([['landsat', 'Landsat · yearly water → 2030'], ['nisar', 'NISAR radar · 2026 season'], ['rain', 'Rain → water']] as const).map(([id, label]) =>
              <button key={id} type="button" role="radio" aria-checked={source === id} className={source === id ? 'active' : ''} onClick={() => setSource(id)}>{label}</button>)}
          </div>
          {source !== 'nisar' && <div className="seg seg-small" role="radiogroup" aria-label="Years shown">
            {PRESETS.map(p => <button key={p.from} type="button" role="radio" aria-checked={from === p.from} className={from === p.from ? 'active' : ''} onClick={() => { setFrom(p.from); if (selected < p.from) setSelected(2026); }}>{p.label}</button>)}
          </div>}
          {source !== 'nisar' && <label className="year-pick">Year <select value={selected} onChange={e => { const y = +e.target.value; setSelected(y); if (y < from) setFrom(1984); }}>{yearOptions.map(y => <option key={y} value={y}>{y}{y >= 2026 ? ' · projection' : ''}</option>)}</select></label>}
        </div>

        <div className="graphics-body">
          <div className="graphics-chart">
            {source === 'landsat' && (history.length && future ? <YearChart years={years} history={history} future={future} selected={selected} onSelect={setSelected} /> : futureFailed ? <ChartWait failed text="The projection file could not be loaded, so this chart is unavailable. The measured years are in History above." /> : <ChartWait text="Loading 41 years of Landsat water and the projection…" />)}
            {source === 'nisar' && (feed ? <SeasonChart feed={feed} /> : <ChartWait text="Connecting to the NISAR feed…" />)}
            {source === 'rain' && (history.length && future && drivers.size ? <RainChart from={from} history={history} future={future} drivers={drivers} selected={selected} onSelect={setSelected} /> : futureFailed ? <ChartWait failed text="The projection file could not be loaded, so this chart is unavailable." /> : <ChartWait text="Loading rain and water by year…" />)}
          </div>
          <YearDetail source={source} year={selected} history={history} future={future} drivers={drivers} feed={feed} />
        </div>
      </div>
    </section>
  );
}

function ChartWait({ text, failed = false }: { text: string; failed?: boolean }) { return <div className="chart-wait" role="status">{!failed && <span className="loading-orbit" aria-hidden="true" />}{text}</div>; }

function Legend({ items }: { items: { label: string; kind: 'line' | 'dash' | 'band' | 'dot' | 'hollow'; color: string; opacity?: number }[] }) {
  return <div className="g-legend">{items.map(i => <span key={i.label}>
    <svg width="26" height="12" aria-hidden="true">{i.kind === 'band' ? <rect x="1" y="1" width="24" height="10" rx="2" fill={i.color} opacity={i.opacity ?? .2} /> : i.kind === 'dot' ? <circle cx="13" cy="6" r="4" fill={i.color} /> : i.kind === 'hollow' ? <circle cx="13" cy="6" r="3.5" fill="none" stroke={i.color} strokeWidth="1.6" /> : <line x1="1" x2="25" y1="6" y2="6" stroke={i.color} strokeWidth="2" strokeDasharray={i.kind === 'dash' ? '5 4' : undefined} strokeLinecap="round" />}</svg>
    {i.label}</span>)}</div>;
}

function Tip({ x, children }: { x: number; children: React.ReactNode }) {
  const left = Math.min(78, Math.max(4, x / W * 100));
  return <div className="g-tip" style={{ left: `${left}%` }} role="status">{children}</div>;
}

/* ------------------------------------------------------------ Landsat → 2030 */
function YearChart({ years, history, future, selected, onSelect }: { years: number[]; history: HistoryRow[]; future: FutureDoc; selected: number; onSelect: (y: number) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const first = years[0], obs = new Map(history.map(r => [r.year, r])), model = new Map(future.hindcast.map(h => [h.year, h.predicted_km2]));
  const proj = new Map(future.projection.map(p => [p.year, p]));
  const firstProj = future.projection[0].year;
  const lastObs = [...history].filter(r => r.year < firstProj && !r.low_coverage).at(-1);
  const top = niceMax(Math.max(...history.filter(r => r.year >= first).map(r => r.water_km2), ...future.projection.map(p => p.p975_km2), future.climatology.mean_km2) * 1.04);
  const x = (y: number) => M.l + (y - first) / Math.max(1, LAST - first) * (W - M.l - M.r);
  const y = (v: number) => H - M.b - v / top * (H - M.t - M.b);
  const reliable = years.filter(yr => obs.get(yr) && !obs.get(yr)!.low_coverage && yr < firstProj);
  const runs: number[][] = [];
  for (const yr of reliable) { const run = runs.at(-1); if (run && run.at(-1) === yr - 1) run.push(yr); else runs.push([yr]); }
  const path = (pts: [number, number][]) => pts.map(([a, b], i) => `${i ? 'L' : 'M'}${a.toFixed(1)},${b.toFixed(1)}`).join('');
  const anchor: [number, number] | null = lastObs && lastObs.year >= first ? [x(lastObs.year), y(lastObs.water_km2)] : null;
  const fan = (lo: keyof ProjectionYear, hi: keyof ProjectionYear) => {
    const ps = future.projection.filter(p => p.year >= first);
    const upper = ps.map(p => [x(p.year), y(p[hi] as number)] as [number, number]);
    const lower = ps.map(p => [x(p.year), y(p[lo] as number)] as [number, number]).reverse();
    return path([...(anchor ? [anchor] : []), ...upper, ...lower, ...(anchor ? [anchor] : [])]) + 'Z';
  };
  const median: [number, number][] = [...(anchor ? [anchor] : []), ...future.projection.map(p => [x(p.year), y(p.p50_km2)] as [number, number])];
  const step = LAST - first > 30 ? 5 : 2;
  const xTicks = years.filter(yr => yr % step === 0);
  const nowX = x(firstProj);
  const move = (e: ReactPointerEvent<SVGRectElement>) => { const r = e.currentTarget.ownerSVGElement!.getBoundingClientRect(); const vx = (e.clientX - r.left) / r.width * W; const yr = Math.round(first + (vx - M.l) / (W - M.l - M.r) * (LAST - first)); setHover(Math.max(first, Math.min(LAST, yr))); };
  const show = hover ?? null;
  const last = future.projection.at(-1)!;
  const drought = obs.get(2019);
  return <figure className="g-figure">
    <Legend items={[{ label: 'Landsat open water, measured', kind: 'line', color: C.water }, { label: 'Few clear images (lower bound)', kind: 'hollow', color: C.water }, { label: 'Model, each year left out', kind: 'line', color: C.model }, { label: 'Projection · median', kind: 'dash', color: C.water }, { label: '80% range', kind: 'band', color: C.water, opacity: .28 }, { label: '95% range', kind: 'band', color: C.water, opacity: .12 }]} />
    <div className="g-plot">
      <svg viewBox={`0 0 ${W} ${H}`} className="g-svg" role="img" aria-label={`Yearly open water in the study area, ${first} to ${LAST}. Measured by Landsat up to 2025; projected by the RSynthesis engine from 2026. 2030 median ${km(last.p50_km2)} km², 80% range ${km(last.p10_km2)} to ${km(last.p90_km2)}.`}>
        <rect x={nowX} y={M.t} width={W - M.r - nowX} height={H - M.t - M.b} fill={C.now} opacity=".045" />
        {ticks(top).map(t => <g key={t}><line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke={C.grid} /><text x={M.l - 10} y={y(t) + 4} textAnchor="end" className="g-tick">{t.toLocaleString('en')}</text></g>)}
        <text x={M.l} y={16} className="g-axis-title">OPEN WATER · km²</text>
        {xTicks.map(t => <text key={t} x={x(t)} y={H - M.b + 22} textAnchor="middle" className="g-tick">{t}</text>)}
        <line x1={M.l} x2={W - M.r} y1={y(future.climatology.mean_km2)} y2={y(future.climatology.mean_km2)} stroke={C.muted} strokeOpacity=".45" />
        <text x={M.l + 6} y={y(future.climatology.mean_km2) - 7} className="g-note">{future.climatology.years[0]}–{future.climatology.years[1]} average · {km(future.climatology.mean_km2)}</text>
        <line x1={nowX} x2={nowX} y1={M.t - 8} y2={H - M.b} stroke={C.now} strokeOpacity=".7" />
        <text x={nowX + 8} y={M.t + 6} className="g-future">FUTURE →</text>
        <text x={nowX - 8} y={M.t + 6} textAnchor="end" className="g-note">MEASURED ←</text>
        <path d={fan('p025_km2', 'p975_km2')} fill={C.water} opacity=".12" />
        <path d={fan('p10_km2', 'p90_km2')} fill={C.water} opacity=".22" />
        {runs.filter(r => r.length > 1).map(r => <path key={`m${r[0]}`} d={path(r.filter(yr => model.has(yr)).map(yr => [x(yr), y(model.get(yr)!)]))} fill="none" stroke={C.model} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />)}
        {runs.map(r => r.length > 1 && <path key={`o${r[0]}`} d={path(r.map(yr => [x(yr), y(obs.get(yr)!.water_km2)]))} fill="none" stroke={C.water} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />)}
        <path d={path(median)} fill="none" stroke={C.water} strokeWidth="2" strokeDasharray="6 5" strokeLinecap="round" />
        {years.filter(yr => yr < firstProj && obs.has(yr)).map(yr => { const r = obs.get(yr)!; return r.low_coverage ? <circle key={yr} cx={x(yr)} cy={y(r.water_km2)} r="3.6" fill={C.surface} stroke={C.water} strokeWidth="1.6" /> : <circle key={yr} cx={x(yr)} cy={y(r.water_km2)} r={yr === selected ? 6 : 4} fill={C.water} stroke={C.surface} strokeWidth="2" />; })}
        {future.projection.map(p => <circle key={p.year} cx={x(p.year)} cy={y(p.p50_km2)} r={p.year === selected ? 6 : 4.2} fill={C.surface} stroke={C.water} strokeWidth="2" />)}
        {drought && drought.year >= first && <text x={x(2019)} y={y(drought.water_km2) + 22} textAnchor="middle" className="g-label">2019 · {km(drought.water_km2)}</text>}
        <text x={x(LAST) - 4} y={y(last.p50_km2) - 12} textAnchor="end" className="g-label">{LAST} median · {km(last.p50_km2)}</text>
        {selected >= first && <line x1={x(selected)} x2={x(selected)} y1={M.t} y2={H - M.b} stroke={C.now} strokeOpacity=".35" />}
        {show !== null && <line x1={x(show)} x2={x(show)} y1={M.t} y2={H - M.b} stroke={C.text} strokeOpacity=".4" />}
        <rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} fill="transparent" style={{ cursor: 'crosshair' }} onPointerMove={move} onPointerLeave={() => setHover(null)} onClick={() => show !== null && onSelect(show)} />
      </svg>
      {show !== null && <Tip x={x(show)}><YearReadout year={show} obs={obs.get(show)} model={model.get(show)} proj={proj.get(show)} /></Tip>}
    </div>
    <figcaption>Click the chart to choose a year. Landsat sees open water only; a year with few clear images (hollow dot) is a lower bound and is left out of the line. 1988 has no Landsat map.</figcaption>
    <details className="g-table"><summary>Show the numbers</summary><div className="g-table-scroll"><table><thead><tr><th>Year</th><th>Measured km²</th><th>Model km²</th><th>Projection median</th><th>80% range</th></tr></thead><tbody>
      {years.map(yr => { const o = obs.get(yr), p = proj.get(yr), m = model.get(yr); return <tr key={yr}><td>{yr}</td><td>{o ? `${km(o.water_km2)}${o.low_coverage ? ' (lower bound)' : ''}` : p ? 'not measured yet' : 'no data'}</td><td>{m != null ? km(m) : '—'}</td><td>{p ? km(p.p50_km2) : '—'}</td><td>{p ? `${km(p.p10_km2)}–${km(p.p90_km2)}` : '—'}</td></tr>; })}
    </tbody></table></div></details>
  </figure>;
}

function YearReadout({ year, obs, model, proj }: { year: number; obs?: HistoryRow; model?: number; proj?: ProjectionYear }) {
  return <>
    <b>{year}{proj ? ' · projection' : ''}</b>
    {obs && <p><i style={{ background: C.water }} /><strong>{km(obs.water_km2)} km²</strong> {obs.low_coverage ? 'measured, lower bound' : 'measured'}</p>}
    {!obs && !proj && <p>No Landsat map this year</p>}
    {model != null && <p><i style={{ background: C.model }} /><strong>{km(model)} km²</strong> model</p>}
    {proj && <p><i style={{ background: C.water }} /><strong>{km(proj.p50_km2)} km²</strong> median · 80%: {km(proj.p10_km2)}–{km(proj.p90_km2)}</p>}
  </>;
}

/* ------------------------------------------------------------ NISAR 2026 season */
function SeasonChart({ feed }: { feed: Feed }) {
  const [hover, setHover] = useState<string | null>(null);
  const rows = feed.observations, gaps = feed.meta.gaps;
  if (!rows.length) return <ChartWait text="No NISAR acquisitions published yet." />;
  const t0 = stamp(rows[0].date), t1 = stamp(rows.at(-1)!.date);
  const top = niceMax(Math.max(1, ...rows.flatMap(r => [r.open_water_km2 ?? 0, r.flooded_veg_km2 ?? 0])) * 1.12);
  const x = (d: string) => M.l + (stamp(d) - t0) / Math.max(1, t1 - t0) * (W - M.l - M.r);
  const y = (v: number) => H - M.b - v / top * (H - M.t - M.b);
  const series: { key: Metric; color: string; name: string }[] = [{ key: 'open_water_km2', color: C.water, name: 'Open water' }, { key: 'flooded_veg_km2', color: C.veg, name: 'Flooded vegetation' }];
  const valid = rows.filter(r => !inGap(r.date, gaps));
  const move = (e: ReactPointerEvent<SVGRectElement>) => { const r = e.currentTarget.ownerSVGElement!.getBoundingClientRect(); const vx = (e.clientX - r.left) / r.width * W; setHover(valid.reduce((b, o) => Math.abs(x(o.date) - vx) < Math.abs(x(b.date) - vx) ? o : b).date); };
  const peak = (k: Metric) => highest(rows, k, gaps);
  const h = hover ? rows.find(r => r.date === hover) : null;
  return <figure className="g-figure">
    <Legend items={series.map(s => ({ label: `${s.name} · NISAR`, kind: 'line' as const, color: s.color }))} />
    <div className="g-plot">
      <svg viewBox={`0 0 ${W} ${H}`} className="g-svg" role="img" aria-label="NISAR 2026: open water and flooded vegetation for each acquisition date. Open water peaks in July, flooded vegetation in September.">
        {ticks(top).map(t => <g key={t}><line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke={C.grid} /><text x={M.l - 10} y={y(t) + 4} textAnchor="end" className="g-tick">{t.toLocaleString('en')}</text></g>)}
        <text x={M.l} y={16} className="g-axis-title">CLASSIFIED AREA · km²</text>
        {gaps.filter(([a, b]) => stamp(a) <= t1 && stamp(b) >= t0).map(([a, b]) => <g key={a}><rect x={x(a)} width={Math.max(0, x(b) - x(a))} y={M.t} height={H - M.t - M.b} fill="#c4b58b" opacity=".08" /><text x={(x(a) + x(b)) / 2} y={M.t + 14} textAnchor="middle" className="g-note">NO DATA</text></g>)}
        {series.map(s => <g key={s.key}>{segments(rows, s.key, gaps).map((part, i) => <path key={i} d={part.map((r, j) => `${j ? 'L' : 'M'}${x(r.date).toFixed(1)},${y(r[s.key]!).toFixed(1)}`).join('')} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />)}
          {valid.filter(r => r[s.key] !== null).map(r => <circle key={r.date} cx={x(r.date)} cy={y(r[s.key]!)} r={r.date === hover ? 6 : 4} fill={s.color} stroke={C.surface} strokeWidth="2" />)}</g>)}
        {series.map(s => { const p = peak(s.key); return p && <text key={s.key} x={x(p.date)} y={y(p[s.key]!) - 14} textAnchor="middle" className="g-label">peak {formatArea(p[s.key])} · {formatDate(p.date)}</text>; })}
        {valid.map((r, i) => (i % 2 === 0 || i === valid.length - 1) && <text key={r.date} x={x(r.date)} y={H - M.b + 22} textAnchor="middle" className="g-tick">{formatDate(r.date)}</text>)}
        {hover && <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={H - M.b} stroke={C.text} strokeOpacity=".4" />}
        <rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} fill="transparent" style={{ cursor: 'crosshair' }} onPointerMove={move} onPointerLeave={() => setHover(null)} />
      </svg>
      {h && <Tip x={x(h.date)}><b>{formatDate(h.date, true)} · {h.quality || 'quality unspecified'}</b><p><i style={{ background: C.water }} /><strong>{formatArea(h.open_water_km2)} km²</strong> open water</p><p><i style={{ background: C.veg }} /><strong>{formatArea(h.flooded_veg_km2)} km²</strong> flooded vegetation</p></Tip>}
    </div>
    <figcaption>NISAR launched in 2025, so 2026 is its first full flood season over the Delta. Open water fills the channels first; water under vegetation peaks weeks later — L-band radar is what makes the second curve visible. Areas are strict, threshold-based lower bounds.</figcaption>
    <details className="g-table"><summary>Show the numbers</summary><div className="g-table-scroll"><table><thead><tr><th>Date</th><th>Open water km²</th><th>Flooded vegetation km²</th><th>Quality</th></tr></thead><tbody>
      {rows.map(r => <tr key={r.date}><td>{formatDate(r.date, true)}</td><td>{inGap(r.date, gaps) ? 'no data' : formatArea(r.open_water_km2)}</td><td>{inGap(r.date, gaps) ? 'no data' : formatArea(r.flooded_veg_km2)}</td><td>{r.quality || '—'}</td></tr>)}
    </tbody></table></div></details>
  </figure>;
}

/* ------------------------------------------------------------ rain → water */
function RainChart({ from, history, future, drivers, selected, onSelect }: { from: number; history: HistoryRow[]; future: FutureDoc; drivers: Map<number, YearDrivers>; selected: number; onSelect: (y: number) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const pts = history.filter(r => !r.low_coverage && drivers.get(r.year)?.headwater_rain).map(r => ({ year: r.year, rain: drivers.get(r.year)!.headwater_rain!.value, water: r.water_km2 }));
  const known = future.projection.find(p => p.rain_known && p.rain_mm != null);
  const p26 = known ? { ...known, rain_mm: known.rain_mm as number } : undefined;
  const xs = [...pts.map(p => p.rain), ...(p26 ? [p26.rain_mm] : [])];
  const x0 = Math.floor((Math.min(...xs) - 30) / 100) * 100, x1 = Math.ceil((Math.max(...xs) + 30) / 100) * 100;
  const top = niceMax(Math.max(...pts.map(p => p.water), p26?.p90_km2 ?? 0) * 1.06);
  const x = (v: number) => M.l + (v - x0) / (x1 - x0) * (W - M.l - M.r);
  const y = (v: number) => H - M.b - v / top * (H - M.t - M.b);
  const n = pts.length, mx = pts.reduce((s, p) => s + p.rain, 0) / n, my = pts.reduce((s, p) => s + p.water, 0) / n;
  const sxy = pts.reduce((s, p) => s + (p.rain - mx) * (p.water - my), 0), sxx = pts.reduce((s, p) => s + (p.rain - mx) ** 2, 0), syy = pts.reduce((s, p) => s + (p.water - my) ** 2, 0);
  const slope = sxy / sxx, icpt = my - slope * mx, r = sxy / Math.sqrt(sxx * syy);
  const h = hover !== null ? pts.find(p => p.year === hover) : null;
  const label = new Set([2019, 1989, 2004, 2014, 2021]);
  return <figure className="g-figure">
    <Legend items={[{ label: 'One well-observed year (Landsat)', kind: 'dot', color: C.water }, { label: `Straight-line fit · r = ${r.toFixed(2)}`, kind: 'line', color: C.muted }, ...(p26 ? [{ label: '2026 · rain known, water projected', kind: 'hollow' as const, color: C.water }] : [])]} />
    <div className="g-plot">
      <svg viewBox={`0 0 ${W} ${H}`} className="g-svg" role="img" aria-label={`Rain in the Angolan highlands (November to April) against yearly open water, ${n} well-observed years, correlation ${r.toFixed(2)}.`}>
        {ticks(top).map(t => <g key={t}><line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke={C.grid} /><text x={M.l - 10} y={y(t) + 4} textAnchor="end" className="g-tick">{t.toLocaleString('en')}</text></g>)}
        <text x={M.l} y={16} className="g-axis-title">OPEN WATER · km²</text>
        {Array.from({ length: Math.round((x1 - x0) / 100) + 1 }, (_, i) => x0 + i * 100).map(v => <text key={v} x={x(v)} y={H - M.b + 22} textAnchor="middle" className="g-tick">{v}</text>)}
        <text x={W - M.r} y={H - 4} textAnchor="end" className="g-axis-title">RAIN IN THE ANGOLAN HIGHLANDS, NOV–APR · mm</text>
        <line x1={x(x0)} x2={x(x1)} y1={y(Math.max(0, icpt + slope * x0))} y2={y(icpt + slope * x1)} stroke={C.muted} strokeOpacity=".6" strokeWidth="1.5" />
        {p26 && <g><line x1={x(p26.rain_mm)} x2={x(p26.rain_mm)} y1={y(p26.p10_km2)} y2={y(p26.p90_km2)} stroke={C.water} strokeWidth="2" strokeOpacity=".6" /><circle cx={x(p26.rain_mm)} cy={y(p26.p50_km2)} r="6" fill={C.surface} stroke={C.water} strokeWidth="2" /><text x={x(p26.rain_mm) - 12} y={y(p26.p50_km2) + 4} textAnchor="end" className="g-label">2026 · {km(p26.p50_km2)} projected</text></g>}
        {pts.map(p => { const on = p.year >= from; return <g key={p.year} opacity={on ? 1 : .25}><circle cx={x(p.rain)} cy={y(p.water)} r={p.year === selected || p.year === hover ? 6.5 : 4.5} fill={C.water} stroke={C.surface} strokeWidth="2" />{label.has(p.year) && on && <text x={x(p.rain)} y={y(p.water) - 11} textAnchor="middle" className="g-label">{p.year}</text>}<circle cx={x(p.rain)} cy={y(p.water)} r="13" fill="transparent" tabIndex={0} role="button" aria-label={`${p.year}: ${Math.round(p.rain)} mm of rain, ${km(p.water)} km² of open water`} onPointerEnter={() => setHover(p.year)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(p.year)} onBlur={() => setHover(null)} onClick={() => onSelect(p.year)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(p.year); } }} style={{ cursor: 'pointer' }} /></g>; })}
      </svg>
      {h && <Tip x={x(h.rain)}><b>{h.year}</b><p><strong>{Math.round(h.rain)} mm</strong> rain, Nov–Apr</p><p><i style={{ background: C.water }} /><strong>{km(h.water)} km²</strong> open water</p><p>{h.water >= icpt + slope * h.rain ? 'More' : 'Less'} water than the line expects: {km(Math.abs(h.water - (icpt + slope * h.rain)))} km²</p></Tip>}
    </div>
    <figcaption>Rain falls in Angola from November to April and reaches the Delta months later, so it is known before the flood arrives. It explains about {Math.round(r * r * 100)}% of the year-to-year change. Years before {from} are dimmed.</figcaption>
  </figure>;
}

/* ------------------------------------------------------------ side panel */
function YearDetail({ source, year, history, future, drivers, feed }: { source: Source; year: number; history: HistoryRow[]; future: FutureDoc | null; drivers: Map<number, YearDrivers>; feed: Feed | null }) {
  if (source === 'nisar') {
    const rows = feed?.observations.filter(r => !inGap(r.date, feed.meta.gaps)) ?? [];
    const first = rows[0], lastRow = rows.at(-1);
    return <aside className="g-detail"><div className="eyebrow">NISAR · 2026</div><h3>One season, every 12 days.</h3>
      {first && lastRow ? <><p>{rows.length} radar passes from {formatDate(first.date)} to {formatDate(lastRow.date, true)}, all from one orbit track, so changes are real changes on the ground.</p><dl><div><dt>Open water, first pass</dt><dd>{formatArea(first.open_water_km2)} km²</dd></div><div><dt>Open water, last pass</dt><dd>{formatArea(lastRow.open_water_km2)} km²</dd></div></dl></> : <p>Loading…</p>}
      <p className="g-detail-note">NISAR and Landsat measure different things, so their km² are never added or compared directly.</p></aside>;
  }
  const o = history.find(r => r.year === year), p = future?.projection.find(q => q.year === year), d = drivers.get(year), mean = future?.climatology.mean_km2;
  const vs = (v: number) => mean ? `${v >= mean ? '+' : '−'}${Math.round(Math.abs(v / mean - 1) * 100)}% vs average` : '';
  return <aside className="g-detail" aria-live="polite">
    <div className="eyebrow">{p ? 'PROJECTION' : 'MEASURED · LANDSAT'}</div>
    <h3>{year}</h3>
    {p ? <>
      <div className="g-big"><strong>{km(p.p50_km2)}</strong><span>km² open water, median</span></div>
      <dl>
        <div><dt>80% range</dt><dd>{km(p.p10_km2)}–{km(p.p90_km2)} km²</dd></div>
        <div><dt>Rain in Angola</dt><dd>{p.rain_known ? `known · ${p.rain_mm} mm` : 'not fallen yet'}</dd></div>
        <div><dt>Chance of a 2019-like year (&lt; 376 km²)</dt><dd>{pct(chanceBelow(p, 376))}</dd></div>
        {mean && <div><dt>Chance of an above-average year</dt><dd>{pct(1 - chanceBelow(p, mean))}</dd></div>}
      </dl>
      <p className="g-detail-note">{p.rain_known ? 'This year’s rain has already fallen, so the range is narrower.' : 'Its rain has not fallen yet, so the model uses the rain of the past 41 years and the range is wide.'} See the map in <a href="#future">Future</a>.</p>
    </> : o ? <>
      <div className="g-big"><strong>{km(o.water_km2)}</strong><span>km² open water{o.low_coverage ? ' · lower bound' : ''}</span></div>
      <dl>
        {!o.low_coverage && mean && <div><dt>Compared with average</dt><dd>{vs(o.water_km2)}</dd></div>}
        {future?.hindcast.find(h => h.year === year) && <div><dt>Model, year left out</dt><dd>{km(future.hindcast.find(h => h.year === year)!.predicted_km2)} km²</dd></div>}
        {d?.headwater_rain?.pct !== undefined && <div><dt>Rain in Angola</dt><dd>{d.headwater_rain.pct > 0 ? '+' : ''}{d.headwater_rain.pct}% vs normal</dd></div>}
        {d?.inflow?.rank && <div><dt>River inflow (model)</dt><dd>rank {d.inflow.rank} of {d.inflow.of}</dd></div>}
        {d?.enso && <div><dt>Pacific (ONI)</dt><dd>{d.enso.value > 0 ? '+' : ''}{d.enso.value.toFixed(1)}</dd></div>}
        {d?.heat && <div><dt>Flood-season heat</dt><dd>{d.heat.value > 0 ? '+' : ''}{d.heat.value.toFixed(1)} °C</dd></div>}
      </dl>
      {o.low_coverage && <p className="g-detail-note">Few clear Landsat images this year: the real flood was probably larger.</p>}
    </> : <p>No Landsat water map for {year}.{year === 1988 ? ' A gap in the record is not a dry year.' : ''}</p>}
  </aside>;
}
