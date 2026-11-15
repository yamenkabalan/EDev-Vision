'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { sectionNumber } from '@/lib/sections';

/*
  "What is RSynthesis AI?" — the first section under the opening screen.
  Three square cards read as a formula: DATA + AI = SYNTHESIS / ESTIMATION.
  Hovering (or focusing / tapping) a card makes it grow downwards and list
  short examples. Below, the longer story: raw data, why AI, our own
  algorithm, and how it was trained and tested. Numbers come from
  engine-summary.json (scripts/engine-summary.mts: the world engine tested on every country).
*/
type Card = { id: string; title: string; icon: ReactNode; lead: string; items: string[] };

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const ICONS = {
  data: <svg viewBox="0 0 64 64" aria-hidden="true" {...stroke}><rect x="25" y="25" width="14" height="14" rx="2" transform="rotate(45 32 32)" /><path d="M21 21 9 9M43 43l12 12" /><rect x="3" y="3" width="13" height="9" rx="1.5" transform="rotate(45 9.5 7.5)" /><rect x="48" y="52" width="13" height="9" rx="1.5" transform="rotate(45 54.5 56.5)" /><path d="M43 17c4 1 6.5 3.5 7.5 7.5M45 11c7 1.4 11 5.4 12.5 12.5" /><circle cx="32" cy="32" r="2.2" /></svg>,
  ai: <svg viewBox="0 0 64 64" aria-hidden="true" {...stroke}><rect x="16" y="16" width="32" height="32" rx="6" /><path d="M24 8v8M32 8v8M40 8v8M24 48v8M32 48v8M40 48v8M8 24h8M8 32h8M8 40h8M48 24h8M48 32h8M48 40h8" /><path d="M32 23c1.3 4.6 3.4 6.7 8 8-4.6 1.3-6.7 3.4-8 8-1.3-4.6-3.4-6.7-8-8 4.6-1.3 6.7-3.4 8-8Z" /></svg>,
  synth: <svg viewBox="0 0 64 64" aria-hidden="true" {...stroke}><path d="M6 14 22 8l20 6 16-6v42l-16 6-20-6-16 6Z" /><path d="M22 8v42M42 14v42" /><path d="M12 40c6-1 9-7 14-8s9 4 14 2 7-9 12-12" strokeDasharray="3 3" /><circle cx="52" cy="22" r="4" /><path d="m55 25 4 4" /></svg>,
};

type Summary = { countries_fitted: number; mean_years: number; loo_skill_median: number; loo_skill_positive: number; split_skill_median: number; world: { loo_skill: number | null; split_skill: number | null } };

