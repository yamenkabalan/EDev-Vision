'use client';

/*
  Global water: the second section of the page. A MapLibre globe that turns
  into a detailed map, the JRC annual water raster for the chosen year, and
  the UNEP SDG 6.6.1 / EC JRC country series (266 countries and territories,
  1984–2018) with a two-country comparison. Ported from Yamen's explorer.
  The same record feeds the History, Graphics and Future sections below.
*/
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Geometry } from '@/lib/countryGeometry';
import { loadGlobal, geometryBounds } from '@/lib/world';
import { sectionNumber } from '@/lib/sections';

const UnifiedGlobeMap = dynamic(() => import('./UnifiedGlobeMap'), { ssr: false, loading: () => <div className="global-map-loading" role="status">Preparing the Earth…</div> });
/** values[i] = [permanent, seasonal, possible permanent in unobserved areas, possible seasonal in unobserved areas], km². */
type Region = { id: number; name: string; area_km2: number | null; focus: [number, number] | null; geometry: Geometry | null; values: ([number, number, number, number] | null)[] };
type GlobalData = { years: number[]; regions: Region[]; sources: { statistics: string; boundaries: string }; note: string };
const km = (n: number | null) => n === null ? 'Unavailable' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
const pct = (n: number | null) => n === null ? 'Unavailable' : `${new Intl.NumberFormat('en-US', { maximumFractionDigits: n < 1 ? 3 : 2 }).format(n)}%`;

function row(region: Region | null, index: number) { return region?.values[index] || null; }
function total(value: [number, number, number, number] | null) { return value ? value[0] + value[1] : null; }
function share(region: Region | null, index: number) {
  const value = total(row(region, index));
  // GAUL statistics and generalized Natural Earth polygons are not identical.
  // Suppress a percentage when the denominator clearly cannot represent it.
  return value !== null && region?.area_km2 && value <= region.area_km2 ? 100 * value / region.area_km2 : null;
}

function WaterReadout({ region, year, index, slot, difference, onFocus }: { region: Region | null; year: number; index: number; slot: 'A' | 'B'; difference?: number | null; onFocus: () => void }) {
  const value = row(region, index);
  const water = total(value);
  const areaShare = share(region, index);
  const peak = region ? Math.max(0, ...region.values.map(v => total(v) || 0)) : 0;
  const versusPeak = water !== null && peak > 0 ? Math.min(100, water / peak * 100) : null;
  const permanentPart = value && water ? value[0] / water * 100 : 0;
  return <div className={`global-value ${slot === 'B' ? 'secondary' : ''}`}>
    <div className="global-value-heading"><span><i className={slot === 'A' ? 'a' : 'b'} /> COUNTRY {slot}</span><div>{region?.focus && <button type="button" onClick={onFocus} aria-label={`Focus map on ${region.name}`}>Focus map ↗</button>}<b>{year}</b></div></div>
    <h4>{region?.name || 'Choose a second country'}</h4>
    <span className="global-value-label">MEASURED SURFACE WATER AREA</span>
    <div className="global-value-hero"><strong>{km(water)}</strong><small>km²</small></div>
    <div className="global-share"><strong>{areaShare === null ? '—' : pct(areaShare)}</strong><span>{areaShare === null ? 'Share of country area unavailable' : 'of the displayed country area · approximate'}</span></div>
    <div className="global-range"><div><span>Compared with this country’s highest measured year</span><b>{versusPeak === null ? '—' : `${Math.round(versusPeak)}%`}</b></div><div className="global-range-track"><i style={{ width: `${versusPeak || 0}%` }} /></div></div>
    <div className="global-classes"><div className="global-classes-bar"><i style={{ width: `${permanentPart}%` }} /><b /></div><div><span>● Permanent <b>{km(value?.[0] ?? null)} km²</b></span><span>● Seasonal <b>{km(value?.[1] ?? null)} km²</b></span></div></div>
    {difference !== undefined && difference !== null && <div className="global-difference">B − A <strong>{difference >= 0 ? '+' : '−'}{km(Math.abs(difference))} km²</strong></div>}
    {value && value[2] + value[3] > (water || 0) * .25 && <small className="global-uncertainty">Landsat could not see part of this country in {year}. Possible water in unobserved areas: {km(value[2] + value[3])} km² (not included above).</small>}
  </div>;
}

