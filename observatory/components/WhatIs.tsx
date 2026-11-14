'use client';
import { useState, type ReactNode } from 'react';
import type { FutureDoc } from '@/lib/future';
import { sectionNumber } from '@/lib/sections';

/*
  "What is RSynthesis AI?" — the first section under the opening screen.
  Three square cards read as a formula: DATA + AI = SYNTHESIS / ESTIMATION.
  Hovering (or focusing / tapping) a card makes it grow downwards and list
  short examples. Below, the longer story: raw data, why AI, our own
  algorithm, and how it was trained and tested. Numbers come from future.json.
*/
type Card = { id: string; title: string; icon: ReactNode; lead: string; items: string[] };

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const ICONS = {
  data: <svg viewBox="0 0 64 64" aria-hidden="true" {...stroke}><rect x="25" y="25" width="14" height="14" rx="2" transform="rotate(45 32 32)" /><path d="M21 21 9 9M43 43l12 12" /><rect x="3" y="3" width="13" height="9" rx="1.5" transform="rotate(45 9.5 7.5)" /><rect x="48" y="52" width="13" height="9" rx="1.5" transform="rotate(45 54.5 56.5)" /><path d="M43 17c4 1 6.5 3.5 7.5 7.5M45 11c7 1.4 11 5.4 12.5 12.5" /><circle cx="32" cy="32" r="2.2" /></svg>,
  ai: <svg viewBox="0 0 64 64" aria-hidden="true" {...stroke}><rect x="16" y="16" width="32" height="32" rx="6" /><path d="M24 8v8M32 8v8M40 8v8M24 48v8M32 48v8M40 48v8M8 24h8M8 32h8M8 40h8M48 24h8M48 32h8M48 40h8" /><path d="M32 23c1.3 4.6 3.4 6.7 8 8-4.6 1.3-6.7 3.4-8 8-1.3-4.6-3.4-6.7-8-8 4.6-1.3 6.7-3.4 8-8Z" /></svg>,
  synth: <svg viewBox="0 0 64 64" aria-hidden="true" {...stroke}><path d="M6 14 22 8l20 6 16-6v42l-16 6-20-6-16 6Z" /><path d="M22 8v42M42 14v42" /><path d="M12 40c6-1 9-7 14-8s9 4 14 2 7-9 12-12" strokeDasharray="3 3" /><circle cx="52" cy="22" r="4" /><path d="m55 25 4 4" /></svg>,
};

