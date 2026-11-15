'use client';
import { useMemo } from 'react';
import { DEFAULT_OPTIONS, inText, climateAt, fit, km, mean, pctText, prob, rainAnomaly, selected, series, usable, type Fit, type Place, type Selection, type World } from '@/lib/world';
import { sectionNumber } from '@/lib/sections';
import PlacePicker from './PlacePicker';

/*
  08 · What should be done: why surface water changed across the world and
  what that teaches. Every count is computed here from the same engine run on
  every country (default options); the recommendations are ours. Associations,
  not proof.
*/
type Row = { place: Place; f: Fit; early: number; late: number; change: number };

function lossRows(world: World): Row[] {
  return world.countries.map(place => {
    const good = usable(series(place, world.years));
    const e = good.filter(p => p.year >= 2000 && p.year <= 2002).map(p => p.value), l = good.filter(p => p.year >= 2016).map(p => p.value);
    if (e.length < 2 || l.length < 2) return null;
    const early = mean(e), late = mean(l);
    return { place, f: fit(world, place, DEFAULT_OPTIONS), early, late, change: late / early - 1 };
  }).filter((r): r is Row => !!r);
}

function advice(world: World, p: Place, f: Fit) {
  const place = { name: inText(p) };
  if (!f.ok) return [`There are too few well-observed years to fit the model for ${place.name}. Local gauges and radar observations can help fill the record.`];
  const out: string[] = [];
  const rainW = Math.max(f.pip.rain, f.pip.rain1), oni = world.doc.oni.latest;
  if (rainW > .5) out.push(`Rain is frequently included in the fitted models for ${place.name} (weight ${prob(rainW)}). Compare seasonal rain outlooks with local river and lake observations.`);
  if (f.pip.enso > .5) out.push(`Higher ENSO values are associated with ${f.effect.enso < 0 ? 'less' : 'more'} mapped surface water in ${place.name} (weight ${prob(f.pip.enso)}). The latest ONI value in our data is ${oni.value > 0 ? '+' : ''}${oni.value.toFixed(1)} °C for ${oni.season} ${oni.year}.`);
  if (f.pip.heat > .5) out.push(`Warmer years were associated with ${f.effect.heat < 0 ? 'less' : 'more'} mapped surface water (weight ${prob(f.pip.heat)}). Evaporation and snowmelt records would help explain the pattern.`);
  if (f.trendPerDecade !== null && f.pip.trend > .5) out.push(f.trendPerDecade < 0
    ? `Holding other model inputs steady, the fitted trend is about ${pctText(f.trendPerDecade, 1)} per decade. Check local withdrawal, diversion and upstream reservoir records alongside the trend.`
    : `Holding other model inputs steady, the fitted trend is about ${pctText(f.trendPerDecade, 1)} per decade. Local records can help assess changes in reservoirs, snow and ice, and satellite coverage.`);
  if (!out.length) out.push(`No input had a strong inclusion weight for ${place.name}. Local gauges and radar monitoring can help describe its water changes.`);
  return out;
}

