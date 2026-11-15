'use client';
import { useMemo, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { climateAt, DEFAULT_OPTIONS, fit, km, mean, pctText, project, sdgAt, selected, series, usable, validate, type Place, type ProjectionYear, type Selection, type World } from '@/lib/world';
import { sectionNumber } from '@/lib/sections';
import PlacePicker from './PlacePicker';

/*
  06 · Graphics: the world record as numbers to 2030. One row of controls
  scopes every chart: the place (world, continent, country, two countries),
  the data source and the years. Solid = measured, dashed = the RSynthesis
  world engine's projection inside its 80% and 95% ranges.
  Colours as before (dataviz-checked): water #2a94d4, second place #e0a24a,
  vegetation/seasonal #6ea83c, model #c4842a.
*/
const C = { water: '#2a94d4', b: '#e0a24a', veg: '#6ea83c', model: '#c4842a', grid: '#ffffff14', text: '#eef1e8', muted: '#93aa9d', surface: '#0b1c16', now: '#c9e6a0', sdg: '#b48ae6' };
type Source = 'water' | 'split' | 'rain' | 'check';
const LAST = 2030, W = 1000, H = 380, M = { l: 70, r: 30, t: 30, b: 42 };
const FUTURE = Array.from({ length: LAST - 2018 }, (_, i) => 2019 + i);
const nice = (v: number) => { const p = 10 ** Math.floor(Math.log10(Math.max(v, 1))), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; };
const tickList = (lo: number, hi: number, n = 5) => { const step = nice((hi - lo) / n); const out: number[] = []; for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(v); return out; };
const short = (v: number) => v >= 1e6 ? `${(v / 1e6).toFixed(v >= 1e7 ? 0 : 2)}M` : v >= 1e4 ? `${Math.round(v / 1e3)}k` : km(v);

function Legend({ items }: { items: { label: string; kind: 'line' | 'dash' | 'band' | 'dot' | 'hollow'; color: string; opacity?: number }[] }) {
  return <div className="g-legend">{items.map(i => <span key={i.label}><svg width="26" height="12" aria-hidden="true">{i.kind === 'band' ? <rect x="1" y="1" width="24" height="10" rx="2" fill={i.color} opacity={i.opacity ?? .2} /> : i.kind === 'dot' ? <circle cx="13" cy="6" r="4" fill={i.color} /> : i.kind === 'hollow' ? <circle cx="13" cy="6" r="3.5" fill="none" stroke={i.color} strokeWidth="1.6" /> : <line x1="1" x2="25" y1="6" y2="6" stroke={i.color} strokeWidth="2" strokeDasharray={i.kind === 'dash' ? '5 4' : undefined} strokeLinecap="round" />}</svg>{i.label}</span>)}</div>;
}
function Tip({ x, children }: { x: number; children: ReactNode }) { return <div className="g-tip" style={{ left: `${Math.min(78, Math.max(4, x / W * 100))}%` }} role="status">{children}</div>; }
const path = (pts: [number, number][]) => pts.map(([a, b], i) => `${i ? 'L' : 'M'}${a.toFixed(1)},${b.toFixed(1)}`).join('');

type Line = { place: Place; color: string; pts: { year: number; value: number; low: boolean }[]; proj: ProjectionYear[]; avg: number };

function TimeChart({ lines, from, relative, selectedYear, onSelect }: { lines: Line[]; from: number; relative: boolean; selectedYear: number; onSelect: (y: number) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const scale = (l: Line, v: number) => relative ? v / l.avg * 100 : v;
  const all = lines.flatMap(l => [...l.pts.filter(p => p.year >= from).map(p => scale(l, p.value)), ...l.proj.flatMap(p => [scale(l, p.p025), scale(l, p.p975)])]);
  const lo0 = Math.min(...all), hi0 = Math.max(...all), pad = (hi0 - lo0) * .08 || hi0 * .05;
  const ticks = tickList(Math.max(0, lo0 - pad), hi0 + pad), lo = ticks[0], hi = ticks.at(-1)!;
  const x = (y: number) => M.l + (y - from) / (LAST - from) * (W - M.l - M.r), y = (v: number) => H - M.b - (v - lo) / (hi - lo || 1) * (H - M.t - M.b);
  const nowX = x(2018.5);
  const move = (e: ReactPointerEvent<SVGRectElement>) => { const r = e.currentTarget.ownerSVGElement!.getBoundingClientRect(); const yr = Math.round(from + ((e.clientX - r.left) / r.width * W - M.l) / (W - M.l - M.r) * (LAST - from)); setHover(Math.max(from, Math.min(LAST, yr))); };
  return <div className="g-plot">
    <svg viewBox={`0 0 ${W} ${H}`} className="g-svg" role="img" aria-label={`Yearly surface water${relative ? ' as % of each place’s average' : ''}, ${from} to ${LAST}, for ${lines.map(l => l.place.name).join(' and ')}. Measured to 2018, projected after.`}>
      <rect x={nowX} y={M.t} width={W - M.r - nowX} height={H - M.t - M.b} fill={C.now} opacity=".045" />
      {ticks.map(t => <g key={t}><line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke={C.grid} /><text x={M.l - 10} y={y(t) + 4} textAnchor="end" className="g-tick">{relative ? `${Math.round(t)}%` : short(t)}</text></g>)}
      <text x={M.l} y={16} className="g-axis-title">{relative ? 'SURFACE WATER · % OF OWN AVERAGE' : 'SURFACE WATER · km²'}</text>
      {Array.from({ length: LAST - from + 1 }, (_, i) => from + i).filter(t => t % (LAST - from > 30 ? 5 : 2) === 0).map(t => <text key={t} x={x(t)} y={H - M.b + 22} textAnchor="middle" className="g-tick">{t}</text>)}
      <line x1={nowX} x2={nowX} y1={M.t - 8} y2={H - M.b} stroke={C.now} strokeOpacity=".7" />
      <text x={nowX + 8} y={M.t + 6} className="g-future">FUTURE →</text><text x={nowX - 8} y={M.t + 6} textAnchor="end" className="g-note">MEASURED ←</text>
      {lines.map(l => { const anchor = l.pts.filter(p => !p.low).at(-1); const a: [number, number][] = anchor ? [[x(anchor.year), y(scale(l, anchor.value))]] : [];
        const band = (lo: keyof ProjectionYear, hi: keyof ProjectionYear) => path([...a, ...l.proj.map(p => [x(p.year), y(scale(l, p[hi] as number))] as [number, number]), ...l.proj.map(p => [x(p.year), y(scale(l, p[lo] as number))] as [number, number]).reverse(), ...a]) + 'Z';
        const good = l.pts.filter(p => p.year >= from && !p.low);
        const runs: typeof good[] = []; for (const p of good) { const r = runs.at(-1); if (r && r.at(-1)!.year === p.year - 1) r.push(p); else runs.push([p]); }
        return <g key={l.place.key}>
          {l.proj.length > 0 && <><path d={band('p025', 'p975')} fill={l.color} opacity=".1" /><path d={band('p10', 'p90')} fill={l.color} opacity=".2" /><path d={path([...a, ...l.proj.map(p => [x(p.year), y(scale(l, p.p50))] as [number, number])])} fill="none" stroke={l.color} strokeWidth="2" strokeDasharray="6 5" /></>}
          {runs.map(r => r.length > 1 && <path key={r[0].year} d={path(r.map(p => [x(p.year), y(scale(l, p.value))]))} fill="none" stroke={l.color} strokeWidth="2" strokeLinejoin="round" />)}
          {l.pts.filter(p => p.year >= from).map(p => p.low ? <circle key={p.year} cx={x(p.year)} cy={y(scale(l, p.value))} r="3.4" fill={C.surface} stroke={l.color} strokeWidth="1.5" /> : <circle key={p.year} cx={x(p.year)} cy={y(scale(l, p.value))} r={p.year === selectedYear ? 6 : 3.6} fill={l.color} stroke={C.surface} strokeWidth="1.6" />)}
          {l.proj.map(p => <circle key={p.year} cx={x(p.year)} cy={y(scale(l, p.p50))} r={p.year === selectedYear ? 6 : 3.6} fill={C.surface} stroke={l.color} strokeWidth="1.8" />)}
        </g>; })}
      {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={H - M.b} stroke={C.text} strokeOpacity=".4" />}
      <rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} fill="transparent" style={{ cursor: 'crosshair' }} onPointerMove={move} onPointerLeave={() => setHover(null)} onClick={() => hover !== null && onSelect(hover)} />
    </svg>
    {hover !== null && <Tip x={x(hover)}><b>{hover}{hover > 2018 ? ' · projection' : ''}</b>{lines.map(l => { const o = l.pts.find(p => p.year === hover), p = l.proj.find(q => q.year === hover); return <p key={l.place.key}><i style={{ background: l.color }} /><strong>{o ? `${km(o.value)} km²` : p ? `${km(p.p50)} km²` : '—'}</strong> {o ? (o.low ? 'measured, lower bound' : 'measured') : p ? `median · 80%: ${km(p.p10)}–${km(p.p90)}` : 'no value'} · {l.place.name}</p>; })}</Tip>}
  </div>;
}

function SplitChart({ place, world, from }: { place: Place; world: World; from: number }) {
  const pts = series(place, world.years).filter(p => p.year >= from && p.permanent !== null && !p.low);
  if (pts.length < 2) return <div className="chart-wait">Too few well-observed years.</div>;
  const hi = tickList(0, Math.max(...pts.map(p => p.permanent! + p.seasonal!)) * 1.05), top = hi.at(-1)!;
  const x = (y: number) => M.l + (y - from) / (2018 - from) * (W - M.l - M.r), y = (v: number) => H - M.b - v / top * (H - M.t - M.b);
  const area = (f: (p: typeof pts[0]) => number, g: (p: typeof pts[0]) => number) => path([...pts.map(p => [x(p.year), y(f(p))] as [number, number]), ...[...pts].reverse().map(p => [x(p.year), y(g(p))] as [number, number])]) + 'Z';
  return <div className="g-plot"><svg viewBox={`0 0 ${W} ${H}`} className="g-svg" role="img" aria-label={`Permanent and seasonal surface water in ${place.name}, well-observed years from ${from} to 2018.`}>
    {hi.map(t => <g key={t}><line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke={C.grid} /><text x={M.l - 10} y={y(t) + 4} textAnchor="end" className="g-tick">{short(t)}</text></g>)}
    <text x={M.l} y={16} className="g-axis-title">SURFACE WATER · km² · STACKED</text>
    {pts.filter(p => p.year % 5 === 0).map(p => <text key={p.year} x={x(p.year)} y={H - M.b + 22} textAnchor="middle" className="g-tick">{p.year}</text>)}
    <path d={area(p => p.permanent!, () => 0)} fill={C.water} opacity=".75" /><path d={area(p => p.permanent! + p.seasonal!, p => p.permanent!)} fill={C.veg} opacity=".7" />
  </svg></div>;
}

function RainChart({ place, world, from }: { place: Place; world: World; from: number }) {
  const pts = usable(series(place, world.years)).filter(p => p.year >= from).map(p => ({ year: p.year, rain: climateAt(world.doc, place.pr, p.year), water: p.value })).filter((p): p is { year: number; rain: number; water: number } => p.rain !== undefined);
  if (pts.length < 5) return <div className="chart-wait">No yearly rain record for {place.name} (small island or disputed area).</div>;
  const xs = pts.map(p => p.rain), ys = pts.map(p => p.water), mx = mean(xs), my = mean(ys);
  const sxy = pts.reduce((s, p) => s + (p.rain - mx) * (p.water - my), 0), sxx = xs.reduce((s, v) => s + (v - mx) ** 2, 0), syy = ys.reduce((s, v) => s + (v - my) ** 2, 0);
  const r = sxy / Math.sqrt(sxx * syy), slope = sxy / sxx, icpt = my - slope * mx;
  const xt = tickList(Math.min(...xs) * .97, Math.max(...xs) * 1.03), yt = tickList(Math.min(...ys) * .97, Math.max(...ys) * 1.03);
  const x = (v: number) => M.l + (v - xt[0]) / (xt.at(-1)! - xt[0]) * (W - M.l - M.r), y = (v: number) => H - M.b - (v - yt[0]) / (yt.at(-1)! - yt[0]) * (H - M.t - M.b);
  return <div className="g-plot"><svg viewBox={`0 0 ${W} ${H}`} className="g-svg" role="img" aria-label={`Yearly rain against yearly surface water in ${place.name}, ${pts.length} years, correlation ${r.toFixed(2)}.`}>
    {yt.map(t => <g key={t}><line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke={C.grid} /><text x={M.l - 10} y={y(t) + 4} textAnchor="end" className="g-tick">{short(t)}</text></g>)}
    {xt.map(t => <text key={t} x={x(t)} y={H - M.b + 22} textAnchor="middle" className="g-tick">{Math.round(t)}</text>)}
    <text x={M.l} y={16} className="g-axis-title">SURFACE WATER · km²</text><text x={W - M.r} y={H - 4} textAnchor="end" className="g-axis-title">YEARLY RAIN (ERA5) · mm</text>
    <line x1={x(xt[0])} x2={x(xt.at(-1)!)} y1={y(icpt + slope * xt[0])} y2={y(icpt + slope * xt.at(-1)!)} stroke={C.muted} strokeOpacity=".6" strokeWidth="1.5" />
    {pts.map(p => <g key={p.year}><circle cx={x(p.rain)} cy={y(p.water)} r="5" fill={C.water} stroke={C.surface} strokeWidth="2"><title>{`${p.year}: ${Math.round(p.rain)} mm, ${km(p.water)} km²`}</title></circle>{(p.water === Math.max(...ys) || p.water === Math.min(...ys) || p.year === 2018) && <text x={x(p.rain)} y={y(p.water) - 10} textAnchor="middle" className="g-label">{p.year}</text>}</g>)}
    <text x={W - M.r - 4} y={M.t + 10} textAnchor="end" className="g-label">r = {r.toFixed(2)} · rain explains about {Math.round(Math.max(0, r) ** 2 * 100)}%</text>
  </svg></div>;
}

function CheckChart({ place, world, proj }: { place: Place; world: World; proj: ProjectionYear[] }) {
  const last = series(place, world.years).at(-1)?.value, s18 = sdgAt(world.doc, place.sdg, 2018);
  if (!last || !s18) return <div className="chart-wait">UNEP’s later release has no values for {place.name}.</div>;
  const jrc = series(place, world.years).filter(p => p.year >= 2000 && p.value && !p.low).map(p => ({ year: p.year, v: p.value! / last * 100 }));
  const sdg = world.doc.sdg_years.map(yr => ({ year: yr, v: (sdgAt(world.doc, place.sdg, yr) ?? NaN) / s18 * 100 })).filter(p => Number.isFinite(p.v));
  const pr = proj.filter(p => p.year <= 2024).map(p => ({ year: p.year, v: p.p50 / last * 100, lo: p.p10 / last * 100, hi: p.p90 / last * 100 }));
  const vals = [...jrc.map(p => p.v), ...sdg.map(p => p.v), ...pr.flatMap(p => [p.lo, p.hi])], t = tickList(Math.min(...vals) - 2, Math.max(...vals) + 2);
  const x = (yr: number) => M.l + (yr - 2000) / 24 * (W - M.l - M.r), y = (v: number) => H - M.b - (v - t[0]) / (t.at(-1)! - t[0]) * (H - M.t - M.b);
  return <div className="g-plot"><svg viewBox={`0 0 ${W} ${H}`} className="g-svg" role="img" aria-label={`Check after 2018 for ${place.name}: the JRC record, UNEP's later release and our projection, each as % of its own 2018 value.`}>
    {t.map(v => <g key={v}><line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke={C.grid} /><text x={M.l - 10} y={y(v) + 4} textAnchor="end" className="g-tick">{Math.round(v)}%</text></g>)}
    {[2000, 2005, 2010, 2015, 2018, 2020, 2024].map(v => <text key={v} x={x(v)} y={H - M.b + 22} textAnchor="middle" className="g-tick">{v}</text>)}
    <text x={M.l} y={16} className="g-axis-title">% OF EACH SOURCE’S OWN 2018 VALUE</text>
    <path d={path([[x(2018), y(100)], ...pr.map(p => [x(p.year), y(p.hi)] as [number, number]), ...[...pr].reverse().map(p => [x(p.year), y(p.lo)] as [number, number]), [x(2018), y(100)]]) + 'Z'} fill={C.water} opacity=".18" />
    <path d={path([[x(2018), y(100)], ...pr.map(p => [x(p.year), y(p.v)] as [number, number])])} fill="none" stroke={C.water} strokeWidth="2" strokeDasharray="6 5" />
    <path d={path(jrc.map(p => [x(p.year), y(p.v)]))} fill="none" stroke={C.water} strokeWidth="2" />
    <path d={path(sdg.map(p => [x(p.year), y(p.v)]))} fill="none" stroke={C.sdg} strokeWidth="2" />
    {sdg.filter(p => p.year > 2018).map(p => <circle key={p.year} cx={x(p.year)} cy={y(p.v)} r="4.5" fill={C.sdg} stroke={C.surface} strokeWidth="2" />)}
  </svg></div>;
}

export default function WorldGraphics({ world, selection, onSelect }: { world: World | null; selection: Selection; onSelect: (s: Selection) => void }) {
  const [source, setSource] = useState<Source>('water');
  const [from, setFrom] = useState(1984);
  const [year, setYear] = useState(2030);
  const places = world ? selected(world, selection) : [];
  const keys = places.map(p => p.key).join();
  const lines: Line[] = useMemo(() => !world ? [] : places.map((place, i) => {
    const f = fit(world, place, DEFAULT_OPTIONS), pts = series(place, world.years).filter((p): p is typeof p & { value: number } => p.value !== null && p.value > 0);
    return { place, color: i ? C.b : C.water, pts, proj: f.ok ? project(world, place, f, FUTURE) : [], avg: mean(usable(series(place, world.years)).map(p => p.value)) };
  }), [world, keys]); // eslint-disable-line react-hooks/exhaustive-deps
  const main = lines[0];
  const f = useMemo(() => world && main ? fit(world, main.place, DEFAULT_OPTIONS) : null, [world, main?.place.key]); // eslint-disable-line react-hooks/exhaustive-deps
  const v = useMemo(() => world && main && source === 'check' ? validate(world, main.place, DEFAULT_OPTIONS) : null, [world, main?.place.key, source]); // eslint-disable-line react-hooks/exhaustive-deps
  const good = main ? main.pts.filter(p => !p.low) : [];
  const hiY = good.reduce<typeof good[0] | null>((b, p) => (!b || p.value > b.value ? p : b), null), loY = good.reduce<typeof good[0] | null>((b, p) => (!b || p.value < b.value ? p : b), null);
  const p30 = main?.proj.at(-1);
  const sel = main?.proj.find(p => p.year === year), obs = main?.pts.find(p => p.year === year);

  return <section className="graphics-section" id="graphics" aria-labelledby="graphics-title"><div className="wrap">
    <div className="section-heading"><div><div className="eyebrow"><span className="section-number">{sectionNumber('graphics')}</span> GRAPHICS</div><h2 id="graphics-title">The world above,<br /><em>as numbers to 2030.</em></h2></div><p className="section-description">Pick a place, a source and a range of years. Solid = measured. Dashed = our projection, with its range of uncertainty.</p></div>
    {!world || !main ? <div className="chart-wait" role="status"><span className="loading-orbit" aria-hidden="true" />Loading the world record…</div> : <>
      <div className="kpi-row">
        <div className="kpi"><span><i style={{ background: C.water }} /> Most water · {main.place.name}</span><strong>{hiY ? short(hiY.value) : '—'}<small> km²</small></strong><em>{hiY?.year ?? '—'} · Landsat</em></div>
        <div className="kpi"><span>Least water (well observed)</span><strong>{loY ? short(loY.value) : '—'}<small> km²</small></strong><em>{loY?.year ?? '—'}</em></div>
        <div className="kpi"><span>Trend with the causes held equal</span><strong>{f?.trendPerDecade != null ? pctText(f.trendPerDecade, 1) : '—'}<small> / decade</small></strong><em>{f?.ok ? `trend weight ${Math.round(f.pip.trend * 100)}% · ${f.n} years` : f?.reason ?? ''}</em></div>
        <div className="kpi"><span>2030 · projection median</span><strong>{p30 ? short(p30.p50) : '—'}<small> km²</small></strong><em>{p30 ? `80%: ${short(p30.p10)}–${short(p30.p90)}` : 'not enough data'}</em></div>
      </div>
      <div className="graphics-controls" role="group" aria-label="Chart controls">
        <PlacePicker world={world} value={selection} onChange={onSelect} compact />
        <div className="seg" role="radiogroup" aria-label="Data source">{([['water', 'Surface water → 2030'], ['split', 'Permanent vs seasonal'], ['rain', 'Rain → water'], ['check', 'Check after 2018']] as const).map(([id, label]) => <button key={id} type="button" role="radio" aria-checked={source === id} className={source === id ? 'active' : ''} onClick={() => setSource(id)}>{label}</button>)}</div>
        {source !== 'check' && <div className="seg seg-small" role="radiogroup" aria-label="Years shown">{[[1984, '1984–2030'], [2000, '2000–2030 · well observed']].map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={from === v} className={from === v ? 'active' : ''} onClick={() => setFrom(v as number)}>{l}</button>)}</div>}
      </div>
      <div className="graphics-body">
        <div className="graphics-chart"><figure className="g-figure">
          {source === 'water' && <><Legend items={[...lines.map(l => ({ label: `${l.place.name}, measured`, kind: 'line' as const, color: l.color })), { label: 'Few clear images (lower bound)', kind: 'hollow', color: C.water }, { label: 'Projection · median', kind: 'dash', color: C.water }, { label: '80% / 95% range', kind: 'band', color: C.water, opacity: .25 }]} />
            <TimeChart lines={lines} from={from} relative={lines.length > 1} selectedYear={year} onSelect={setYear} />
            <figcaption>{lines.length > 1 ? 'Two places of very different size, so each is drawn as a % of its own 1984–2018 average. ' : ''}Click the chart to choose a year. Hollow dots: years when Landsat saw too little of the place; they are lower bounds and stay out of the line and the engine.</figcaption></>}
          {source === 'split' && <><Legend items={[{ label: 'Permanent water (all year)', kind: 'band', color: C.water, opacity: .75 }, { label: 'Seasonal water (part of the year)', kind: 'band', color: C.veg, opacity: .7 }]} /><SplitChart place={main.place} world={world} from={from} /><figcaption>Seasonal water appears and disappears within a year: floodplains, wetlands, monsoon lakes. Permanent water is there in every clear look. {main.place.name}{lines.length > 1 ? ' (country A)' : ''}, well-observed years.</figcaption></>}
          {source === 'rain' && <><Legend items={[{ label: 'One well-observed year', kind: 'dot', color: C.water }, { label: 'Straight-line fit', kind: 'line', color: C.muted }]} /><RainChart place={main.place} world={world} from={from} /><figcaption>Each dot is one year: how much rain fell over {main.place.name} (ERA5) and how much surface water Landsat mapped. In some places rain drives the water; in others dams, ice or rivers from elsewhere matter more.</figcaption></>}
          {source === 'check' && <><Legend items={[{ label: 'JRC record (to 2018)', kind: 'line', color: C.water }, { label: 'Our projection from 2018 · 80% range', kind: 'dash', color: C.water }, { label: 'UNEP later release (lakes & rivers)', kind: 'line', color: C.sdg }]} /><CheckChart place={main.place} world={world} proj={main.proj} />
            <figcaption>An honest test after 2018: the engine never saw anything after 2018, and UNEP’s later release (2019–2022) is a different product (it leaves out reservoirs), so both are drawn as a change from their own 2018 value. {v?.sdg ? `${main.place.name}: UNEP shows ${pctText(v.sdg.observed, 1)} from 2018 to 2022; the engine expected ${pctText(v.sdg.predicted, 1)} (80%: ${pctText(v.sdg.p10)} to ${pctText(v.sdg.p90)}) — ${v.sdg.observed >= v.sdg.p10 && v.sdg.observed <= v.sdg.p90 ? 'inside its range' : 'outside its range'}.` : ''}</figcaption></>}
        </figure></div>
        <aside className="g-detail" aria-live="polite">
          <div className="eyebrow">{year > 2018 ? 'PROJECTION' : 'MEASURED · LANDSAT'}</div>
          <h3>{year} · {main.place.name}</h3>
          {sel ? <><div className="g-big"><strong>{short(sel.p50)}</strong><span>km² surface water, median</span></div>
            <dl><div><dt>80% range</dt><dd>{km(sel.p10)}–{km(sel.p90)} km²</dd></div><div><dt>Compared with the average</dt><dd>{pctText(sel.p50 / main.avg - 1)}</dd></div><div><dt>Causes this year</dt><dd>{sel.known === 'known' ? 'all measured already' : sel.known === 'partly' ? 'partly measured' : 'not happened yet: drawn from past years'}</dd></div></dl>
            <p className="g-detail-note">See the chances and the engine’s options in <a href="#future">Future</a>.</p></>
            : obs ? <><div className="g-big"><strong>{short(obs.value)}</strong><span>km² surface water{obs.low ? ' · lower bound' : ''}</span></div><dl><div><dt>Compared with the average</dt><dd>{obs.low ? '—' : pctText(obs.value / main.avg - 1)}</dd></div></dl></>
            : <p>No value for {year}.</p>}
          <div className="seg seg-small g-years" role="radiogroup" aria-label="Year">{[2000, 2010, 2018, 2022, 2026, 2030].map(y => <button key={y} type="button" role="radio" aria-checked={year === y} className={year === y ? 'active' : ''} onClick={() => setYear(y)}>{y}</button>)}</div>
        </aside>
      </div>
    </>}
  </div></section>;
}