function Chart({ data, primary, secondary, yearIndex, mode, onYear }: { data: GlobalData; primary: Region; secondary: Region | null; yearIndex: number; mode: 'area' | 'relative'; onYear: (index: number) => void }) {
  const width = 680, height = 205, left = 42, right = 12, top = 12, bottom = 30;
  const firstAreas = data.years.map((_, i) => total(row(primary, i)));
  const secondAreas = secondary ? data.years.map((_, i) => total(row(secondary, i))) : [];
  const relative = (values: (number | null)[]) => { const peak = Math.max(0, ...values.map(v => v || 0)); return values.map(v => v !== null && peak > 0 ? v / peak * 100 : null); };
  const one = mode === 'relative' ? relative(firstAreas) : firstAreas;
  const two = mode === 'relative' ? relative(secondAreas) : secondAreas;
  const max = mode === 'relative' ? 100 : Math.max(1, ...one.filter((n): n is number => n !== null), ...two.filter((n): n is number => n !== null)) * 1.12;
  const x = (i: number) => left + (width - left - right) * i / (data.years.length - 1);
  const y = (v: number) => top + (height - top - bottom) * (1 - v / max);
  const path = (values: (number | null)[]) => values.map((v, i) => `${v === null ? 'M' : i && values[i - 1] !== null ? 'L' : 'M'}${x(i).toFixed(1)},${y(v || 0).toFixed(1)}`).join(' ');
  return <div className="global-chart-wrap"><svg className="global-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Annual ${mode === 'relative' ? 'relative surface water area' : 'measured surface water area'} from ${data.years[0]} to ${data.years.at(-1)} for ${primary.name}${secondary ? ` and ${secondary.name}` : ''}`}>
    {[0, .5, 1].map(f => <g key={f}><line x1={left} x2={width - right} y1={y(max * f)} y2={y(max * f)} stroke="#41616a" strokeDasharray="3 5" /><text x={left - 8} y={y(max * f) + 4} textAnchor="end">{mode === 'relative' ? `${Math.round(max * f)}%` : km(max * f)}</text></g>)}
    <path d={path(one)} fill="none" stroke="#f6c676" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
    {secondary && <path d={path(two)} fill="none" stroke="#55d8f3" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />}
    <line x1={x(yearIndex)} x2={x(yearIndex)} y1={top} y2={height - bottom} stroke="#e7efde" strokeWidth="1" strokeDasharray="3 4" />
    {one[yearIndex] !== null && <circle cx={x(yearIndex)} cy={y(one[yearIndex]!)} r="5" fill="#f6c676" />}
    {secondary && two[yearIndex] !== null && <circle cx={x(yearIndex)} cy={y(two[yearIndex]!)} r="5" fill="#55d8f3" />}
    {[0, 10, 20, 30, data.years.length - 1].map(i => <text key={i} x={x(i)} y={height - 6} textAnchor={i === 0 ? 'start' : i === data.years.length - 1 ? 'end' : 'middle'}>{data.years[i]}</text>)}
    {data.years.map((year, i) => <rect key={year} x={x(i) - 8} y={top} width={16} height={height - top - bottom} fill="transparent" tabIndex={0} role="button" aria-label={`Select ${year}`} onClick={() => onYear(i)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onYear(i); } }} />)}
  </svg><div className="global-chart-key"><span><i className="a" />{primary.name}</span>{secondary && <span><i className="b" />{secondary.name}</span>}<small>{mode === 'relative' ? 'Each line as a percentage of its own 1984–2018 measured maximum' : 'km² of measured permanent + seasonal inland surface water'}</small></div></div>;
}

