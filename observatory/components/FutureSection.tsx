'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { AssistantChat, ChatContext } from '@/lib/assistant';
import { chanceBelow, futureImage, km, pct, type FutureDoc, type Scenario } from '@/lib/future';
import { sectionNumber } from '@/lib/sections';
import ChatPanel from './ChatPanel';
import LazyRegion from './LazyRegion';

const RadarMap = dynamic(() => import('./RadarMap'), { ssr: false, loading: () => <div className="map-skeleton">Preparing the projection map…</div> });

/*
  Future with our private algorithm: the RSynthesis estimation engine's
  probability map for 2026-2030 (pipeline/future.py), its numbers and how it
  was tested, with the AI chat beside it.
*/
const SCEN: { id: Scenario; label: string; note: string }[] = [
  { id: 'expected', label: 'Expected', note: 'averaged over every way the year could turn out' },
  { id: 'dry', label: 'Dry year', note: 'if the year turns dry: 10th percentile of the forecast' },
  { id: 'wet', label: 'Wet year', note: 'if the year turns wet: 90th percentile of the forecast' },
];
const DROUGHTS = [2019, 2021, 2023, 2024];

type Props = { future: FutureDoc | null; failed: boolean; chat: AssistantChat; context?: ChatContext; onRetry: () => void };

