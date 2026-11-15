'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MLMap } from 'maplibre-gl';
import { contains } from '@/lib/countryGeometry';
import { CAUSES, DEFAULT_OPTIONS, inText, chanceBelow, fit, km, mean, pctText, prob, project, selected, series, usable, validate, type Cause, type DataMode, type EngineOptions, type Selection, type World } from '@/lib/world';
import { sectionNumber } from '@/lib/sections';
import PlacePicker from './PlacePicker';
import { useMapVisibility } from '@/lib/useMapVisibility';

/*
  07 · Bayesian projections for places with enough observations. The reader
  chooses the place, the causes the engine may use, how unseen areas are
  treated and which years it learns from; the RSynthesis world engine refits
  in the browser and every answer, range, chance, test and the probability
  map below are recomputed from that choice.
*/
type Scenario = 'expected' | 'dry' | 'wet';
const SCEN: { id: Scenario; label: string; note: string }[] = [
  { id: 'expected', label: 'Typical year', note: 'the middle of the forecast: half of the outcomes are above, half below' },
  { id: 'dry', label: 'Dry year', note: 'a dry outcome: 1 year in 10 would be lower' },
  { id: 'wet', label: 'Wet year', note: 'a wet outcome: 1 year in 10 would be higher' },
];
const YEARS = Array.from({ length: 9 }, (_, i) => 2022 + i);
const RAMP: [number, string][] = [[0, '#1f6fb2'], [.25, '#5aa6d6'], [.5, '#d9d2b4'], [.75, '#e3924a'], [1, '#c4442a']];

