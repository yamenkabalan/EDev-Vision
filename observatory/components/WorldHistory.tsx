'use client';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { causeZ, inText, climateAt, DEFAULT_OPTIONS, fit, km, mean, oniAt, rainAnomaly, selected, series, usable, type Cause, type Fit, type Place, type Point, type Selection, type World } from '@/lib/world';
import { sectionNumber } from '@/lib/sections';
import PlacePicker from './PlacePicker';

/*
  05 · History: 35 years of Landsat surface water for the world, a continent,
  a country or two countries, each year against the place's own average, with
  the rain, heat and El Niño of that year and what the engine reads in them.
*/
type Cls = 'dry' | 'near' | 'wet' | 'uncertain' | 'none';
const CLASSES: Record<Cls, { label: string; icon: string; hint: string }> = {
  dry: { label: 'Less water', icon: '▼', hint: 'more than 5% below average' },
  near: { label: 'Near average', icon: '●', hint: 'within 5% of the average' },
  wet: { label: 'More water', icon: '▲', hint: 'more than 5% above average' },
  uncertain: { label: 'Too few clear images', icon: '◌', hint: 'value is a lower bound' },
  none: { label: 'No data', icon: '×', hint: 'no yearly value' },
};
const DRIVERS: { id: Cause; label: string; indicator: string }[] = [
  { id: 'rain', label: 'Rain this year', indicator: 'ERA5 yearly precipitation, vs 1991–2020 normal' },
  { id: 'rain1', label: 'Rain the year before', indicator: 'Water carried over in lakes, soils and aquifers' },
  { id: 'heat', label: 'Heat', indicator: 'ERA5 temperature anomaly vs 1991–2020' },
  { id: 'enso', label: 'El Niño / La Niña', indicator: 'NOAA Oceanic Niño Index, Dec–Feb' },
];
type Bar = Point & { cls: Cls; anomaly: number | null };

function bars(world: World, place: Place): { points: Bar[]; avg: number; n: number } {
  const pts = series(place, world.years), good = usable(pts), avg = mean(good.map(p => p.value));
  return {
    avg, n: good.length,
    points: pts.map(p => {
      if (p.value === null || p.value <= 0) return { ...p, cls: 'none', anomaly: null };
      const anomaly = p.value / avg - 1;
      return { ...p, anomaly, cls: p.low ? 'uncertain' : anomaly < -.05 ? 'dry' : anomaly > .05 ? 'wet' : 'near' };
    }),
  };
}
const pctWord = (a: number) => `${Math.abs(Math.round(a * 100))}% ${a >= 0 ? 'above' : 'below'} average`;

function Strip({ data, sel, onYear, label, tone }: { data: ReturnType<typeof bars>; sel: number; onYear: (y: number) => void; label: string; tone?: 'a' | 'b' }) {
  const scale = Math.max(.06, ...data.points.filter(p => p.cls !== 'uncertain' && p.anomaly !== null).map(p => Math.abs(p.anomaly!)));
  const box = useRef<HTMLDivElement>(null);
  // Keep the selected year in view when the strip scrolls (phones).
  useEffect(() => { const sc = box.current, el = sc?.querySelector<HTMLElement>('[aria-checked="true"]'); if (sc && el && sc.scrollWidth > sc.clientWidth) sc.scrollLeft = el.offsetLeft - sc.clientWidth / 2; }, [sel]);
  return <div className="wh-strip">{tone && <div className="wh-strip-name"><i className={`pp-dot ${tone}`} />{label}</div>}
    <div className="v2-yearstrip-scroll" ref={box}><div className="v2-yearstrip" role="radiogroup" aria-label={`Surface water by year, ${label}`} style={{ '--n': data.points.length } as CSSProperties}>
      <span className="v2-yearstrip-mean" aria-hidden="true" />
      {data.points.map(p => { const c = CLASSES[p.cls], drawn = p.anomaly !== null && p.cls !== 'uncertain', h = drawn ? Math.max(5, Math.min(100, Math.abs(p.anomaly!) / scale * 100)) : 0;
        const text = `${p.year}: ${p.value ? `${km(p.value)} km²` : 'no value'}. ${p.anomaly !== null && p.cls !== 'uncertain' ? pctWord(p.anomaly) : c.hint}. ${c.label}.`;
        return <button key={p.year} type="button" role="radio" className="v2-yr" data-cls={p.cls} aria-checked={p.year === sel} tabIndex={p.year === sel ? 0 : -1} aria-label={text} title={text} onClick={() => onYear(p.year)}>
          <span className="v2-yr-plot" aria-hidden="true">{drawn && <span className="v2-yr-bar" data-dir={p.anomaly! >= 0 ? 'up' : 'down'} style={{ '--h': `${h}%` } as CSSProperties} />}{p.cls === 'uncertain' && <span className="v2-yr-stub" />}</span>
          <span className="v2-yr-icon" aria-hidden="true">{c.icon}</span><span className="v2-yr-label" aria-hidden="true">{p.year % 5 === 0 ? p.year : ''}</span></button>; })}
    </div></div></div>;
}

