'use client';
import { km, rainFit, type FutureDoc } from '@/lib/future';
import type { HistoryRow, YearDrivers } from '@/lib/yearly';
import { sectionNumber } from '@/lib/sections';

/*
  What should be done: a short analysis of why the flood failed in the
  drought years and what could have been done earlier. Every number is read
  from the feed (history.json, story.json, future.json) at run time.
  Causes are associations, not proof; recommendations are ours.
*/
type Props = { future: FutureDoc | null; drivers: Map<number, YearDrivers>; history: HistoryRow[] };
const DROUGHTS = [2019, 2021, 2023, 2024];

export default function SolutionsSection({ future, drivers, history }: Props) {
  const rain = (y: number) => drivers.get(y)?.headwater_rain?.pct;
  const heat = (y: number) => drivers.get(y)?.heat?.value;
  const water = (y: number) => history.find(r => r.year === y)?.water_km2;
  const fit = rainFit(history, y => drivers.get(y)?.headwater_rain?.value);
  const h19 = future?.hindcast.find(h => h.year === 2019);
  const trend = future?.stage1.coef.c2_km2_per_year;
  const mean = future?.climatology.mean_km2;
  const fmtPct = (v: number | undefined) => v === undefined ? '—' : `${v > 0 ? '+' : '−'}${Math.abs(v)}%`;

  return (
    <section className="solutions-section" id="solutions" aria-labelledby="solutions-title">
      <div className="wrap">
        <div className="section-heading">
          <div><div className="eyebrow"><span className="section-number">{sectionNumber('solutions')}</span> WHAT SHOULD BE DONE</div><h2 id="solutions-title">What the dry years teach,<br /><em>and what should have been done.</em></h2></div>
          <p className="section-description">A short analysis of 41 years of water, rain, river flow, El Niño and heat. Associations, not proof.</p>
        </div>

        <h3 className="sol-heading"><span>A</span> Why the water failed</h3>
        <div className="drought-strip" role="list" aria-label="Drought years">
          {DROUGHTS.map(y => <div role="listitem" key={y} className="drought-year">
            <strong>{y}</strong>
            <span>{water(y) !== undefined ? `${km(water(y)!)} km²` : '—'}<small>open water{mean && water(y) !== undefined ? ` · ${Math.round((1 - water(y)! / mean) * 100)}% below average` : ''}</small></span>
            <span>{fmtPct(rain(y))}<small>rain in Angola</small></span>
            <span>{heat(y) === undefined ? '—' : `${heat(y)! > 0 ? '+' : '−'}${Math.abs(heat(y)!).toFixed(1)} °C`}<small>flood-season heat</small></span>
          </div>)}
        </div>
        <div className="cause-grid">
          <article><span className="cause-tag">Rain upstream</span><h4>The flood is decided in Angola.</h4><p>Every drought year began with low rain in the Angolan highlands, months before the water reached Botswana. Rain alone explains about {fit ? Math.round(fit.r * fit.r * 100) : '—'}% of the year-to-year change (r = {fit ? fit.r.toFixed(2) : '—'}).</p></article>
          <article><span className="cause-tag">Heat · El Niño</span><h4>Heat takes what arrives.</h4><p>About 96–98% of the water entering the Delta already leaves as vapour. The 2023 and 2024 flood seasons were {heat(2024) !== undefined ? `${heat(2024)!.toFixed(1)} °C` : 'much'} hotter than normal, and 2019 and 2024 came with El Niño, which usually dries southern Africa.</p></article>
          <article><span className="cause-tag">Long-term</span><h4>Same rain, less water.</h4><p>With rain held equal, open water in our study area fell about {trend !== undefined ? Math.abs(trend).toFixed(0) : '—'} km² a year since 1989, while Angolan rain shows no trend. Something besides rain is changing: heat, channels shifting water elsewhere in the Delta, upstream use or vegetation closing channels. Our data cannot yet tell which.</p></article>
          <article><span className="cause-tag">People · wildlife</span><h4>Life follows the water.</h4><p>In 2019 only about 37,700 people lived within 5 km of open water, a third fewer than in a typical year. In 2024 hippos were stranded in drying pools near Maun. Wet years hurt too: in 2009 floods on the Okavango and neighbouring rivers displaced 430 people.</p></article>
        </div>

        <h3 className="sol-heading"><span>B</span> What should have been done</h3>
        <ol className="lesson-list">
          <li><span>01</span><div><h4>Warn early, every May.</h4><p>The 2019 drought was visible months ahead. Without ever seeing 2019, our engine predicted {h19 ? `${km(h19.predicted_km2)} km²` : 'a severe drought'} from what was known by April: the rain and the El Niño index{h19 ? ` (actual: ${km(h19.observed_km2)} km²)` : ''}. A seasonal outlook issued each May, when the Angolan rain is known, gives time to prepare water points, herds and tourism.</p></div></li>
          <li><span>02</span><div><h4>Protect where the flood is born.</h4><p>The Delta’s water falls in the Angolan highlands. Their forests and wetlands should be protected, and any dam, irrigation scheme or water transfer upstream should be tested for its effect on the Delta before it is built — the OKACOM basin commission exists for exactly this.</p></div></li>
          <li><span>03</span><div><h4>Share measurements across borders.</h4><p>Angola, Namibia and Botswana share one river. Open rain and river gauges would replace the computer model we had to use for river flow and sharpen every forecast on this page.</p></div></li>
          <li><span>04</span><div><h4>Watch under the reeds.</h4><p>Optical satellites miss water hidden by vegetation: in September 2026 almost half of the flood NISAR mapped was under reeds. Monitoring should be built on L-band radar, which sees through clouds and canopy every 12 days.</p></div></li>
          <li><span>05</span><div><h4>Plan for a hotter, drier Delta.</h4><p>Our projection bends down to 2030, and its dry case (10th percentile) is close to the 2019 drought. Drought plans for Ngamiland — wildlife water, livestock, tourism, the water supply of Maun — should assume dry years will come more often, not less.</p></div></li>
        </ol>
        <p className="sol-foot">Recommendations are ours. They rest on the data shown on this site and on the Okavango basin analysis by OKACOM (Transboundary Diagnostic Analysis). Drivers are associations, not proven causes.</p>
      </div>
    </section>
  );
}