export default function WorldFuture({ world: suppliedWorld, selection, onSelect }: { world: World | null; selection: Selection; onSelect: (s: Selection) => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const { started } = useMapVisibility(sectionRef);
  const world = started ? suppliedWorld : null;
  const [opt, setOpt] = useState<EngineOptions>(DEFAULT_OPTIONS);
  const [year, setYear] = useState(2030);
  const [scenario, setScenario] = useState<Scenario>('expected');
  const place = world ? selected(world, selection)[0] : null;
  const f = useMemo(() => world && place ? fit(world, place, opt) : null, [world, place?.key, opt]); // eslint-disable-line react-hooks/exhaustive-deps
  const p = useMemo(() => world && place && f?.ok ? project(world, place, f, [year])[0] : undefined, [world, place, f, year]);
  const [val, setVal] = useState<ReturnType<typeof validate> | null>(null);
  useEffect(() => { setVal(null); if (!world || !place) return; const id = setTimeout(() => setVal(validate(world, place, opt)), 60); return () => clearTimeout(id); }, [world, place?.key, opt]); // eslint-disable-line react-hooks/exhaustive-deps
  const avg = world && place ? mean(usable(series(place, world.years, opt.mode)).filter(q => q.year >= opt.from).map(q => q.value)) : 0;
  const low = world && place ? Math.min(...usable(series(place, world.years, opt.mode)).filter(q => q.year >= opt.from).map(q => q.value)) : 0;
  const shown = p ? (scenario === 'dry' ? p.p10 : scenario === 'wet' ? p.p90 : p.p50) : null;
  const toggle = (c: Cause) => setOpt(o => ({ ...o, causes: o.causes.includes(c) ? o.causes.filter(x => x !== c) : [...o.causes, c] }));
  const ranked = f?.ok ? f.used.map(c => ({ c, w: f.pip[c], e: f.effect[c] })).sort((a, b) => b.w - a.w) : [];
  const label = (c: Cause) => { const l = CAUSES.find(x => x.id === c)!.label; return c === 'enso' ? l : l.toLowerCase(); };
  const answer = !place ? '' : !f?.ok ? `${place.name}: ${f?.reason ?? 'not enough data.'}` : !p || shown === null ? '' :
    `${scenario === 'expected' ? `In a typical ${year}` : scenario === 'dry' ? `If ${year} turns out dry` : `If ${year} turns out wet`}, ${inText(place)} should hold about ${km(shown)} km² of surface water — ${pctText(shown / avg - 1)} against its ${opt.from}–2018 average. `
    + `The chance of ending below that average is ${prob(chanceBelow(p, avg))}. The chance of falling below the lowest area in the selected record (${km(low)} km²) is ${prob(chanceBelow(p, low))}. `
    + (ranked[0] && ranked[0].w > .5 ? `The highest inclusion weights are for ${ranked.filter(r => r.w > .5).map(r => `${label(r.c)} (${prob(r.w)})`).join(', ')}. ` : '')
    + (p.known === 'known' ? 'All selected inputs are available for this year.' : p.known === 'partly' ? 'The model uses available inputs and draws missing values from past years.' : 'The model draws unavailable climate inputs from past years.');

  return <section ref={sectionRef} className="future-section" id="future" aria-labelledby="future-title"><div className="wrap">
    <div className="section-heading"><div><div className="eyebrow"><span className="section-number">{sectionNumber('future')}</span> FUTURE · BAYESIAN PROJECTIONS</div><h2 id="future-title">The planet to 2030,<br /><em>drawn by probability.</em></h2></div><p className="section-description">Choose a place and inputs. The Bayesian engine recalculates the estimate, uncertainty range and map.</p></div>
    {!world || !place ? <div className="feed-placeholder" role="status"><span className="loading-orbit" /><h3>Loading the world record…</h3></div> : <div className="wf-layout">
      <aside className="wf-options" aria-label="Engine options">
        <div className="eyebrow">1 · PLACE</div>
        <PlacePicker world={world} value={selection.mode === 'compare' ? { ...selection, mode: 'country' } : selection} onChange={onSelect} allowCompare={false} compact />
        <div className="eyebrow">2 · CAUSES THE ENGINE MAY USE</div>
        <div className="wf-causes">{CAUSES.map(c => { const off = f && !f.available.includes(c.id); return <label key={c.id} className={off ? 'off' : ''} title={c.help}><input type="checkbox" checked={opt.causes.includes(c.id)} disabled={!!off} onChange={() => toggle(c.id)} /><span><b>{c.label}</b><small>{off ? 'no record for this place' : c.help}</small></span></label>; })}</div>
        <div className="eyebrow">3 · UNSEEN AREAS</div>
        <div className="seg seg-small" role="radiogroup">{([['measured', 'Measured only'], ['gapfilled', 'Measured + JRC estimate']] as [DataMode, string][]).map(([id, l]) => <button key={id} type="button" role="radio" aria-checked={opt.mode === id} className={opt.mode === id ? 'active' : ''} onClick={() => setOpt(o => ({ ...o, mode: id }))}>{l}</button>)}</div>
        <p className="wf-hint">{opt.mode === 'measured' ? 'Learns from years where estimated unseen water is at most 15% of measured water.' : 'Adds JRC’s estimate for areas Landsat could not see when a record is available.'}</p>
        <div className="eyebrow">4 · LEARN FROM</div>
        <div className="seg seg-small" role="radiogroup">{[[1984, '1984–2018'], [2000, '2000–2018']].map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={opt.from === v} className={opt.from === v ? 'active' : ''} onClick={() => setOpt(o => ({ ...o, from: v as number }))}>{l}</button>)}</div>
        <button type="button" className="small-button" onClick={() => setOpt(DEFAULT_OPTIONS)}>Reset the engine ↺</button>
      </aside>
      <div className="wf-main">
        <div className="future-controls">
          <div className="seg" role="radiogroup" aria-label="Year">{YEARS.map(y => <button key={y} type="button" role="radio" aria-checked={year === y} className={year === y ? 'active' : ''} onClick={() => setYear(y)}>{y}</button>)}</div>
          <div className="seg seg-small" role="radiogroup" aria-label="Kind of year">{SCEN.map(s => <button key={s.id} type="button" role="radio" aria-checked={scenario === s.id} className={scenario === s.id ? 'active' : ''} onClick={() => setScenario(s.id)}>{s.label}</button>)}</div>
        </div>
        <div className="wf-answer" aria-live="polite">
          <div className="eyebrow">ANSWER · {place.name.toUpperCase()} · {year} · {SCEN.find(s => s.id === scenario)!.label.toUpperCase()}</div>
          {p && shown !== null ? <div className="wf-answer-row">
            <div className="g-big"><strong>{km(shown)}</strong><span>km² of surface water · {SCEN.find(s => s.id === scenario)!.note}</span></div>
            <dl><div><dt>80% range</dt><dd>{km(p.p10)}–{km(p.p90)} km²</dd></div><div><dt>Chance below average</dt><dd>{prob(chanceBelow(p, avg))}</dd></div><div><dt>Chance of a record low</dt><dd>{prob(chanceBelow(p, low))}</dd></div><div><dt>Trend, causes held equal</dt><dd>{f?.trendPerDecade != null ? `${pctText(f.trendPerDecade, 1)} / decade` : 'not used'}</dd></div></dl>
          </div> : null}
          <p className="wf-text">{answer}</p>
        </div>
        <div className="wf-two">
          <div className="wf-card"><div className="eyebrow">MODEL INCLUSION WEIGHTS</div>
            {f?.ok && ranked.length ? <ul className="wf-pip">{ranked.map(r => <li key={r.c}><span>{CAUSES.find(x => x.id === r.c)!.label}</span><i><b style={{ width: `${Math.round(r.w * 100)}%` }} /></i><em>{prob(r.w)} · {r.e > .002 ? 'more water' : r.e < -.002 ? 'less water' : 'no clear sign'}</em></li>)}</ul> : <p className="wf-hint">{f?.reason ?? 'Choose an input to see its weight.'}</p>}
            {ranked.length > 0 && <p className="wf-hint">An input’s weight is the sum of the weights of the fitted models that include it. The signs describe model associations.</p>}</div>
          <div className="wf-card"><div className="eyebrow">HOW WELL IT WORKS HERE</div>
            {!val ? <p className="wf-hint">Testing on hidden years…</p> : <dl className="wf-tests">
              <div><dt>Each year hidden in turn</dt><dd>{val.loo ? `typical error ${km(val.loo.rmse)} km² · skill ${val.loo.skill.toFixed(2)}` : '—'}</dd></div>
              <div><dt>Train through {val.split?.trainTo ?? 2008}, estimate later years with observed inputs</dt><dd>{val.split ? `skill ${val.split.skill.toFixed(2)} · ${val.split.n} years` : 'too few years'}</dd></div>
              <div><dt>Check against UNEP 2018→2022</dt><dd>{val.sdg ? `UNEP ${pctText(val.sdg.observed, 1)} · engine ${pctText(val.sdg.predicted, 1)} (80%: ${pctText(val.sdg.p10)} to ${pctText(val.sdg.p90)})` : 'no UNEP values'}</dd></div>
            </dl>}
            <p className="wf-hint">Skill 0 = no better than always guessing the average; 1 = perfect; below 0 = worse than the average. Some places are simply hard to predict, and the page says so.</p></div>
        </div>
        <ProbabilityMap world={world} opt={opt} year={year} onPick={key => onSelect({ ...selection, mode: 'country', a: key })} selectedKey={place.key} />
        <ol className="engine-steps">
          <li><span>01</span><strong>Learn</strong><p>{f?.ok ? `Fit on ${f.n} years for ${place.name}. ` : ''}Pair annual Landsat surface water with the selected inputs.</p></li>
          <li><span>02</span><strong>Weigh</strong><p>Every combination of the chosen causes is scored by Bayesian evidence (Zellner g-prior, Scott–Berger prior on how many causes). Good combinations get more weight.</p></li>
          <li><span>03</span><strong>Project</strong><p>Simulate 1,200 outcomes per place and year using model weights, available inputs and a Student-t distribution for uncertainty.</p></li>
          <li><span>04</span><strong>Answer</strong><p>The draws become the median, the 80% and 95% ranges, the chances above and the colour of each country on the map.</p></li>
        </ol>
      </div>
    </div>}
  </div></section>;
}