export default function WorldSolutions({ world, selection, onSelect }: { world: World | null; selection: Selection; onSelect: (s: Selection) => void }) {
  const rows = useMemo(() => world ? lossRows(world) : [], [world]);
  const big = rows.filter(r => r.early > 1000);
  const losers = [...big].sort((a, b) => a.change - b.change).slice(0, 4);
  const fitted = rows.filter(r => r.f.ok);
  const count = (pred: (f: Fit) => boolean) => fitted.filter(r => pred(r.f)).length;
  const rainLed = count(f => Math.max(f.pip.rain, f.pip.rain1) > .5), heatLed = count(f => f.pip.heat > .5), ensoLed = count(f => f.pip.enso > .5);
  const trendDown = count(f => f.pip.trend > .5 && (f.trendPerDecade ?? 0) < 0), trendUp = count(f => f.pip.trend > .5 && (f.trendPerDecade ?? 0) > 0);
  const place = world ? selected(world, selection)[0] : null;
  const pf = useMemo(() => world && place ? fit(world, place, DEFAULT_OPTIONS) : null, [world, place?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  const worldHeat = world ? climateAt(world.doc, world.byKey.get('gworld')!.ta, 2024) : undefined;

  return <section className="solutions-section" id="solutions" aria-labelledby="solutions-title"><div className="wrap">
    <div className="section-heading"><div><div className="eyebrow"><span className="section-number">{sectionNumber('solutions')}</span> WHAT SHOULD BE DONE</div><h2 id="solutions-title">What the dry years teach,<br /><em>and what should have been done.</em></h2></div><p className="section-description">The same engine, run on every country: where water was lost, what went with it, and what that asks of us. Associations, not proof.</p></div>
    {!world ? <div className="chart-wait" role="status">Loading the world record…</div> : <>
      <h3 className="sol-heading"><span>A</span> Where mapped water declined</h3>
      <div className="drought-strip" role="list" aria-label="Largest losses">
        {losers.map(r => { const ra = rainAnomaly(world.doc, r.place, 2016) !== undefined ? mean([2016, 2017, 2018].map(y => rainAnomaly(world.doc, r.place, y) ?? 0)) : undefined, heat = climateAt(world.doc, r.place.ta, 2018);
          return <div role="listitem" key={r.place.key} className="drought-year sol-loss"><strong>{r.place.name}</strong>
            <span>{pctText(r.change, 1)}<small>surface water, 2000–02 → 2016–18 ({km(r.early)} → {km(r.late)} km²)</small></span>
            <span>{ra === undefined ? '—' : `${ra > 0 ? '+' : '−'}${Math.abs(Math.round(ra))}%`}<small>rain 2016–18 vs normal</small></span>
            <span>{heat === undefined ? '—' : `${heat > 0 ? '+' : '−'}${Math.abs(heat).toFixed(1)} °C`}<small>heat in 2018</small></span></div>; })}
      </div>
      <p className="sol-foot">The four countries with more than 1,000 km² of water that lost the largest share between 2000–02 and 2016–18 (well-observed years only). Of {big.length} such countries, {big.filter(r => r.change < 0).length} lost water and {big.filter(r => r.change > 0).length} gained — part of the gain is better satellite coverage, not more water.</p>
      <div className="cause-grid">
        <article><span className="cause-tag">Rain</span><h4>Rain and mapped water.</h4><p>Rain or prior-year rain has an inclusion weight above 50% in {rainLed} of {fitted.length} fitted countries.</p></article>
        <article><span className="cause-tag">Heat</span><h4>Temperature and mapped water.</h4><p>Temperature has an inclusion weight above 50% in {heatLed} fitted countries. {worldHeat !== undefined ? `ERA5 shows 2024 was ${worldHeat.toFixed(2)} °C warmer worldwide than the 1991–2020 average.` : ''}</p></article>
        <article><span className="cause-tag">Trend</span><h4>Same rain, different water.</h4><p>Holding the other inputs steady, the fitted trend has an inclusion weight above 50% and points down in {trendDown} countries and up in {trendUp}. Pekel et al. (2016) found that over 70% of the world’s net loss of permanent water occurred in the Middle East and Central Asia.</p></article>
        <article><span className="cause-tag">El Niño</span><h4>One ocean, many regions.</h4><p>ENSO has an inclusion weight above 50% in {ensoLed} fitted countries. The latest NOAA ONI in this dataset is {world.doc.oni.latest.value > 0 ? '+' : ''}{world.doc.oni.latest.value.toFixed(2)} °C for {world.doc.oni.latest.season} {world.doc.oni.latest.year}.</p></article>
      </div>

      <h3 className="sol-heading"><span>B</span> What should have been done — and what to do now</h3>
      <ol className="lesson-list">
        <li><span>01</span><div><h4>Warn early, every season.</h4><p>Pair seasonal rain outlooks with local river gauges to track when water reaches a basin. The Future section estimates annual water area at country, continent or world scale.</p></div></li>
        <li><span>02</span><div><h4>Protect where water is born.</h4><p>Most rivers and wetlands are fed far upstream, often in another country. Headwater forests, wetlands and aquifers should be protected, and every dam, diversion or irrigation scheme should be tested for its effect downstream before it is built.</p></div></li>
        <li><span>03</span><div><h4>Share measurements across borders.</h4><p>153 countries share rivers, lakes or aquifers with a neighbour (UN-Water). Shared rain and river gauge data can help test forecasts at basin scale.</p></div></li>
        <li><span>04</span><div><h4>Watch through clouds and under plants.</h4><p>Early Landsat years missed up to half the world’s water behind clouds and gaps, and optical satellites never see water under vegetation. Monitoring should be built on radar — NISAR every 12 days, Sentinel-1 radar water maps — as in the Radar section.</p></div></li>
        <li><span>05</span><div><h4>Plan for changing conditions.</h4><p>Use recent measurements of temperature, evaporation and water use when updating water plans.</p></div></li>
      </ol>

      {place && <div className="sol-place">
        <div className="sol-place-head"><div><div className="eyebrow">FOR THE PLACE YOU CHOSE</div><h3>{place.name}</h3></div><PlacePicker world={world} value={selection.mode === 'compare' ? { ...selection, mode: 'country' } : selection} onChange={onSelect} allowCompare={false} compact /></div>
        <ul className="sol-advice">{pf && advice(world, place, pf).map(t => <li key={t}>{t}</li>)}</ul>
      </div>}
      <p className="sol-foot">Recommendations are ours. They rest on the world data shown on this site (EC JRC / UNEP SDG 6.6.1, ERA5, NOAA ONI) and on published work: Pekel et al. (2016) for global surface water change and UN-Water for shared basins. Drivers are associations, not proven causes.</p>
    </>}
  </div></section>;
}
