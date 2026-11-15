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
  if (!f.ok) return [`There are too few well-observed years for ${place.name} to say what drives its water. The first step is simply more observation: radar sees through the clouds that hid it from Landsat.`];
  const out: string[] = [];
  const rainW = Math.max(f.pip.rain, f.pip.rain1), oni = world.doc.oni.latest;
  if (rainW > .5) out.push(`Rain decides much of ${place.name === 'the world' ? 'the world' : place.name}’s water (weight ${prob(rainW)}). Seasonal rain outlooks, read every year, give months of warning before a dry year reaches its lakes and rivers.`);
  if (f.pip.enso > .5) out.push(`The Pacific matters here (weight ${prob(f.pip.enso)}): El Niño has pushed ${place.name} towards ${f.effect.enso < 0 ? 'less' : 'more'} water. NOAA’s index stood at ${oni.value > 0 ? '+' : ''}${oni.value.toFixed(1)} in ${oni.season} ${oni.year} — ${oni.value >= 1.5 ? 'a strong El Niño' : oni.value >= .5 ? 'an El Niño' : 'no strong event'}${oni.value >= .5 && f.effect.enso < 0 ? ', so preparing for a drier year now is prudent' : ''}.`);
  if (f.pip.heat > .5) out.push(`Heat counts (weight ${prob(f.pip.heat)}): warmer years ${f.effect.heat < 0 ? 'took water away, through evaporation' : 'came with more water, likely from melting snow and ice'}. Plans should assume the heat of recent years, not of the 1990s.`);
  if (f.trendPerDecade !== null && f.pip.trend > .5) out.push(f.trendPerDecade < 0
    ? `With rain and heat held equal, water still falls by about ${pctText(Math.abs(f.trendPerDecade), 1).slice(1)} a decade. Something besides weather is taking it — withdrawals, diversions or upstream dams — and that is where action should start.`
    : `With rain and heat held equal, water rises by about ${pctText(f.trendPerDecade, 1)} a decade. New reservoirs, melting ice or simply better satellite coverage can all do this; it should be checked on the ground before it is called good news.`);
  if (!out.length) out.push(`No single cause stands out for ${place.name}: its water changes for local reasons the yearly records here cannot see. Local gauges and radar monitoring are the way to find them.`);
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
      <h3 className="sol-heading"><span>A</span> Where water was lost, and why</h3>
      <div className="drought-strip" role="list" aria-label="Largest losses">
        {losers.map(r => { const ra = rainAnomaly(world.doc, r.place, 2016) !== undefined ? mean([2016, 2017, 2018].map(y => rainAnomaly(world.doc, r.place, y) ?? 0)) : undefined, heat = climateAt(world.doc, r.place.ta, 2018);
          return <div role="listitem" key={r.place.key} className="drought-year sol-loss"><strong>{r.place.name}</strong>
            <span>{pctText(r.change, 1)}<small>surface water, 2000–02 → 2016–18 ({km(r.early)} → {km(r.late)} km²)</small></span>
            <span>{ra === undefined ? '—' : `${ra > 0 ? '+' : '−'}${Math.abs(Math.round(ra))}%`}<small>rain 2016–18 vs normal</small></span>
            <span>{heat === undefined ? '—' : `${heat > 0 ? '+' : '−'}${Math.abs(heat).toFixed(1)} °C`}<small>heat in 2018</small></span></div>; })}
      </div>
      <p className="sol-foot">The four countries with more than 1,000 km² of water that lost the largest share between 2000–02 and 2016–18 (well-observed years only). Of {big.length} such countries, {big.filter(r => r.change < 0).length} lost water and {big.filter(r => r.change > 0).length} gained — part of the gain is better satellite coverage, not more water.</p>
      <div className="cause-grid">
        <article><span className="cause-tag">Rain</span><h4>Water is decided upstream, in the sky.</h4><p>In {rainLed} of {fitted.length} countries the engine gives rain — this year’s or last year’s — more than half the weight. A dry year can be seen coming months before the lakes shrink.</p></article>
        <article><span className="cause-tag">Heat</span><h4>Heat takes what arrives.</h4><p>Heat carries real weight in {heatLed} countries. The world was {worldHeat !== undefined ? `${worldHeat.toFixed(2)} °C` : 'much'} warmer in 2024 than the 1991–2020 average (ERA5): more water leaves as vapour, and snow and ice melt earlier.</p></article>
        <article><span className="cause-tag">Beyond weather</span><h4>Same rain, different water.</h4><p>With rain and heat held equal, water still falls steadily in {trendDown} countries and rises in {trendUp}. The published global study found that over 70% of the world’s net loss of permanent water happened in the Middle East and Central Asia, tied to drought and to river diversion, dams and unregulated withdrawal (Pekel et al. 2016).</p></article>
        <article><span className="cause-tag">El Niño</span><h4>One ocean, every continent.</h4><p>The Pacific’s El Niño and La Niña carry weight in {ensoLed} countries far from the Pacific. In {world.doc.oni.latest.season} {world.doc.oni.latest.year} NOAA’s index reached {world.doc.oni.latest.value > 0 ? '+' : ''}{world.doc.oni.latest.value.toFixed(2)}: a strong El Niño is under way.</p></article>
      </div>

      <h3 className="sol-heading"><span>B</span> What should have been done — and what to do now</h3>
      <ol className="lesson-list">
        <li><span>01</span><div><h4>Warn early, every season.</h4><p>Rain and El Niño are measured months before the water arrives. A yearly outlook per basin — like the projection in Future — gives time to prepare reservoirs, farms, herds and water supply. With a strong El Niño now under way, regions it usually dries (southern Africa, South and Southeast Asia, Australia, northern South America) should prepare first.</p></div></li>
        <li><span>02</span><div><h4>Protect where water is born.</h4><p>Most rivers and wetlands are fed far upstream, often in another country. Headwater forests, wetlands and aquifers should be protected, and every dam, diversion or irrigation scheme should be tested for its effect downstream before it is built.</p></div></li>
        <li><span>03</span><div><h4>Share measurements across borders.</h4><p>153 countries share rivers, lakes or aquifers with a neighbour (UN-Water). Open rain and river gauges, shared in time, would sharpen every forecast on this page.</p></div></li>
        <li><span>04</span><div><h4>Watch through clouds and under plants.</h4><p>Early Landsat years missed up to half the world’s water behind clouds and gaps, and optical satellites never see water under vegetation. Monitoring should be built on radar — NISAR every 12 days, Sentinel-1 radar water maps — as in the Radar section.</p></div></li>
        <li><span>05</span><div><h4>Plan for a hotter world.</h4><p>Water plans drawn on the climate of the 1990s will be wrong. They should use recent heat, count evaporation, and assume dry years will come more often where the engine finds heat and rain falling together.</p></div></li>
      </ol>

      {place && <div className="sol-place">
        <div className="sol-place-head"><div><div className="eyebrow">FOR THE PLACE YOU CHOSE</div><h3>{place.name}</h3></div><PlacePicker world={world} value={selection.mode === 'compare' ? { ...selection, mode: 'country' } : selection} onChange={onSelect} allowCompare={false} compact /></div>
        <ul className="sol-advice">{pf && advice(world, place, pf).map(t => <li key={t}>{t}</li>)}</ul>
      </div>}
      <p className="sol-foot">Recommendations are ours. They rest on the world data shown on this site (EC JRC / UNEP SDG 6.6.1, ERA5, NOAA ONI) and on published work: Pekel et al. (2016) for global surface water change and UN-Water for shared basins. Drivers are associations, not proven causes.</p>
    </>}
  </div></section>;
}
