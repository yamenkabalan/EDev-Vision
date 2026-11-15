'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Map as MLMap } from 'maplibre-gl';
import { contains } from '@/lib/countryGeometry';
import { createWorldMap, setSelected, showView, stepsFor, LANDSAT_YEARS, VIEW, VIEWS, daysFor, type ViewId } from '@/lib/gibs';
import { climateAt, km, oniAt, pctText, placeBounds, rainAnomaly, selected, series, usable, mean, type Selection, type World } from '@/lib/world';
import { sectionNumber } from '@/lib/sections';
import PlacePicker from './PlacePicker';

/*
  03 · All-in-one radar, now for the whole Earth: one MapLibre globe, seven
  live views (NISAR radar, OPERA radar water, OPERA optical water, VIIRS
  floods, IMERG rain, VIIRS photo, JRC Landsat years), a 12-day NISAR
  timeline with play, and the chosen place's yearly record beside the map.
*/
const fmtDate = (d: string, year = false) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}), timeZone: 'UTC' });

export default function WorldRadar({ world, selection, onSelect }: { world: World | null; selection: Selection; onSelect: (s: Selection) => void }) {
  const host = useRef<HTMLDivElement>(null), map = useRef<MLMap | null>(null);
  const [ready, setReady] = useState(false), [failed, setFailed] = useState(false), [loading, setLoading] = useState(false);
  const [viewId, setViewId] = useState<ViewId>('s1water'), [step, setStep] = useState(999), [year, setYear] = useState(2021), [opacity, setOpacity] = useState(.95), [playing, setPlaying] = useState(false);
  const view = VIEW[viewId];
  const steps = useMemo(() => stepsFor(view), [view]);
  const stepIdx = Math.min(step, steps.length - 1), date = steps[stepIdx];
  // When the layer changes, jump the timeline to that layer's most recent step.
  useEffect(() => { setStep(steps.length - 1); }, [viewId]); // eslint-disable-line react-hooks/exhaustive-deps
  // Keep the selected step in view on the (sometimes long) timeline strip.
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => { const sc = strip.current, el = sc?.querySelector<HTMLElement>('.strip-date.selected'); if (sc && el && sc.scrollWidth > sc.clientWidth) sc.scrollLeft = el.offsetLeft - sc.clientWidth / 2; }, [stepIdx, viewId, year]);
  const worldRef = useRef(world); worldRef.current = world;
  const selRef = useRef(selection); selRef.current = selection;
  const onSelectRef = useRef(onSelect); onSelectRef.current = onSelect;

  useEffect(() => {
    if (!host.current) return;
    const m = createWorldMap(host.current, { center: [20, 8], zoom: 1.3 });
    if (!m) { setFailed(true); return; }
    map.current = m;
    m.on('load', () => setReady(true));
    m.on('dataloading', e => { if ('sourceId' in e && (e.sourceId as string).match(/^v\d|landsat/)) setLoading(true); });
    m.on('idle', () => setLoading(false));
    m.on('click', e => {
      const w = worldRef.current; if (!w) return;
      const hit = w.countries.find(c => c.geometry && contains(c.geometry, e.lngLat.lng, e.lngLat.lat));
      if (hit) onSelectRef.current({ ...selRef.current, mode: selRef.current.mode === 'compare' ? 'compare' : 'country', a: hit.key });
    });
    const resize = new ResizeObserver(() => m.resize()); resize.observe(host.current);
    return () => { resize.disconnect(); m.remove(); map.current = null; };
  }, []);

  useEffect(() => { if (ready && map.current) showView(map.current, view, view.kind === 'year' ? year : date, opacity); }, [ready, view, date, year, opacity]);

  const place = world ? selected(world, selection)[0] : null;
  useEffect(() => {
    const m = map.current; if (!m || !ready || !place) return;
    setSelected(m, (place.geometry as GeoJSON.Geometry) ?? null);
    const mobile = window.matchMedia('(max-width: 700px)').matches;
    m.fitBounds(placeBounds(place), { padding: mobile ? 30 : 60, maxZoom: 7, duration: 1000 });
  }, [place?.key, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Play: one 12-day step (or one year) every 2.6 s, so the tiles have time to arrive.
  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => { if (view.kind === 'year') setYear(y => (y >= 2021 ? 1984 : y + 1)); else setStep(s => (Math.min(s, steps.length - 1) + 1) % steps.length); }, 2600);
    return () => clearTimeout(id);
  }, [playing, step, year, view.kind, steps.length]);

  const days = view.kind === 'date' ? daysFor(view, date) : [];
  const yearOfDate = view.kind === 'year' ? year : Number(date.slice(0, 4));
  const pts = place && world ? usable(series(place, world.years)) : [];
  const last = pts.at(-1), early = pts.filter(p => p.year >= 2000 && p.year <= 2002);
  const change = last && early.length ? last.value / mean(early.map(p => p.value)) - 1 : null;
  const rain = place && world ? rainAnomaly(world.doc, place, Math.min(2025, yearOfDate)) : undefined;
  const heat = place && world ? climateAt(world.doc, place.ta, Math.min(2025, yearOfDate)) : undefined;
  const oni = world?.doc.oni.latest;
  const landsatHere = place && world && view.kind === 'year' && year <= 2018 ? series(place, world.years)[world.years.indexOf(year)] : null;

  return <section className="observatory-section world-radar" id="observatory" aria-labelledby="radar-title"><div className="wrap">
    <div className="section-heading"><div><div className="eyebrow"><span className="section-number">{sectionNumber('observatory')}</span> ALL-IN-ONE RADAR · THE WHOLE EARTH</div><h2 id="radar-title">Seven views of the Earth.<br /><em>One map.</em></h2><p className="section-description observatory-lede">From the whole planet to any wetland: NASA–ISRO NISAR radar and six more NASA and JRC views of water, each across its own record — NISAR 12-day cycles since 2025, radar and optical water, floods, daily rain back to 2000 and JRC years from 1984.</p></div><div className="feed-badge connected" role="status"><span />7 live layers · NASA GIBS + JRC</div></div>
    <div className="observatory-workspace">
      <div className="wr-layers" role="radiogroup" aria-label="Map layer">
        {VIEWS.map((v, i) => <button key={v.id} type="button" role="radio" aria-checked={viewId === v.id} className={viewId === v.id ? 'active' : ''} onClick={() => { setPlaying(false); setViewId(v.id); }}><span>{String(i + 1).padStart(2, '0')}</span><strong>{v.label}</strong><small>{v.best.replace('Best for ', '')}</small></button>)}
      </div>
      <div className="map-and-stats v2-map-row">
        <div className="main-map-container wr-map-wrap">
          <div ref={host} className="wr-map" role="region" aria-label={`${view.label} map of the Earth. Drag to rotate, scroll to zoom, click a country to select it.`} />
          {(!ready || failed) && <div className="map-skeleton wr-skeleton">{failed ? 'This device cannot draw the 3D map (WebGL2 missing).' : 'Preparing the Earth…'}</div>}
          <button className="map-play" aria-pressed={playing} onClick={() => setPlaying(p => !p)}>{playing ? 'Ⅱ Pause' : '▷ Play'}</button>
          <div className="wr-when"><b>{view.label}</b><span>{view.kind === 'year' ? `Landsat year ${year}` : days.length > 1 ? `${fmtDate(days[0])} – ${fmtDate(days.at(-1)!, true)} · ${days.length} days stacked` : days.length ? fmtDate(days[0], true) : 'No data for this date'}{loading ? ' · loading' : ''}</span></div>
        </div>
        <aside className="observation-stats v2-stats wr-stats">
          {world ? <PlacePicker world={world} value={selection.mode === 'compare' ? { ...selection, mode: 'country' } : selection} onChange={onSelect} allowCompare={false} compact /> : <p className="stats-note">Loading the world record…</p>}
          {place && <>
            <h3 className="wr-place">{place.name}</h3>
            {view.kind === 'year' && <div className="metric water"><span><i />Landsat water, {year}</span><strong>{landsatHere?.value ? km(landsatHere.value) : '—'}</strong><small>{year > 2018 ? 'country totals end in 2018 · map continues to 2021' : landsatHere?.low ? 'km² · lower bound: few clear images' : 'km² permanent + seasonal'}</small></div>}
            {view.kind === 'date' && <div className="metric water"><span><i />Surface water, {last?.year ?? '—'}</span><strong>{last ? km(last.value) : '—'}</strong><small>km² · latest well-observed Landsat year</small></div>}
            <dl className="wr-facts">
              <div><dt>Since 2000–02</dt><dd>{pctText(change, 1)}</dd></div>
              <div><dt>Rain in {Math.min(2025, yearOfDate)}</dt><dd>{rain === undefined ? '—' : rain === 0 ? 'normal' : `${rain > 0 ? '+' : '−'}${Math.abs(rain)}% vs normal`}</dd></div>
              <div><dt>Heat in {Math.min(2025, yearOfDate)}</dt><dd>{heat === undefined ? '—' : `${heat > 0 ? '+' : '−'}${Math.abs(heat).toFixed(1)} °C vs 1991–2020`}</dd></div>
              {oni && <div><dt>Pacific now ({oni.season} {oni.year})</dt><dd>ONI {oni.value > 0 ? '+' : '−'}{Math.abs(oni.value).toFixed(1)} · {oni.value >= 1.5 ? 'strong El Niño' : oni.value >= .5 ? 'El Niño' : oni.value <= -.5 ? 'La Niña' : 'neutral'}</dd></div>}
              {world && view.kind === 'date' && <div><dt>El Niño in {yearOfDate} (Dec–Feb)</dt><dd>{oniAt(world.doc, yearOfDate)?.toFixed(1) ?? '—'}</dd></div>}
            </dl>
            <p className="stats-note">Yearly numbers for {place.name}: Landsat water (EC JRC / UNEP), ERA5 rain and heat, NOAA El Niño index. The map shows the chosen date. Click a country on the globe to switch.</p>
          </>}
        </aside>
      </div>
      <div className="map-bottom"><div className="legend">{view.legend.length ? view.legend.map(l => <span key={l.label}><i style={{ background: l.color }} />{l.label}</span>) : <span>True-colour photo · context, not a water measurement</span>}</div><label className="opacity-control">Opacity <input aria-label="Layer opacity" type="range" min="15" max="100" value={Math.round(opacity * 100)} onChange={e => setOpacity(+e.target.value / 100)} /><b>{Math.round(opacity * 100)}%</b></label></div>
      <div className="acquisition-strip"><div className="strip-heading"><span>{view.kind === 'year' ? 'LANDSAT HISTORY / 1984–2021' : `${view.label.toUpperCase()} / ${fmtDate(steps[0], true)} – ${fmtDate(steps.at(-1)!, true)}`}</span><strong>{playing ? 'Playing' : 'Select a step'}</strong></div>
        <div className="strip-scroll" ref={strip}><div className="strip-track">
          <div className="strip-progress" style={{ width: `calc((100% - 65px) * ${view.kind === 'year' ? LANDSAT_YEARS.indexOf(year) / (LANDSAT_YEARS.length - 1) : steps.length > 1 ? stepIdx / (steps.length - 1) : 0})` }} />
          {view.kind === 'year' ? LANDSAT_YEARS.map(y => <button key={y} className={`strip-date ${year === y ? 'selected' : ''}`} onClick={() => { setPlaying(false); setYear(y); }} aria-current={year === y ? 'step' : undefined}><i /><span>{y}</span></button>)
            : steps.map((d, i) => <button key={d} className={`strip-date ${stepIdx === i ? 'selected' : ''}`} onClick={() => { setPlaying(false); setStep(i); }} aria-label={`Show ${view.window && view.window > 1 ? `the ${view.window} days up to` : ''} ${fmtDate(d, true)}`} aria-current={stepIdx === i ? 'step' : undefined}><i /><span>{fmtDate(d)}</span></button>)}
        </div></div>
        <div className="strip-foot"><span>{view.kind === 'year' ? '1984 — 2021' : `${fmtDate(steps[0], true)} — ${fmtDate(steps.at(-1)!, true)}`}</span><span>{view.kind === 'year' ? 'One classified map per year' : view.id === 'nisar' ? 'Each step = the 12 days of one NISAR orbit cycle' : view.window && view.window > 1 ? `Each step stacks the ${view.window} days up to that date` : 'Each step = one day · one step a month across the record'}</span></div>
      </div>
      <div className="wr-explain"><div><span className="eyebrow">WHAT IT SHOWS</span><p>{view.what}.</p><p className="wr-best">{view.best}.</p></div><div><span className="eyebrow">HOW TO READ IT</span><ul>{view.more.map(t => <li key={t}>{t}</li>)}</ul></div><div><span className="eyebrow">TECHNICAL</span><ul>{view.tech.map(t => <li key={t}>{t}</li>)}</ul><a href={view.sourceUrl} target="_blank" rel="noreferrer">{view.source} ↗</a></div></div>
    </div>
    <div className="provenance-line"><span>NASA GIBS · NASA–ISRO NISAR · NASA OPERA · NASA LANCE · NASA GPM · NOAA-20 VIIRS · EC JRC</span><span>Live tiles drawn at the chosen date · nothing here is a forecast</span><span>We acknowledge the use of imagery from NASA’s Global Imagery Browse Services (GIBS), part of NASA’s ESDIS</span></div>
  </div></section>;
}
