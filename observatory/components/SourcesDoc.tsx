'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { sectionNumber } from '@/lib/sections';
import type { RidgeResearch } from '@/lib/ridgeResearch';

/*
  Sources: the project document the NASA Space Apps rules ask for, as three
  A4 pages — 1 cover and team, 2 how the website and the algorithm work,
  3 data, references and use of AI. Shown one page at a time on screen;
  "Print / save as PDF" prints exactly the three pages.
*/
/** The same three pages, exported once to a file that can be attached to the NASA project page. */
const PDF = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/RSynthesis-AI-project-document.pdf`;

const TEAM = [
  { name: 'Asadbek Kenjaev', role: 'Project Leader' },
  { name: 'Yamen Kabalan', role: 'Web Designer' },
  { name: 'Fatih Zengin', role: 'Idea, Design & Presentation' },
];

function Page({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return <article className="doc-page" aria-label={`Page ${n} of 3: ${title}`}>
    <header className="doc-run"><span>RSynthesis AI · EDev-Vision</span><span>NASA Space Apps Challenge 2026</span></header>
    {children}
    <footer className="doc-run doc-foot"><span>{title}</span><span>{n} / 3</span></footer>
  </article>;
}

type Summary = { loo_skill_median: number; split_skill_median: number };

function Pages({ sum, ridge }: { sum: Summary | null; ridge: RidgeResearch }) {
  const f2 = (x: number | undefined | null) => (x == null ? '—' : x.toFixed(2));
  return <>
    <Page n={1} title="Cover">
      <div className="doc-cover">
        <p className="doc-kicker">NASA Space Apps Challenge 2026 · Challenge: “Dancing with the SARs” · Earth Science</p>
        <h2 className="doc-title">RSynthesis AI</h2>
        <p className="doc-sub">Estimate the future of life: the world’s surface water, 1984 → 2030</p>
        <p className="doc-formula">Old NASA data + AI = an estimate of the planet’s water future</p>
        <div className="doc-team">
          <h2>Team EDev-Vision</h2>
          <ul>{TEAM.map(t => <li key={t.name}><strong>{t.name}</strong><span>{t.role}</span></li>)}</ul>
        </div>
        <dl className="doc-meta">
          <div><dt>Topic</dt><dd>Inland surface water of every country, seen from orbit: radar and optical views of the whole Earth, 35 years of country records, the causes behind them, and a projection to 2030 for any country, continent or the world.</dd></div>
          <div><dt>Areas</dt><dd>The whole Earth: 266 countries and territories, 6 continents</dd></div>
          <div><dt>Data period</dt><dd>Country water 1984–2018 (UNEP later release to 2022) · Landsat maps 1984–2021 · rain and heat 1984–2025 · NISAR radar Nov 2025 – Nov 2026 · projection 2019–2030</dd></div>
          <div><dt>Event</dt><dd>Local event, Güngören AltTab Incubation Center, Istanbul, Türkiye · 14–15 November 2026</dd></div>
          <div><dt>Year</dt><dd>2026</dd></div>
        </dl>
        <div className="doc-abstract">
          <h2>Summary</h2>
          <p>The site opens on a globe of 266 countries and territories and the surface water Landsat mapped from 1984 to 2018. Seven NASA and JRC views show satellite observations where imagery is available. For places with enough data, the interactive Bayesian model estimates surface water up to 2030 and reports ranges and probabilities. A separate Ridge regression experiment tests one-year area estimates using past observations and climate data.</p>
        </div>
        <p className="doc-links">Website code: github.com/yamenkabalan/EDev-Vision · Data pipeline: github.com/Asadgnc/edev-data</p>
      </div>
    </Page>

    <Page n={2} title="How it works: the website and the algorithm">
      <h2 className="doc-h">How it works</h2>
      <div className="doc-cols">
        <section>
          <h3>The website · one page, ten sections</h3>
          <ol className="doc-list">
            <li><b>What is RSynthesis AI</b> — the idea: data + AI = estimation.</li>
            <li><b>Global water</b> — the JRC water map for any year 1984–2018 and the water of 266 countries, two at a time, each fitted to the map.</li>
            <li><b>All-in-one radar</b> — one globe, seven live layers: NISAR radar, OPERA radar water (with flooded vegetation), OPERA optical water, VIIRS floods, GPM rain, VIIRS photo, Landsat years; 12 days stacked per step, with play.</li>
            <li><b>Compare</b> — any place at two years or two 12-day cycles, swipe divider.</li>
            <li><b>History</b> — every year 1984–2018 for the world, a continent, a country or two countries, with its rain, heat and El Niño.</li>
            <li><b>Graphics</b> — measured solid, projected dashed to 2030; permanent vs seasonal; rain → water; a check against UNEP after 2018.</li>
            <li><b>Future</b> — the reader picks place, causes, data treatment and years; the engine refits and answers, with a world probability map.</li>
            <li><b>What should be done</b> — where mapped water declined, associated inputs and monitoring options.</li>
            <li><b>AI</b> — a data-grounded assistant for countries, continents and the world, with a separate Okavango observation record.</li>
            <li><b>Sources</b> — this document.</li>
          </ol>
          <h3>Reading the radar</h3>
          <p>L-band and C-band radar see through clouds. Calm open water often looks dark; flooded vegetation can look bright through double-bounce scattering. We combine available NISAR browse images from up to 12 days. Coverage depends on published passes.</p>
        </section>
        <section>
          <h3>One-year Ridge experiment</h3>
          <p>Estimated area equals the last reliable area (km²) times the exponential of the predicted log change. A shared Ridge regression learns that change using earlier water and climate observations. The multiplier is limited to 0.5–2.</p>
          <p>From {ridge.firstYear} to {ridge.lastYear}, Ridge gave {ridge.worldError.toFixed(2)}% WAPE for the world total and {ridge.countryError.toFixed(2)}% across {ridge.countries} countries and territories. Carrying the last area forward gave {ridge.worldBaseline.toFixed(2)}% and {ridge.countryBaseline.toFixed(2)}% respectively. An equal-weight ensemble gave {ridge.basinError.toFixed(2)}% across {ridge.basins} basins.</p>
          <h3>Interactive Bayesian projections</h3>
          <p>The live charts and probability map use Bayesian model averaging over the selected inputs: rain, prior-year rain, temperature, ENSO and trend. The engine uses a Zellner g-prior and a Scott–Berger model-size prior. Student-t predictive draws give the median, ranges and chances from 0 to 1.</p>
          <p>The default model excludes years when estimated unseen water exceeds 15% of measured water. Its median skill was {f2(sum?.loo_skill_median)} when hiding each year in turn and {f2(sum?.split_skill_median)} when training through 2008 and estimating 2009–2018 with observed climate inputs. The later UNEP release compares 2018–2022 changes with climate inputs available in the site data.</p>
          <h3>Limits</h3>
          <ul className="doc-bullets">
            <li>Surface area only: not depth, volume, groundwater, quality or drinking water.</li>
            <li>Country water series end in 2018. JRC maps continue to 2021 and the later UNEP series to 2022.</li>
            <li>Landsat misses water under plants and clouds; early years are lower bounds; part of the rise since the 1990s is better coverage.</li>
            <li>Causes are associations, not proof; dams, irrigation and ice are only seen through the trend.</li>
            <li>The Bayesian projection samples unavailable climate inputs from past years. Ridge tests use earlier years in today’s data release.</li>
          </ul>
        </section>
      </div>
    </Page>

    <Page n={3} title="Data, references and use of AI">
      <h2 className="doc-h">Sources</h2>
      <div className="doc-cols">
        <section>
          <h3>NASA data</h3>
          <ul className="doc-bullets">
            <li><b>NISAR L2 GCOV</b> browse imagery — NASA/JPL and ISRO, via NASA GIBS (nisar.jpl.nasa.gov).</li>
            <li><b>OPERA L3 DSWx-S1 and DSWx-HLS</b> surface water — NASA JPL OPERA project, via NASA GIBS.</li>
            <li><b>LANCE VIIRS Combined Flood</b> (3-day), <b>GPM IMERG</b> precipitation rate, <b>NOAA-20 VIIRS</b> true colour — via NASA GIBS. We acknowledge the use of imagery provided by services from NASA’s Global Imagery Browse Services (GIBS), part of NASA’s Earth Science Data and Information System (ESDIS).</li>
            <li><b>Landsat</b> (USGS/NASA) — the source of every JRC water map and country record below.</li>
          </ul>
          <h3>Space agency partner and other data</h3>
          <ul className="doc-bullets">
            <li><b>ISRO</b> — NASA’s partner agency in the NISAR mission.</li>
            <li><b>EC JRC / Google Global Surface Water</b> — Yearly History 1984–2021 (global-surface-water.appspot.com).</li>
            <li><b>UNEP SDG 6.6.1</b> country water 1984–2018 (storage.googleapis.com/global-surface-water-stats) and lakes &amp; rivers 2000–2022 (UN SDG Global Database, unstats.un.org/sdgs/dataportal).</li>
            <li><b>Copernicus ERA5</b> yearly precipitation and temperature anomaly by country, processed by Our World in Data (ourworldindata.org).</li>
            <li><b>NOAA CPC Oceanic Niño Index</b> (cpc.ncep.noaa.gov).</li>
            <li><b>Natural Earth</b> borders and labels · <b>Esri</b> and <b>OpenStreetMap</b> base maps.</li>
            <li><b>EDev-Vision Okavango case study</b> — local NISAR radar and Landsat optical observations (github.com/Asadgnc/edev-data).</li>
          </ul>
          <h3>Use of AI</h3>
          <ul className="doc-bullets">
            <li><b>Claude Code (Anthropic) and OpenAI Codex</b> — helped write and review scripts, engine, site and documentation. Measurements and estimates come from project code and cited data.</li>
            <li><b>OpenAI language-model assistant</b> — a server-side model receives relevant country, continent or world records: annual water (1984–2018), climate and Bayesian estimates to 2030. Okavango questions use a separate local observation record. Answers may be wrong; check them against the charts.</li>
            <li>The opening film is an <b>AI-generated decorative sequence</b>, not mission data. No NASA logo or insignia is used.</li>
          </ul>
        </section>
        <section>
          <h3>References</h3>
          <ul className="doc-refs">
            <li>Pekel, J.-F., Cottam, A., Gorelick, N., Belward, A. S. (2016). High-resolution mapping of global surface water and its long-term changes. <i>Nature</i> 540, 418–422.</li>
            <li>Hersbach, H. et al. (2020). The ERA5 global reanalysis. <i>Q. J. Royal Meteorological Society</i> 146, 1999–2049.</li>
            <li>UNEP (2021). Progress on Freshwater Ecosystems: global indicator 6.6.1 updates and acceleration needs.</li>
            <li>UN-Water (2024). Progress on Transboundary Water Cooperation (SDG indicator 6.5.2).</li>
            <li>Hoerl, A. E., Kennard, R. W. (1970). Ridge regression: biased estimation for nonorthogonal problems. <i>Technometrics</i> 12, 55–67.</li>
            <li>Zellner, A. (1986). On assessing prior distributions and Bayesian regression analysis with g-prior distributions. In <i>Bayesian Inference and Decision Techniques</i>, 233–243.</li>
            <li>Liang, F. et al. (2008). Mixtures of g priors for Bayesian variable selection. <i>JASA</i> 103(481), 410–423.</li>
            <li>Scott, J. G., Berger, J. O. (2010). Bayes and empirical-Bayes multiplicity adjustment in the variable-selection problem. <i>Annals of Statistics</i> 38(5), 2587–2619.</li>
            <li>Hoeting, J. A. et al. (1999). Bayesian model averaging: a tutorial. <i>Statistical Science</i> 14(4), 382–417.</li>
            <li>Gneiting, T., Raftery, A. E. (2007). Strictly proper scoring rules, prediction, and estimation. <i>JASA</i> 102(477), 359–378.</li>
            <li>Marsaglia, G., Tsang, W. W. (2000). A simple method for generating gamma variables. <i>ACM Transactions on Mathematical Software</i> 26(3), 363–372.</li>
            <li>NISAR mission and OPERA DSWx product specifications, NASA JPL; NASA GIBS API documentation.</li>
          </ul>
          <h3>Software</h3>
          <p>Python for the data build · TypeScript engine running in the browser · Next.js, React, Tailwind CSS, Framer Motion, MapLibre GL JS, three.js. Decorative Earth texture: three.js example assets.</p>
          <h3>Open source</h3>
          <p>All code and processed data are public: github.com/yamenkabalan/EDev-Vision (website, world data scripts, engine) and github.com/Asadgnc/edev-data (radar pipeline).</p>
        </section>
      </div>
    </Page>
  </>;
}

export default function SourcesDoc({ ridge }: { ridge: RidgeResearch }) {
  const [page, setPage] = useState(0);
  const [sum, setSum] = useState<Summary | null>(null);
  useEffect(() => { fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/data/engine-summary.json`).then(r => r.ok ? r.json() : null).then(setSum).catch(() => {}); }, []);
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    if (!printing) return;
    document.documentElement.classList.add('print-doc');
    const done = () => { document.documentElement.classList.remove('print-doc'); setPrinting(false); };
    addEventListener('afterprint', done);
    const id = setTimeout(() => print(), 120);
    return () => { clearTimeout(id); removeEventListener('afterprint', done); document.documentElement.classList.remove('print-doc'); };
  }, [printing]);
  const titles = ['Cover & team', 'Website & algorithm', 'Data, references & AI'];
  return (
    <section className="sources-section" id="sources" aria-labelledby="sources-title">
      <div className="wrap">
        <div className="section-heading">
          <div><div className="eyebrow"><span className="section-number">{sectionNumber('sources')}</span> SOURCES</div><h2 id="sources-title">Where everything<br /><em>comes from.</em></h2></div>
          <p className="section-description">The project in three pages, as the NASA Space Apps rules ask: who made it, how it works, and every source behind it.</p>
        </div>
        <div className="doc-toolbar">
          <div className="seg" role="tablist" aria-label="Document pages">
            {titles.map((t, i) => <button key={t} type="button" role="tab" aria-selected={page === i} className={page === i ? 'active' : ''} onClick={() => setPage(i)}><span>{i + 1}</span> {t}</button>)}
          </div>
          <div className="doc-actions"><a className="small-button doc-download" href={PDF} download>Download PDF ↓</a><button type="button" className="small-button doc-print" onClick={() => setPrinting(true)}>Print ⎙</button></div>
        </div>
        <div className="doc-viewer" data-page={page}>
          <Pages sum={sum} ridge={ridge} />
        </div>
        <div className="doc-nav">
          <button type="button" className="small-button" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Previous page</button>
          <span>Page {page + 1} of 3</span>
          <button type="button" className="small-button" disabled={page === 2} onClick={() => setPage(p => p + 1)}>Next page →</button>
        </div>
      </div>
      {printing && createPortal(<div className="print-root"><Pages sum={sum} ridge={ridge} /></div>, document.body)}
    </section>
  );
}
