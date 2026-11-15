'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { sectionNumber } from '@/lib/sections';

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

type Summary = { countries_fitted: number; mean_years: number; loo_skill_median: number; loo_skill_positive: number; split_skill_median: number; sdg_inside_80: number; sdg_n: number; world: { loo_skill: number | null; split_skill: number | null } };

function Pages({ sum }: { sum: Summary | null }) {
  const f2 = (x: number | undefined | null) => (x == null ? '—' : x.toFixed(2));
  const pc = (x: number | undefined | null) => (x == null ? '—' : `${Math.round(x * 100)}%`);
  return <>
    <Page n={1} title="Cover">
      <div className="doc-cover">
        <p className="doc-kicker">NASA Space Apps Challenge 2026 · Challenge: “Dancing with the SARs” · Earth Science</p>
        <h1>RSynthesis AI</h1>
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
          <p>Water decides where life can stay. The site opens on a globe of 266 countries and territories and the surface water Landsat mapped in each of them from 1984 to 2018. Seven live NASA and JRC views — NISAR radar, OPERA radar and optical water maps, floods, rain, a daily photo and Landsat years — show the whole Earth for any 12-day NISAR cycle. For any place, RSynthesis AI links each year’s water to its rain, heat and El Niño, and our own Bayesian engine, running in the reader’s browser with the causes the reader chooses, projects the water to 2030 as chances, ranges and a probability map. Every answer states how well the engine did on years it never saw.</p>
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
            <li><b>What should be done</b> — where water was lost, why, and lessons, also for the chosen place.</li>
            <li><b>AI</b> — the language-model assistant.</li>
            <li><b>Sources</b> — this document.</li>
          </ol>
          <h3>Reading the radar</h3>
          <p>L-band and C-band radar see through clouds. Calm open water mirrors the signal away and looks dark; water standing under plants returns it twice (double bounce) and looks bright. NASA’s OPERA DSWx-S1 product uses this to map open water and inundated vegetation worldwide; we stack 12 daily layers so one NISAR orbit cycle fills the globe.</p>
        </section>
        <section>
          <h3>The algorithm · RSynthesis world engine</h3>
          <p><b>1 · Learn.</b> For a place (country, continent or world), the yearly surface water from Landsat (EC JRC / UNEP SDG 6.6.1) on a log scale. Years when Landsat could not see more than 15% of the water are kept out as lower bounds; the reader may instead add JRC’s estimate for unseen areas.</p>
          <p><b>2 · Weigh the causes.</b> Five possible causes — rain this year and last year (ERA5), heat (ERA5 anomaly), El Niño (NOAA ONI, Dec–Feb) and a long-term trend. All combinations of the causes the reader allows (up to 32) are fitted as Bayesian regressions with a Zellner g-prior and scored by their exact evidence; a Scott–Berger prior penalises using many causes. The weights give each cause’s weight of evidence and the model average.</p>
          <p><b>3 · Project.</b> Thousands of future years are simulated: a model by its weight, the causes measured where already known (rain and heat to 2025, El Niño to early 2026) and drawn from the place’s past years where not, and Student-t uncertainty from each model’s posterior. The draws give the median, 80% and 95% ranges, and the chances of a below-average year or a record low. The map repeats this for every country.</p>
          <p><b>Tested.</b> With the default choices, on {sum?.countries_fitted ?? 208} countries with enough well-observed years (on average {sum?.mean_years ?? '—'}): hiding each year in turn, median skill {f2(sum?.loo_skill_median)}, better than “always the average” in {pc(sum?.loo_skill_positive)} of countries; for the whole world {f2(sum?.world.loo_skill)}. Trained to 2008 and asked about 2009–2018, median skill {f2(sum?.split_skill_median)}: predicting later years is hard. Against UNEP’s later release (2018 → 2022, a different product compared as change only) the observed change fell inside the 80% range in {pc(sum?.sdg_inside_80)} of {sum?.sdg_n ?? '—'} countries.</p>
          <h3>Limits</h3>
          <ul className="doc-bullets">
            <li>Surface area only: not depth, volume, groundwater, quality or drinking water.</li>
            <li>Country records end in 2018; after that only the projection and UNEP’s later release.</li>
            <li>Landsat misses water under plants and clouds; early years are lower bounds; part of the rise since the 1990s is better coverage.</li>
            <li>Causes are associations, not proof; dams, irrigation and ice are only seen through the trend.</li>
            <li>The projection is statistical; it cannot know future rain.</li>
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
          </ul>
          <h3>Use of AI</h3>
          <ul className="doc-bullets">
            <li><b>Claude (Anthropic), via Claude Code</b> — helped write and review the data scripts, the engine, the website and the documentation. Every number on the site is computed by our published code from the data above.</li>
            <li><b>OpenAI GPT-5.4 mini</b> (backup: gpt-oss on Groq) — powers the AI assistant. Not trained or fine-tuned by us.</li>
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

export default function SourcesDoc() {
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
          <Pages sum={sum} />
        </div>
        <div className="doc-nav">
          <button type="button" className="small-button" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Previous page</button>
          <span>Page {page + 1} of 3</span>
          <button type="button" className="small-button" disabled={page === 2} onClick={() => setPage(p => p + 1)}>Next page →</button>
        </div>
      </div>
      {printing && createPortal(<div className="print-root"><Pages sum={sum} /></div>, document.body)}
    </section>
  );
}
