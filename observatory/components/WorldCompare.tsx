'use client';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Map as MLMap } from 'maplibre-gl';
import { createWorldMap, setSelected, showView, STEPS, LANDSAT_YEARS, VIEW, type ViewId } from '@/lib/gibs';
import { km, placeBounds, rainAnomaly, selected, series, type Selection, type World } from '@/lib/world';
import { sectionNumber } from '@/lib/sections';
import PlacePicker from './PlacePicker';

/*
  04 · Compare: the same place at two moments, anywhere on Earth. Two MapLibre
  maps share one camera; the top one is cut at the divider. Sources: Landsat
  years (1984-2021), NISAR radar or radar water for two 12-day cycles.
*/
const SOURCES: { id: ViewId; label: string }[] = [{ id: 'landsat', label: 'Landsat history (1984–2021)' }, { id: 'nisar', label: 'NISAR radar 2025–2026' }, { id: 's1water', label: 'Radar water 2025–2026' }];
const fmt = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export default function WorldCompare({ world, selection, onSelect }: { world: World | null; selection: Selection; onSelect: (s: Selection) => void }) {
  const leftHost = useRef<HTMLDivElement>(null), rightHost = useRef<HTMLDivElement>(null), frame = useRef<HTMLDivElement>(null);
  const maps = useRef<MLMap[]>([]);
  const [ready, setReady] = useState(0), [failed, setFailed] = useState(false);
  const [source, setSource] = useState<ViewId>('landsat');
  const [a, setA] = useState('2000'), [b, setB] = useState('2018');
  const [split, setSplit] = useState(50);
  const view = VIEW[source];

  useEffect(() => {
    if (!leftHost.current || !rightHost.current) return;
    const l = createWorldMap(leftHost.current, { center: [20, 8], zoom: 1.3 }), r = createWorldMap(rightHost.current, { center: [20, 8], zoom: 1.3 });
    if (!l || !r) { setFailed(true); return; }
    maps.current = [l, r];
    let syncing = false;
    const sync = (from: MLMap, to: MLMap) => () => { if (syncing) return; syncing = true; to.jumpTo({ center: from.getCenter(), zoom: from.getZoom(), bearing: from.getBearing(), pitch: from.getPitch() }); syncing = false; };
    l.on('move', sync(l, r)); r.on('move', sync(r, l));
    l.on('load', () => setReady(n => n + 1)); r.on('load', () => setReady(n => n + 1));
    const resize = new ResizeObserver(() => { l.resize(); r.resize(); }); resize.observe(leftHost.current);
    return () => { resize.disconnect(); l.remove(); r.remove(); maps.current = []; };
  }, []);

  const both = ready >= 2;
  useEffect(() => { if (!both) return; const [l, r] = maps.current; showView(l, view, view.kind === 'year' ? +a : a, .95); showView(r, view, view.kind === 'year' ? +b : b, .95); }, [both, view, a, b]);
  const place = world ? selected(world, selection)[0] : null;
  useEffect(() => {
    if (!both || !place) return;
    for (const m of maps.current) setSelected(m, (place.geometry as GeoJSON.Geometry) ?? null);
    maps.current[1].fitBounds(placeBounds(place), { padding: 50, maxZoom: 7, duration: 900 });
  }, [both, place?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const chooseSource = (id: ViewId) => {
    setSource(id);
    if (id === 'landsat') { setA('2000'); setB('2018'); } else { setA(STEPS[STEPS.length - 13]); setB(STEPS[STEPS.length - 1]); }
  };
  const drag = (e: ReactPointerEvent) => {
    const el = frame.current; if (!el) return;
    const move = (x: number) => { const r = el.getBoundingClientRect(); setSplit(Math.max(3, Math.min(97, (x - r.left) / r.width * 100))); };
    (e.target as Element).setPointerCapture(e.pointerId); move(e.clientX);
    const onMove = (ev: PointerEvent) => move(ev.clientX), up = () => { removeEventListener('pointermove', onMove); removeEventListener('pointerup', up); };
    addEventListener('pointermove', onMove); addEventListener('pointerup', up);
  };
  const options = view.kind === 'year' ? LANDSAT_YEARS.map(y => <option key={y} value={y}>{y}{y > 2018 ? ' · map only' : ''}</option>) : STEPS.map(d => <option key={d} value={d}>{fmt(d)}</option>);
  const yA = view.kind === 'year' ? +a : +a.slice(0, 4), yB = view.kind === 'year' ? +b : +b.slice(0, 4);
  const pA = place && world && yA <= 2018 ? series(place, world.years)[world.years.indexOf(yA)] : null, pB = place && world && yB <= 2018 ? series(place, world.years)[world.years.indexOf(yB)] : null;
  const diff = pA?.value != null && pB?.value != null ? pB.value - pA.value : null;
  const rA = place && world ? rainAnomaly(world.doc, place, Math.min(2025, yA)) : undefined, rB = place && world ? rainAnomaly(world.doc, place, Math.min(2025, yB)) : undefined;

  return <section className="compare-section wrap" id="compare" aria-labelledby="compare-title">
    <div className="section-heading"><div><div className="eyebrow"><span className="section-number">{sectionNumber('compare')}</span> COMPARE</div><h2 id="compare-title">Same place.<br /><em>A shifting story.</em></h2></div><p className="section-description">Any place on Earth at two moments, geographically aligned.<br />Drag the divider to follow the change.</p></div>
    <div className="comparison-workspace">
      <div className="wc-top">
        <div className="compare-source-switch" role="group" aria-label="Comparison source">{SOURCES.map(s => <button key={s.id} aria-pressed={source === s.id} className={source === s.id ? 'active' : ''} onClick={() => chooseSource(s.id)}>{s.label}</button>)}</div>
        {world && <PlacePicker world={world} value={selection.mode === 'compare' ? { ...selection, mode: 'country' } : selection} onChange={onSelect} allowCompare={false} compact />}
      </div>
      <div className="compare-selects"><label><span className="compare-letter">A</span><span>{view.kind === 'year' ? 'First year' : 'First 12-day cycle'}</span><select aria-label="First moment" value={a} onChange={e => setA(e.target.value)}>{options}</select></label><div className="compare-link">↔</div><label><span className="compare-letter">B</span><span>{view.kind === 'year' ? 'Second year' : 'Second 12-day cycle'}</span><select aria-label="Second moment" value={b} onChange={e => setB(e.target.value)}>{options}</select></label></div>
      <div className="wc-frame" ref={frame}>
        <div ref={rightHost} className="wc-map" aria-label={`Map B: ${view.label}, ${b}`} role="region" />
        <div ref={leftHost} className="wc-map wc-top-map" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }} aria-label={`Map A: ${view.label}, ${a}`} role="region" />
        {(!both || failed) && <div className="map-skeleton wr-skeleton">{failed ? 'This device cannot draw the 3D map (WebGL2 missing).' : 'Preparing both maps…'}</div>}
        <div className="compare-date left"><span>A</span><strong>{view.kind === 'year' ? a : fmt(a)}</strong></div>
        <div className="compare-date right"><span>B</span><strong>{view.kind === 'year' ? b : fmt(b)}</strong></div>
        <div className="swipe-line" style={{ left: `${split}%` }}><button type="button" className="swipe-handle" aria-label="Drag to compare" onPointerDown={drag}><span />⇆<span /></button></div>
        <label className="swipe-accessible">Divider <input type="range" min="3" max="97" value={Math.round(split)} onChange={e => setSplit(+e.target.value)} /></label>
      </div>
      <div className="comparison-summary"><span>CHANGE FROM A TO B · {place?.name.toUpperCase()}</span>
        <div><i className="water-key" /> Surface water (Landsat, yearly) <strong>{diff === null ? (yA > 2018 || yB > 2018 ? 'country totals end in 2018' : '—') : `${diff >= 0 ? '+' : '−'}${km(Math.abs(diff))} km²`}</strong></div>
        <div>Rain {Math.min(2025, yA)} → {Math.min(2025, yB)} <strong>{rA === undefined || rB === undefined ? '—' : `${rA >= 0 ? '+' : '−'}${Math.abs(rA)}% → ${rB >= 0 ? '+' : '−'}${Math.abs(rB)}% vs normal`}</strong></div>
        <small>{pA?.low || pB?.low ? 'One of the years had few clear Landsat images: its value is a lower bound.' : view.kind === 'year' ? 'JRC yearly classification · EC JRC / UNEP country totals' : 'NASA GIBS · each map stacks the 12 days of one NISAR cycle'}</small></div>
    </div>
  </section>;
}