export default function GlobalExplorer() {
  const sectionRef = useRef<HTMLElement>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [data, setData] = useState<GlobalData | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [first, setFirst] = useState<number | null>(null);
  const [second, setSecond] = useState<number | null>(null);
  const [comparing, setComparing] = useState(false);
  const [chartMode, setChartMode] = useState<'area' | 'relative'>('area');
  const [yearIndex, setYearIndex] = useState(34);
  const [focusId, setFocusId] = useState<number | null>(null);
  const [focusToken, setFocusToken] = useState(0);
  const [showWater, setShowWater] = useState(true);
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) { setNearViewport(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setNearViewport(true);
      observer.disconnect();
    }, { rootMargin: '0px' });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!nearViewport) return;
    const controller = new AbortController();
    setError('');
    loadGlobal().then(value => {
      if (controller.signal.aborted) return;
      setData(value as GlobalData); setYearIndex(value.years.length - 1);
      setFirst(value.regions.find(r => r.name === 'Brazil')?.id ?? value.regions[0].id);
    }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Global water data unavailable.'); });
    return () => controller.abort();
  }, [retry, nearViewport]);
  const regions = data?.regions || [];
  const primary = regions.find(r => r.id === first) || null;
  const secondary = comparing ? regions.find(r => r.id === second) || null : null;
  const focus = (id: number | null) => { setFocusId(id); setFocusToken(n => n + 1); };
  // "See on map": fit the whole country, borders included, to the map.
  const [fit, setFit] = useState<{ bounds: [[number, number], [number, number]]; token: number } | null>(null);
  const seeOnMap = (region: Region | null) => { if (region?.geometry) setFit(f => ({ bounds: geometryBounds(region.geometry!), token: (f?.token ?? 0) + 1 })); else if (region) focus(region.id); };
  const choose = (id: number) => { if (comparing && primary && id !== primary.id) setSecond(id); else setFirst(id); focus(id); };
  const focusRegion = regions.find(r => r.id === focusId) || null;
  const year = data?.years[yearIndex] ?? 2018;
  const primaryRow = row(primary, yearIndex), secondaryRow = row(secondary, yearIndex);
  const difference = secondaryRow && primaryRow ? total(secondaryRow)! - total(primaryRow)! : null;
  const toggleCompare = () => {
    if (comparing) { setComparing(false); setChartMode('area'); return; }
    setComparing(true); setChartMode('relative');
    if (second === null || second === primary?.id) setSecond(regions.find(r => r.name === (primary?.name === 'India' ? 'Brazil' : 'India'))?.id ?? null);
  };
  return <section ref={sectionRef} className="global-section" id="global" aria-labelledby="global-title"><div className="wrap">
    <div className="global-heading">
      <div>
        <div className="eyebrow"><span className="section-number">{sectionNumber('global')}</span> GLOBAL WATER · 266 COUNTRIES</div>
        <h2 id="global-title">One planet.<br /><em>Many water stories.</em></h2>
        <p>Explore how inland surface water changed across 266 countries and territories from 1984 to 2018. Spin the globe, click a country, pick a year and compare two places. The year you choose redraws the water on the map.</p>
      </div>
      <div className="global-period"><strong>1984—2018</strong><span>35 years of Landsat-based statistics<br />266 countries &amp; territories</span></div>
    </div>
    {error ? <div className="global-error" role="status">{error} <button type="button" className="small-button" onClick={() => setRetry(n => n + 1)}>Retry ↻</button></div> : !data || !primary ? <div className="global-error" role="status">Preparing the global water record…</div> : <div className="global-workspace">
      <div className="global-stage">
        <UnifiedGlobeMap regions={regions} primary={primary} secondary={secondary} focusRegion={focusRegion} focusToken={focusToken} fit={fit} showWater={showWater} year={year} onPick={choose} />
        <div className="global-layer-badge"><i /> JRC ANNUAL WATER <span>{year}</span></div>
        <div className="global-controls"><span>ANNUAL WATER MAP · COUNTRY VALUES AT RIGHT</span><div><button type="button" className="global-layer-toggle" aria-pressed={showWater} onClick={() => setShowWater(v => !v)}>{showWater ? 'Hide annual water' : 'Show annual water'}</button><button type="button" aria-pressed={comparing} onClick={toggleCompare}>◉ {comparing ? 'End comparison' : 'Compare two countries'}</button></div></div>
      </div>
      <aside className="global-panel"><div className="global-panel-top"><span className="eyebrow">SELECT A COUNTRY OR TERRITORY</span>
        <label>Country A<span className="global-select-row"><select aria-label="First country or territory" value={primary.id} onChange={e => { const id = Number(e.target.value); setFirst(id); setSecond(v => v === id ? null : v); focus(id); }}>{regions.map(region => <option key={region.id} value={region.id}>{region.name}</option>)}</select>{comparing && <button type="button" className="global-see" onClick={() => seeOnMap(primary)} aria-label={`See ${primary.name} on the map`}>See on map ↗</button>}</span></label>
        {comparing && <label>Country B<span className="global-select-row"><select aria-label="Second country or territory" value={secondary?.id ?? ''} onChange={e => { const id = e.target.value === '' ? null : Number(e.target.value); setSecond(id); if (id !== null) focus(id); }}><option value="">Choose a country</option>{regions.filter(region => region.id !== primary.id).map(region => <option key={region.id} value={region.id}>{region.name}</option>)}</select><button type="button" className="global-see" disabled={!secondary} onClick={() => seeOnMap(secondary)} aria-label={secondary ? `See ${secondary.name} on the map` : 'Choose a second country first'}>See on map ↗</button></span></label>}
        <label>Year<select aria-label="Year of the map and country values" value={year} onChange={e => setYearIndex(data.years.indexOf(Number(e.target.value)))}>{data.years.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        <input type="range" aria-label="Year timeline" min="0" max={data.years.length - 1} value={yearIndex} onChange={e => setYearIndex(Number(e.target.value))} /></div>
        <WaterReadout region={primary} year={year} index={yearIndex} slot="A" onFocus={() => focus(primary.id)} />
        {comparing && <WaterReadout region={secondary} year={year} index={yearIndex} slot="B" difference={difference} onFocus={() => focus(secondary?.id ?? null)} />}
        <p className="global-panel-note">The year you choose updates both the annual water map and the country values. Surface water area is not water level, depth, flood risk or drinking water, and it is not a real-time measurement. Early years can undercount water where Landsat had no clear view. The percentage is approximate because the display borders differ from the statistics borders.</p>
      </aside>
      <div className="global-timeline"><div className="global-timeline-head"><div><div className="eyebrow">FULL YEARLY RECORD · 1984–2018</div><h3>{comparing ? 'Compare water through time.' : 'Water through time.'}</h3></div><div className="global-chart-mode" role="group" aria-label="Chart scale"><button type="button" aria-pressed={chartMode === 'area'} onClick={() => setChartMode('area')}>Area · km²</button><button type="button" aria-pressed={chartMode === 'relative'} onClick={() => setChartMode('relative')}>Relative · %</button></div></div><Chart data={data} primary={primary} secondary={secondary} yearIndex={yearIndex} mode={chartMode} onYear={setYearIndex} /><div className="global-sources"><div className="global-source-heading">WHERE THE GLOBAL DATA COMES FROM</div><div className="global-source-grid">
          <div><span>01 / COUNTRY STATISTICS</span><strong>UNEP SDG 6.6.1</strong><p>EC JRC Landsat measurements of permanent and seasonal surface water area in km², aggregated by GAUL 0 country boundaries, 1984–2018, for 266 countries and territories.</p><a href="https://www.sdg661.app/" target="_blank" rel="noopener noreferrer">UNEP Freshwater Ecosystems Explorer ↗</a><a href="https://storage.googleapis.com/global-surface-water-stats/gaul0-all-2018.csv" target="_blank" rel="noopener noreferrer" download>Download the source CSV ↓</a></div>
          <div><span>02 / ANNUAL WATER MAP</span><strong>EC JRC / Google</strong><p>Year-specific JRC Yearly History classifications at 30 m: blue is permanent water, green is seasonal open water. Unobserved pixels are transparent. The service covers 1984–2021; the map stops at 2018 to match the country statistics. Map and country totals come from different JRC releases, so they may not match exactly.</p><a href="https://global-surface-water.appspot.com/" target="_blank" rel="noopener noreferrer">Global Surface Water Explorer ↗</a><a href="https://www.nature.com/articles/nature20584" target="_blank" rel="noopener noreferrer">Method: Pekel et al. 2016, Nature ↗</a></div>
          <div><span>03 / DISPLAY BORDERS</span><strong>Natural Earth</strong><p>Generalised country outlines let you click the globe. Area percentages are approximate because these borders differ from GAUL.</p><a href="https://github.com/nvkelso/natural-earth-vector" target="_blank" rel="noopener noreferrer">Natural Earth vector data ↗</a><a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">naturalearthdata.com ↗</a></div>
        </div></div></div>
    </div>}
  </div></section>;
}