export default function FutureSection({ future, failed, chat, context, onRetry }: Props) {
  const [year, setYear] = useState(2030);
  const [scenario, setScenario] = useState<Scenario>('expected');
  const p = future?.projection.find(r => r.year === year) ?? future?.projection.at(-1);
  const mean = future?.climatology.mean_km2;
  const shown = p ? (scenario === 'dry' ? p.p10_km2 : scenario === 'wet' ? p.p90_km2 : p.map_km2.expected) : null;
  const s1 = future?.stage1, v = future?.stage2.validation;
  const drought = v ? DROUGHTS.map(y => v.per_year.find(r => r.year === y)?.brier_skill_full).filter((x): x is number => typeof x === 'number') : [];
  const ramp = future ? `linear-gradient(90deg, ${future.legend.map(l => `rgba(${l.color[0]},${l.color[1]},${l.color[2]},${(l.color[3] / 255).toFixed(2)}) ${Math.round(l.p * 100)}%`).join(', ')})` : undefined;

  return (
    <section className="future-section" id="future" aria-labelledby="future-title">
      <div className="wrap">
        <div className="section-heading">
          <div><div className="eyebrow"><span className="section-number">{sectionNumber('future')}</span> FUTURE · OUR PRIVATE ALGORITHM</div><h2 id="future-title">The delta to 2030,<br /><em>drawn by probability.</em></h2></div>
          <p className="section-description">Every pixel gets a chance of holding open water, from 0 to 1. Choose a year and a kind of year; ask the AI beside the map.</p>
        </div>

        <div className="future-layout">
          <div className="future-main">
            {!future ? <div className="feed-placeholder" role="status"><span className="loading-orbit" /><h3>{failed ? 'The projection is unavailable.' : 'Loading the projection…'}</h3><p>{failed ? 'future.json could not be read from the data feed.' : 'Reading the RSynthesis engine output.'}</p>{failed && <button className="small-button" onClick={onRetry}>Retry ↻</button>}</div> : <>
              <div className="future-controls">
                <div className="seg" role="radiogroup" aria-label="Projection year">
                  {future.projection.map(r => <button key={r.year} type="button" role="radio" aria-checked={year === r.year} className={year === r.year ? 'active' : ''} onClick={() => setYear(r.year)}>{r.year}</button>)}
                </div>
                <div className="seg seg-small" role="radiogroup" aria-label="Kind of year">
                  {SCEN.map(s => <button key={s.id} type="button" role="radio" aria-checked={scenario === s.id} className={scenario === s.id ? 'active' : ''} onClick={() => setScenario(s.id)}>{s.label}</button>)}
                </div>
              </div>

              <div className="future-map-row">
                <div className="future-map">
                  <LazyRegion label="The projection map loads as you approach."><RadarMap dates={[futureImage(p!.year, scenario)]} source="future" opacity={.95} /></LazyRegion>
                  <div className="future-legend"><span>Chance of open water</span><i style={{ background: ramp }} /><small><b>5%</b><b>50%</b><b>95%</b></small></div>
                </div>
                {p && <div className="future-stats" aria-live="polite">
                  <div className="eyebrow">{p.year} · {SCEN.find(s => s.id === scenario)!.label.toUpperCase()}</div>
                  <div className="g-big"><strong>{km(shown!)}</strong><span>km² of open water {scenario === 'expected' ? 'expected' : 'in this case'}</span></div>
                  <p className="future-scen-note">{SCEN.find(s => s.id === scenario)!.note}.</p>
                  <dl>
                    <div><dt>80% range</dt><dd>{km(p.p10_km2)}–{km(p.p90_km2)} km²</dd></div>
                    {mean && <div><dt>Compared with {future.climatology.years[0]}–{future.climatology.years[1]} average</dt><dd>{shown! >= mean ? '+' : '−'}{Math.round(Math.abs(shown! / mean - 1) * 100)}%</dd></div>}
                    <div><dt>Rain in Angola</dt><dd>{p.rain_known ? `already fallen · ${p.rain_mm} mm` : 'not fallen yet'}</dd></div>
                    <div><dt>Chance of a 2019-like year</dt><dd>{pct(chanceBelow(p, 376))}</dd></div>
                    {p.likely_km2 != null && scenario === 'expected' && <div><dt>Area with a 50%+ chance</dt><dd>{km(p.likely_km2)} km²</dd></div>}
                  </dl>
                </div>}
              </div>

              <div className="trend-callout">
                <strong>Same rain, less water.</strong>
                <p>With every cause held at a normal year, open water in this area falls about <b>{Math.abs(s1!.coef.c2_km2_per_year).toFixed(0)} km² a year over {s1!.years[0]}–{s1!.years[1]}</b> (z = {s1!.t_values.year}), while rain in Angola shows no significant trend (t = {s1!.rain_trend_t}). That is why the line bends down after 2026. Part of it may be water moving between channels of the Delta or a long dry phase — see <a href="#solutions">What should be done</a>.</p>
              </div>

              <ol className="engine-steps">
                <li><span>01</span><strong>Learn</strong><p>{s1!.n_years} well-observed years of Landsat water maps; {km(future.stage2.pixels)} pixels of {future.stage2.pixel_m} m that were ever wet.</p></li>
                <li><span>02</span><strong>How much</strong><p>Rain in the Angolan highlands + the long-term trend, with rain over the Delta and El Niño / La Niña weighed in → the year’s open water. Typical error {km(s1!.loo_rmse_km2)} km² with each year left out{s1!.v1 ? ` (first version: ${km(s1!.v1.loo_rmse_km2)})` : ''}; skill {s1!.chrono_skill.toFixed(2)} when trained on 1989–2012 and tested on 2013–2025.</p></li>
                <li><span>03</span><strong>Where</strong><p>A Bayesian probability model for every pixel learns where water stays in dry years and where it spreads in wet ones.</p></li>
                <li><span>04</span><strong>Redraw</strong><p>Both combine into a 0 → 1 chance per pixel, scaled so the map holds exactly the projected area.</p></li>
              </ol>
              <p className="future-validation">Tested by hiding each year and redrawing it: from the yearly causes alone, the map’s error is {Math.round((v!.brier_skill_full ?? 0) * 100)}% smaller than an “average year” map{drought.length ? <>, and {Math.round(Math.min(...drought) * 100)}–{Math.round(Math.max(...drought) * 100)}% smaller in the drought years {DROUGHTS.join(', ')}</> : null}. A statistical projection, not a certainty: it maps open water only, not water under reeds.</p>
            </>}
          </div>
          <aside className="future-chat" aria-label="AI chat about the projection">
            <ChatPanel chat={chat} context={context} size="side" title="Ask about the future"
              intro="Ask the Delta AI about the projection, the trend or a past year. It answers only from our data."
              prompts={['What does the projection say for 2028?', 'How sure is the 2030 estimate?', 'Why is open water trending down?', 'What happened in the 2019 drought?']} />
          </aside>
        </div>
      </div>
    </section>
  );
}