export default function WhatIs() {
  const [open, setOpen] = useState<string | null>(null);
  const [sum, setSum] = useState<Summary | null>(null);
  useEffect(() => { fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/data/engine-summary.json`).then(r => r.ok ? r.json() : null).then(setSum).catch(() => {}); }, []);
  const cards: Card[] = [
    {
      id: 'data', title: 'Data', icon: ICONS.data, lead: 'Raw data from NASA radars and satellites',
      items: ['Global water · 266 countries · 1984–2018', 'NISAR L-band radar · every 12 days', 'NASA OPERA radar + optical water maps', 'VIIRS floods · GPM rain · VIIRS photo', 'Landsat water maps · 1984–2021', 'ERA5 rain and heat for every country', 'NOAA El Niño index · UNEP SDG 6.6.1 to 2022'],
    },
    {
      id: 'ai', title: 'AI', icon: ICONS.ai, lead: 'The power to read and interpret it',
      items: ['Reads radar physics: dark = open water', 'Finds water hidden under plants (bright double bounce)', 'Stacks 12 days of orbits into one picture', 'Weighs 32 combinations of causes for every country', 'Links causes: rain, heat, El Niño → water', 'Answers in plain words, for the place you choose', 'Flags uncertainty instead of guessing'],
    },
    {
      id: 'synth', title: 'Synthesis / Estimation', icon: ICONS.synth, lead: 'Our own algorithm + AI-powered mapping = the future of any country’s water, drawn by probability',
      items: ['A 0 → 1 chance for every country and year', 'Yearly projection up to 2030', 'Dry, typical and wet years', 'You choose the causes it may use', `Tested on years it never saw, in ${sum?.countries_fitted ?? 208} countries`],
    },
  ];
  const toggle = (id: string) => setOpen(o => (o === id ? null : id));

  return (
    <section className="what-section" id="what" aria-labelledby="what-title">
      <div className="wrap">
        <div className="what-head">
          <div className="eyebrow"><span className="section-number">{sectionNumber('what')}</span> OLD NASA DATA + AI = ESTIMATION</div>
          <h2 id="what-title">What is <em>RSynthesis AI?</em></h2>
          <p>Explore how inland surface water changed across countries from 1984 to 2018, then look at the whole Earth through radar. RSynthesis AI turns decades of raw satellite measurements into an estimate of where the water will be next.</p>
        </div>

        <div className="formula" role="list">
          {cards.map((c, i) => <div className="formula-slot" role="listitem" key={c.id}>
            {i > 0 && <span className="formula-op" aria-hidden="true">{i === 1 ? '+' : '='}</span>}
            <div className={`formula-card card-${c.id}`} data-open={open === c.id}
              onMouseEnter={() => setOpen(c.id)} onMouseLeave={() => setOpen(o => (o === c.id ? null : o))}>
              <button type="button" className="formula-face" aria-expanded={open === c.id} aria-controls={`card-${c.id}`}
                onClick={() => toggle(c.id)} onFocus={() => setOpen(c.id)}>
                <span className="formula-icon">{c.icon}</span>
                <span className="formula-title">{c.title}</span>
              </button>
              <div className="formula-drawer" id={`card-${c.id}`}>
                <div>
                  <p>{c.lead}</p>
                  <ul>{c.items.map(t => <li key={t}>{t}</li>)}</ul>
                </div>
              </div>
            </div>
          </div>)}
        </div>
        <p className="formula-hint">Hover or tap a card to open it.</p>

        <div className="what-story">
          <article>
            <span className="what-step">01</span>
            <h3>Raw data is not an answer.</h3>
            <p>A radar satellite does not send pictures of floods. It sends echoes: numbers that say how much microwave energy came back from each patch of ground. NISAR covers nearly all of Earth’s land every 12 days, and a single pass over one wetland is already millions of these numbers.</p>
            <p>Hidden in them are two kinds of water. Calm open water mirrors the signal away and looks <b>dark</b>. Water standing under reeds and papyrus bounces it back between water and stems, so it looks <b>bright</b>.</p>
            <SignalDiagram />
          </article>
          <article>
            <span className="what-step">02</span>
            <h3>An age that needs AI.</h3>
            <p>Nobody can read that much raw data by eye any more. Processing it now needs machine learning, so we used it for the question that matters most to the people and animals who live by every river, lake and wetland: <b>what comes next?</b></p>
            <p>We trained our model on decades of satellite water maps of every country so it can estimate the years that have not happened yet, instead of only describing the past.</p>
          </article>
          <article className="what-algorithm">
            <span className="what-step">03</span>
            <h3>Our own algorithm, living between 0 and 1.</h3>
            <p>Computers are built from 0s and 1s. Our algorithm lives between them: for every country and year it gives a <b>probability from 0 to 1</b> — the chance that its water ends below its own average, or below its worst year.</p>
            <div className="prob-strip" aria-label="Probability scale from 0 to 1">
              <span>0</span><i /><span>1</span>
              <code>P(less water) = Σ w·T(…)</code>
            </div>
            <p>It is built with <b>linear algebra</b> (a Bayesian regression solved for every combination of causes, for every country, in your browser), <b>discrete mathematics</b> (all 32 combinations of five possible causes — rain, last year’s rain, heat, El Niño, long-term trend — scored and weighed) and <b>advanced probability and statistics</b> (Bayesian evidence with a Zellner g-prior, a Scott–Berger prior on how many causes, heavy-tailed Student-t errors, cloudy years kept out as lower bounds, thousands of simulated years carrying the uncertainty all the way to the map).</p>
          </article>
          <article>
            <span className="what-step">04</span>
            <h3>Trained, then tested, then it redraws the map.</h3>
            <p>For each place the model learns from its well-observed Landsat years (on average {sum?.mean_years ?? 21.6} per country) and was tested on years it had never seen. The values it produces are what colour the map: year by year, country by country, up to 2030.</p>
            <div className="what-stats">
              <div><strong>{sum?.world.loo_skill?.toFixed(2) ?? '—'}</strong><span>skill for the whole world’s water, each year left out in turn</span></div>
              <div><strong>{sum ? `${Math.round(sum.loo_skill_positive * 100)}%` : '—'}</strong><span>of {sum?.countries_fitted ?? '—'} countries where it beats “always guess the average” (median skill {sum?.loo_skill_median.toFixed(2) ?? '—'})</span></div>
              <div><strong>{sum?.split_skill_median.toFixed(2) ?? '—'}</strong><span>median skill when trained to 2008 and asked about 2009–2018: the future is harder, and we say so</span></div>
            </div>
            <p className="what-note">Skill 0 = no better than always guessing the average; 1 = perfect. Details in <a href="#future">Future</a> and <a href="#sources">Sources</a>.</p>
          </article>
        </div>
      </div>
    </section>
  );
}

function SignalDiagram() {
  return <svg viewBox="0 0 340 150" className="signal-diagram" role="img" aria-label="Calm open water reflects the radar signal away (low return); water plus stems send it back (double bounce)"><defs><linearGradient id="what-water" x2="1" y2="0"><stop stopColor="#369ac4" stopOpacity=".05" /><stop offset=".5" stopColor="#369ac4" stopOpacity=".5" /><stop offset="1" stopColor="#369ac4" stopOpacity=".05" /></linearGradient></defs><path d="M10 110h140M192 110h138" stroke="url(#what-water)" strokeWidth="5" /><path d="m18 20 68 88 58-62" stroke="#64b7df" strokeWidth="1.4" fill="none" strokeDasharray="4 4" /><path d="m206 22 61 86 34-23-93-61" stroke="#b3d588" strokeWidth="1.4" fill="none" strokeDasharray="4 4" /><path d="M301 108V41m0 28-14-15m14 25 14-19M318 108V70m-38 39V82" stroke="#80a177" strokeWidth="2" /><text x="65" y="140" textAnchor="middle">OPEN WATER · DARK</text><text x="262" y="140" textAnchor="middle">UNDER REEDS · BRIGHT</text><circle cx="18" cy="20" r="3" fill="#9acde2" /><circle cx="206" cy="22" r="3" fill="#bbda94" /></svg>;
}
