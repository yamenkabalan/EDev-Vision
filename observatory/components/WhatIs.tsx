'use client';
import { useState, type ReactNode } from 'react';
import type { RidgeResearch } from '@/lib/ridgeResearch';
import { sectionNumber } from '@/lib/sections';

/*
  "What is RSynthesis AI?" — the first section under the opening screen.
  Three square cards read as a formula: DATA + AI = SYNTHESIS / ESTIMATION.
  Activating a card opens its examples. Below, the longer story: raw data,
  Ridge research and the interactive Bayesian projection.
*/
type Card = { id: string; title: string; icon: ReactNode; lead: string; items: string[] };

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const ICONS = {
  data: <svg viewBox="0 0 64 64" aria-hidden="true" {...stroke}><rect x="25" y="25" width="14" height="14" rx="2" transform="rotate(45 32 32)" /><path d="M21 21 9 9M43 43l12 12" /><rect x="3" y="3" width="13" height="9" rx="1.5" transform="rotate(45 9.5 7.5)" /><rect x="48" y="52" width="13" height="9" rx="1.5" transform="rotate(45 54.5 56.5)" /><path d="M43 17c4 1 6.5 3.5 7.5 7.5M45 11c7 1.4 11 5.4 12.5 12.5" /><circle cx="32" cy="32" r="2.2" /></svg>,
  ai: <svg viewBox="0 0 64 64" aria-hidden="true" {...stroke}><rect x="16" y="16" width="32" height="32" rx="6" /><path d="M24 8v8M32 8v8M40 8v8M24 48v8M32 48v8M40 48v8M8 24h8M8 32h8M8 40h8M48 24h8M48 32h8M48 40h8" /><path d="M32 23c1.3 4.6 3.4 6.7 8 8-4.6 1.3-6.7 3.4-8 8-1.3-4.6-3.4-6.7-8-8 4.6-1.3 6.7-3.4 8-8Z" /></svg>,
  synth: <svg viewBox="0 0 64 64" aria-hidden="true" {...stroke}><path d="M6 14 22 8l20 6 16-6v42l-16 6-20-6-16 6Z" /><path d="M22 8v42M42 14v42" /><path d="M12 40c6-1 9-7 14-8s9 4 14 2 7-9 12-12" strokeDasharray="3 3" /><circle cx="52" cy="22" r="4" /><path d="m55 25 4 4" /></svg>,
};