function driverValue(world: World, place: Place, id: Cause, year: number) {
  const doc = world.doc;
  if (id === 'rain' || id === 'rain1') { const y = id === 'rain' ? year : year - 1, a = rainAnomaly(doc, place, y), mm = climateAt(doc, place.pr, y); return a === undefined || mm === undefined ? null : `${Math.round(mm)} mm · ${Math.abs(a) < 3 ? 'close to normal' : `${Math.abs(a)}% ${a > 0 ? 'above' : 'below'} normal`}`; }
  if (id === 'heat') { const t = climateAt(doc, place.ta, year); return t === undefined ? null : `${t > 0 ? '+' : '−'}${Math.abs(t).toFixed(2)} °C vs normal`; }
  const o = oniAt(doc, year); return o === undefined ? null : `ONI ${o > 0 ? '+' : '−'}${Math.abs(o).toFixed(1)} · ${o >= 1.5 ? 'strong El Niño' : o >= .5 ? 'El Niño' : o <= -1.5 ? 'strong La Niña' : o <= -.5 ? 'La Niña' : 'neutral Pacific'}`;
}

function YearCard({ world, place, f, data, year, tone }: { world: World; place: Place; f: Fit; data: ReturnType<typeof bars>; year: number; tone?: 'a' | 'b' }) {
  const p = data.points.find(x => x.year === year), prev = data.points.find(x => x.year === year - 1);
  const c = CLASSES[p?.cls ?? 'none'];
  const pushes = DRIVERS.map(d => {
    const z = f.ok && f.used.includes(d.id) ? causeZ(world, place, f, d.id, year) : undefined, value = driverValue(world, place, d.id, year);
    const push = z === undefined ? 0 : f.effect[d.id] * z;
    return { ...d, value, dir: Math.abs(push) < .01 ? 'neutral' : push > 0 ? 'wet' : 'dry', weight: f.pip[d.id] ?? 0 };
  }).filter(d => d.value);
  const strong = pushes.filter(d => d.dir !== 'neutral' && d.weight > .3);
  const where = inText(place), Where = where[0].toUpperCase() + where.slice(1);
  const sentence = !p?.value ? `There is no Landsat value for ${where} in ${year}.`
    : p.cls === 'uncertain' ? `Landsat saw too little of ${where} in ${year} to judge the year: ${km(p.value)} km² is a lower bound.`
    : `${Where} held ${km(p.value)} km² of surface water, ${pctWord(p.anomaly!)}.` + (strong.length ? ` The engine reads ${strong.map(d => d.id === 'enso' ? d.label : d.label.toLowerCase()).join(' and ')} as pushing it ${strong.filter(d => d.dir === 'wet').length >= strong.filter(d => d.dir === 'dry').length ? 'up' : 'down'} this year.` : ' None of the yearly causes the engine trusts stood out this year.');
  return <div className="v2-yearcard">
    <div className="v2-yearcard-main" aria-live="polite">
      <div className="v2-yearcard-year">{tone && <i className={`pp-dot ${tone}`} />}<span className="v2-num">{year}</span><span className="v2-badge" data-cls={p?.cls ?? 'none'}><span aria-hidden="true">{c.icon}</span> {c.label}</span></div>
      <h4 className="wh-place">{place.name}</h4>
      <dl className="v2-yearcard-stats">
        <div className="v2-stat-big"><dt>Surface water this year</dt><dd><span className="v2-num">{p?.value ? km(p.value) : '—'}</span>{p?.value ? <small> km²</small> : null}</dd></div>
        <div><dt>Compared with the average</dt><dd>{p?.anomaly != null && p.cls !== 'uncertain' ? pctWord(p.anomaly) : '—'}</dd></div>
        <div><dt>vs {year - 1}</dt><dd>{p?.value && prev?.value && !p.low && !prev.low ? `${p.value >= prev.value ? '+' : '−'}${km(Math.abs(p.value - prev.value))} km²` : '—'}</dd></div>
        <div><dt>Permanent / seasonal</dt><dd>{p?.permanent != null ? `${km(p.permanent)} / ${km(p.seasonal)} km²` : '—'}</dd></div>
      </dl>
      {p?.low && p.value ? <p className="v2-note">Landsat could not see part of {where} in {year}: up to {km(p.unobserved)} km² more water may have been there.</p> : null}
    </div>
    <div className="v2-yearcard-drivers">
      <h4>What happened this year</h4>
      <p className="v2-summary">{sentence} These are associations, not proof of cause.</p>
      {pushes.length ? <ul className="v2-drivers">{pushes.map(d => <li key={d.id}>
        <span className="v2-push" data-dir={d.dir} aria-hidden="true">{d.dir === 'dry' ? '▼' : d.dir === 'wet' ? '▲' : '●'}</span>
        <div><div className="v2-driver-top"><b>{d.label}</b><span className="v2-driver-value">{d.value}</span></div><small>{d.indicator}</small><small className="v2-driver-push">{d.dir === 'dry' ? 'towards less water' : d.dir === 'wet' ? 'towards more water' : 'no clear push'}{f.ok ? ` · weight of evidence ${Math.round(d.weight * 100)}%` : ''}</small></div>
      </li>)}</ul> : <p className="v2-note">No rain or heat record exists for this place (small island or disputed area); El Niño is shown where known.</p>}
    </div>
  </div>;
}