export default function WhatIs({ future }: { future: FutureDoc | null }) {
  const [open, setOpen] = useState<string | null>(null);
  const s1 = future?.stage1, v = future?.stage2.validation;
  const drought = v?.per_year.find(r => r.year === 2019)?.brier_skill_full ?? null;
  const pixels = future ? new Intl.NumberFormat('en').format(Math.round(future.stage2.pixels / 1000) * 1000) : '367,000';
  const cards: Card[] = [
    {
      id: 'data', title: 'Data', icon: ICONS.data, lead: 'Raw data from NASA radars and satellites',
      items: ['NISAR L-band radar · HH + HV', '10 passes · Jun–Oct 2026 · every 12 days', '41 years of Landsat water maps', 'JRC water history · 1984–2024', 'ERA5 rain · GloFAS river flow', 'NOAA El Niño index · NASA POWER heat', 'NASA OPERA water map · VIIRS photo'],
    },
    {
      id: 'ai', title: 'AI', icon: ICONS.ai, lead: 'The power to read and interpret it',
      items: ['Reads radar physics: dark = open water', 'Finds water hidden under reeds (bright HH)', 'Cleans radar speckle across 10 dates', 'Learns where water goes in wet and dry years', 'Links causes: rain → river → flood', 'Answers questions in plain words', 'Flags uncertainty instead of guessing'],
    },
    {
      id: 'synth', title: 'Synthesis / Estimation', icon: ICONS.synth, lead: 'Our own algorithm + AI-powered mapping = the delta’s future, drawn as a probability map',
      items: ['A 0 → 1 chance of water for every 120 m pixel', 'Yearly projection up to 2030', 'Dry, expected and wet scenarios', `Tested on ${s1?.n_years ?? 27} years it never saw`],
    },
  ];
  const toggle = (id: string) => setOpen(o => (o === id ? null : id));

  return (
    <section className="what-section" id="what" aria-labelledby="what-title">
      <div className="wrap">
        <div className="what-head">
          <div className="eyebrow"><span className="section-number">{sectionNumber('what')}</span> OLD NASA DATA + AI = ESTIMATION</div>
          <h2 id="what-title">What is <em>RSynthesis AI?</em></h2>
          <p>A system that turns decades of raw satellite measurements into an estimate of where the Okavango’s water will be next.</p>
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
            <p>A radar satellite does not send pictures of floods. It sends echoes: numbers that say how much microwave energy came back from each patch of ground. NISAR covers nearly all of Earth’s land every 12 days, and a single pass over our study area is already millions of these numbers.</p>
            <p>Hidden in them are two kinds of water. Calm open water mirrors the signal away and looks <b>dark</b>. Water standing under reeds and papyrus bounces it back between water and stems, so it looks <b>bright</b>.</p>
            <SignalDiagram />
          </article>
          <article>
            <span className="what-step">02</span>
            <h3>An age that needs AI.</h3>
            <p>Nobody can read that much raw data by eye any more. Processing it now needs machine learning, so we used it for the question that matters most to the people and animals of the Delta: <b>what comes next?</b></p>
            <p>We trained our model on decades of satellite water maps so it can estimate the years that have not happened yet, instead of only describing the past.</p>
          </article>
          <article className="what-algorithm">
            <span className="what-step">03</span>
            <h3>Our own algorithm, living between 0 and 1.</h3>
            <p>Computers are built from 0s and 1s. Our algorithm lives between them: for every 120 m pixel it gives a <b>probability from 0 to 1</b> that the pixel will hold open water.</p>
            <div className="prob-strip" aria-label="Probability scale from 0 to 1">
              <span>0</span><i /><span>1</span>
              <code>P(water) = σ(a + b·z)</code>
            </div>
            <p>It is built with <b>linear algebra</b> (Bayesian regressions solved through Cholesky factors, a hat-matrix shortcut for leave-one-out tests, an SVD of the basin’s rain, and a small 2×2 system solved for each of about {pixels} pixels at once), <b>discrete mathematics</b> (all 64 combinations of six possible causes scored, exact Shapley shares of each cause) and <b>advanced probability and statistics</b> (Bayesian evidence, heavy-tailed errors so outlier years cannot bend the model, cloudy years used as lower bounds, Gibbs sampling, Bayesian logistic regression, uncertainty carried from the causes all the way to the map).</p>
          </article>
          <article>
            <span className="what-step">04</span>
            <h3>Trained, then tested, then it redraws the map.</h3>
            <p>The model learned from {s1?.n_years ?? 27} well-observed years ({s1?.years[0] ?? 1989}–{s1?.years[1] ?? 2025}) and was tested on years it had never seen. The values it produces are what redraw the map: year by year, pixel by pixel, up to 2030.</p>
            <div className="what-stats">
              <div><strong>{s1 ? s1.loo_skill.toFixed(2) : '—'}</strong><span>skill on yearly water, each year left out in turn</span></div>
              <div><strong>{s1 ? s1.chrono_skill.toFixed(2) : '—'}</strong><span>skill when trained on 1989–2012 and asked about 2013–2025</span></div>
              <div><strong>{v?.brier_skill_full != null ? `${Math.round(v.brier_skill_full * 100)}%` : '—'}</strong><span>smaller map error than an “average year” map, from the yearly causes alone{drought != null ? ` (${Math.round(drought * 100)}% in the 2019 drought)` : ''}</span></div>
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