export default function WhatIs({ ridge }: { ridge: RidgeResearch }) {
  const [open, setOpen] = useState<string | null>(null);
  const cards: Card[] = [
    {
      id: 'data', title: 'Data', icon: ICONS.data, lead: 'Raw data from NASA radars and satellites',
      items: ['Global water · 266 countries and territories · 1984–2018', 'NISAR L-band radar · 12-day cycles', 'NASA OPERA radar + optical water maps', 'VIIRS floods · GPM rain · VIIRS photo', 'Landsat water maps · 1984–2021', 'ERA5 country rain and heat where available', 'NOAA El Niño index · UNEP SDG 6.6.1 to 2022'],
    },
    {
      id: 'ai', title: 'AI', icon: ICONS.ai, lead: 'The power to read and interpret it',
      items: ['Shows how calm water and flooded plants can return different radar signals', 'Stacks up to 12 days of radar imagery', 'Learns from past water and climate observations', 'Compares up to 32 sets of inputs for the probability map', 'Answers in plain words for the place you choose'],
    },
    {
      id: 'synth', title: 'Synthesis / Estimation', icon: ICONS.synth, lead: 'Estimate future surface water from the observed record.',
      items: ['Ridge experiment · one-year area estimates in km²', 'Bayesian map · 0–1 probability through 2030', 'Dry, typical and wet outcomes for places with enough data'],
    },
  ];
  const toggle = (id: string) => setOpen(o => (o === id ? null : id));

  return (
    <section className="what-section" id="what" aria-labelledby="what-title">
      <div className="wrap">
        <div className="what-head">
          <div className="eyebrow"><span className="section-number">{sectionNumber('what')}</span> OLD NASA DATA + AI = ESTIMATION</div>
          <h2 id="what-title">What is <em>RSynthesis AI?</em></h2>
          <p>Explore how inland surface water changed across countries from 1984 to 2018. Use satellite views to see where it changed and statistical models to estimate how much surface water a place may have in future years.</p>
        </div>

        <div className="formula" role="list">
          {cards.map((c, i) => <div className="formula-slot" role="listitem" key={c.id}>
            {i > 0 && <span className="formula-op" aria-hidden="true">{i === 1 ? '+' : '='}</span>}
            <div className={`formula-card card-${c.id}`} data-open={open === c.id}>
              <button type="button" className="formula-face" aria-expanded={open === c.id} aria-controls={`card-${c.id}`}
                onClick={() => toggle(c.id)}>
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
        <p className="formula-hint">Select a card to see its examples.</p>

        <div className="what-story">
          <article>
            <span className="what-step">01</span>
            <h3>Raw data is not an answer.</h3>
            <p>Radar measures how much microwave energy returns from each patch of ground. NISAR revisits nearly all land on a 12-day cycle. Browse imagery shows the passes available for the selected dates.</p>
            <p>Calm open water often reflects the signal away and looks <b>dark</b>. Under reeds or flooded trees, the signal can bounce between the water and plants and return <b>bright</b>.</p>
            <SignalDiagram />
          </article>
          <article>
            <span className="what-step">02</span>
            <h3>From the satellite record to a forecast.</h3>
            <p>Landsat gives us a yearly record of mapped permanent and seasonal surface water. Past water area, rainfall, temperature and El Niño help us estimate how much water a place may have in a later year.</p>
            <p>We compare each experiment with a simple forecast that carries the latest reliable area forward.</p>
          </article>
          <article className="what-algorithm">
            <span className="what-step">03</span>
            <h3>One-year forecast with Ridge regression.</h3>
            <p>Start with the latest reliable area in km². The model learns the log of the area ratio from past water and climate records. Taking the exponential turns that number into an area multiplier.</p>
            <div className="what-equation" role="group" aria-label="Estimated area equals last reliable area times e to the predicted log change">
              <span aria-hidden="true">Estimated area</span><b aria-hidden="true">=</b><span aria-hidden="true">Last reliable area</span><b aria-hidden="true">×</b><span aria-hidden="true">e<sup>predicted log change</sup></span>
            </div>
            <p>The <b>0.5–2 multiplier</b> limits the estimate to half through twice the last reliable area. Ridge keeps coefficients stable when inputs carry similar information.</p>
            <p>In <a href="#future">Future</a>, the Bayesian map uses a <b>0–1 probability</b>. A map value of 0.5 means a 50% chance that a country falls below its own average.</p>
          </article>
          <article>
            <span className="what-step">04</span>
            <h3>How the one-year experiment performed.</h3>
            <p>Each forecast used only earlier years. Results cover {ridge.firstYear}–{ridge.lastYear}. Weighted absolute percentage error (WAPE) gives larger water areas more influence.</p>
            <div className="what-stats">
              <div><strong>{ridge.worldError.toFixed(2)}%</strong><span>World total over {ridge.worldYears} test years · Ridge</span></div>
              <div><strong>{ridge.countryError.toFixed(2)}%</strong><span>{ridge.countries} countries and territories · Ridge</span></div>
              <div><strong>{ridge.basinError.toFixed(2)}%</strong><span>{ridge.basins} basins · equal-weight ensemble</span></div>
            </div>
            <p>Carrying the last area forward gave {ridge.countryBaseline.toFixed(2)}% country WAPE. The Ridge model averaged {ridge.countryMape.toFixed(2)}% error when each country-year counted equally. See <a href="#sources">Sources</a> for both model descriptions.</p>
          </article>
        </div>
      </div>
    </section>
  );
}

function SignalDiagram() {
  return <svg viewBox="0 0 340 150" className="signal-diagram" role="img" aria-label="Calm open water reflects the radar signal away (low return); water plus stems send it back (double bounce)"><defs><linearGradient id="what-water" x2="1" y2="0"><stop stopColor="#369ac4" stopOpacity=".05" /><stop offset=".5" stopColor="#369ac4" stopOpacity=".5" /><stop offset="1" stopColor="#369ac4" stopOpacity=".05" /></linearGradient></defs><path d="M10 110h140M192 110h138" stroke="url(#what-water)" strokeWidth="5" /><path d="m18 20 68 88 58-62" stroke="#64b7df" strokeWidth="1.4" fill="none" strokeDasharray="4 4" /><path d="m206 22 61 86 34-23-93-61" stroke="#b3d588" strokeWidth="1.4" fill="none" strokeDasharray="4 4" /><path d="M301 108V41m0 28-14-15m14 25 14-19M318 108V70m-38 39V82" stroke="#80a177" strokeWidth="2" /><text x="65" y="140" textAnchor="middle">OPEN WATER · DARK</text><text x="262" y="140" textAnchor="middle">UNDER REEDS · BRIGHT</text><circle cx="18" cy="20" r="3" fill="#9acde2" /><circle cx="206" cy="22" r="3" fill="#bbda94" /></svg>;
}