export default function WorldHistory({ world, selection, onSelect }: { world: World | null; selection: Selection; onSelect: (s: Selection) => void }) {
  const [year, setYear] = useState(2015);
  const places = world ? selected(world, selection) : [];
  const data = useMemo(() => world ? places.map(p => bars(world, p)) : [], [world, places.map(p => p.key).join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const fits = useMemo(() => world ? places.map(p => fit(world, p, DEFAULT_OPTIONS)) : [], [world, places.map(p => p.key).join()]); // eslint-disable-line react-hooks/exhaustive-deps
  return <section className="history-section" id="history" aria-labelledby="history-title"><div className="wrap">
    <div className="section-heading"><div><div className="eyebrow"><span className="section-number">{sectionNumber('history')}</span> HISTORY · THE WHOLE EARTH</div><h2 id="history-title">Thirty-five years of water,<br /><em>seen from orbit.</em></h2></div><p className="section-description">Every year from 1984 to 2018 for the world, a continent, a country or two countries side by side, from Landsat, with the rain, heat and El Niño that went with it.</p></div>
    {!world ? <div className="v2-yearly-state" role="status">Loading the world record…</div> : <section className="v2-yearly" aria-labelledby="wh-title">
      <div className="v2-yearly-head wh-head"><div><h3 id="wh-title">Surface water by year</h3><p>Each bar is one year against the place’s own average. Select a year for details.</p></div>
        <PlacePicker world={world} value={selection} onChange={onSelect} /></div>
      {places.map((p, i) => <div key={p.key}><Strip data={data[i]} sel={year} onYear={setYear} label={p.name} tone={places.length > 1 ? (i ? 'b' : 'a') : undefined} />
        <p className="v2-yearly-mean">{p.name}: average {km(data[i].avg)} km² over {data[i].n} well-observed years.</p></div>)}
      <ul className="v2-yearstrip-legend" aria-label="Legend">{(Object.keys(CLASSES) as Cls[]).map(k => <li key={k} data-cls={k}><span className="v2-yr-icon" aria-hidden="true">{CLASSES[k].icon}</span>{CLASSES[k].label}<small>{CLASSES[k].hint}</small></li>)}</ul>
      <div className={places.length > 1 ? 'wh-cards two' : 'wh-cards'}>{places.map((p, i) => <YearCard key={p.key} world={world} place={p} f={fits[i]} data={data[i]} year={year} tone={places.length > 1 ? (i ? 'b' : 'a') : undefined} />)}</div>
    </section>}
    <div className="evidence-note">Landsat measures open surface water (permanent + seasonal) once a year; it does not see water under vegetation, and early years with few clear images are lower bounds. Country totals: EC JRC / UNEP SDG 6.6.1 (1984–2018). Rain and heat: Copernicus ERA5 via Our World in Data. El Niño: NOAA CPC. <a href="https://www.sdg661.app/" target="_blank" rel="noreferrer">UNEP freshwater explorer ↗</a> <a href="https://global-surface-water.appspot.com/" target="_blank" rel="noreferrer">JRC Global Surface Water ↗</a></div>
  </div></section>;
}