function ProbabilityMap({ world, opt, year, onPick, selectedKey }: { world: World; opt: EngineOptions; year: number; onPick: (key: string) => void; selectedKey: string }) {
  const host = useRef<HTMLDivElement>(null), map = useRef<MLMap | null>(null);
  const [ready, setReady] = useState(false), [unavailable, setUnavailable] = useState(false);
  const [summary, setSummary] = useState<{ below: number; n: number; opt: EngineOptions; year: number } | null>(null);
  const { started, active } = useMapVisibility(host);
  const lastComputed = useRef<{ opt: EngineOptions; year: number } | null>(null);
  const pick = useRef(onPick); pick.current = onPick;
  const features = useMemo(() => world.countries.filter(c => c.geometry).map(c => ({ type: 'Feature' as const, properties: { key: c.key, name: c.name, p: -1 }, geometry: c.geometry as GeoJSON.Geometry })), [world]);
  useEffect(() => {
    if (!started || !host.current) return;
    if (!document.createElement('canvas').getContext('webgl2')) { setUnavailable(true); return; }
    maplibregl.setWorkerUrl(new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).toString());
    const m = new maplibregl.Map({ pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5), container: host.current, attributionControl: false, center: [15, 15], zoom: 1, minZoom: .5, maxZoom: 7, dragRotate: false,
      style: { version: 8, projection: { type: 'mercator' }, sources: { c: { type: 'geojson', data: { type: 'FeatureCollection', features } } }, layers: [
        { id: 'bg', type: 'background', paint: { 'background-color': '#0a1914' } },
        { id: 'fill', type: 'fill', source: 'c', paint: { 'fill-color': ['case', ['<', ['get', 'p'], 0], '#2a3b35', ['interpolate', ['linear'], ['get', 'p'], ...RAMP.flatMap(([v, c]) => [v, c])]], 'fill-opacity': .92 } },
        { id: 'line', type: 'line', source: 'c', paint: { 'line-color': '#0a1914', 'line-width': .4 } },
        { id: 'sel', type: 'line', source: 'c', filter: ['==', ['get', 'key'], ''], paint: { 'line-color': '#f6c676', 'line-width': 2 } },
      ] } });
    map.current = m;
    m.on('load', () => setReady(true));
    m.on('click', e => { const hit = world.countries.find(c => c.geometry && contains(c.geometry, e.lngLat.lng, e.lngLat.lat)); if (hit) pick.current(hit.key); });
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'wf-popup' });
    m.on('mousemove', 'fill', e => { const p = e.features?.[0]?.properties; if (!p) return; popup.setLngLat(e.lngLat).setHTML(`<b>${p.name}</b><br>${p.p < 0 ? 'not enough data' : `chance below its average: ${Math.round(p.p * 100)}%`}`).addTo(m); m.getCanvas().style.cursor = 'pointer'; });
    m.on('mouseleave', 'fill', () => { popup.remove(); m.getCanvas().style.cursor = ''; });
    return () => { m.remove(); map.current = null; };
  }, [world, features, started]);
  useEffect(() => {
    if (!ready || !active) return;
    if (lastComputed.current?.opt === opt && lastComputed.current.year === year) return;
    let cancelled = false;
    const run = async () => {
      let below = 0, n = 0;
      const computed = [];
      for (const original of features) {
        // Yield between countries so camera gestures and input can be handled.
        await new Promise<void>(resolve => setTimeout(resolve, 0));
        if (cancelled) return;
        const ft = { ...original, properties: { ...original.properties, p: -1 } };
        const c = world.byKey.get(ft.properties.key)!, fc = fit(world, c, opt);
        if (fc.ok) {
          const avg = mean(usable(series(c, world.years, opt.mode)).filter(q => q.year >= opt.from).map(q => q.value));
          const pr = project(world, c, fc, [year])[0];
          ft.properties.p = chanceBelow(pr, avg); n++; if (ft.properties.p > .5) below++;
        }
        computed.push(ft);
      }
      if (cancelled) return;
      (map.current?.getSource('c') as maplibregl.GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: computed });
      lastComputed.current = { opt, year };
      setSummary({ below, n, opt, year });
    };
    void run();
    return () => { cancelled = true; };
  }, [ready, active, opt, year, world, features]);
  useEffect(() => { if (ready) map.current?.setFilter('sel', ['==', ['get', 'key'], selectedKey]); }, [ready, selectedKey]);
  return <div className="wf-map-card">
    <div className="wf-map-head"><div><div className="eyebrow">PROBABILITY MAP · {year}</div><h3>Chance of less water than usual.</h3></div><p>{unavailable ? 'This map requires WebGL. The selected place’s probabilities are shown above.' : summary?.year === year && summary.opt === opt ? `${summary.below} of ${summary.n} countries lean towards less water than their own average in ${year}.` : started ? 'Calculating probabilities…' : ''}</p></div>
    <div className="wf-map" ref={host} role="region" aria-label={`World map: for each country, the chance that ${year} ends with less surface water than its average. Click a country to select it.`} />
    <div className="future-legend"><span>Chance of less water than its average</span><i style={{ background: `linear-gradient(90deg, ${RAMP.map(([v, c]) => `${c} ${v * 100}%`).join(', ')})` }} /><small><b>0%</b><b>50%</b><b>100%</b></small><small className="wf-grey"><i /> grey: not enough well-observed years</small></div>
  </div>;
}
