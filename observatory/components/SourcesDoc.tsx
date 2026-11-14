'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { FutureDoc } from '@/lib/future';
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

function Pages({ future }: { future: FutureDoc | null }) {
  const s1 = future?.stage1, v = future?.stage2.validation;
  const drought = v ? [2019, 2021, 2023, 2024].map(y => v.per_year.find(r => r.year === y)?.brier_skill_full).filter((x): x is number => typeof x === 'number') : [];
  const f2 = (x: number | undefined | null) => (x == null ? '—' : x.toFixed(2));
  return <>
    <Page n={1} title="Cover">
      <div className="doc-cover">
        <p className="doc-kicker">NASA Space Apps Challenge 2026 · Challenge: “Dancing with the SARs” · Earth Science</p>
        <h1>RSynthesis AI</h1>
        <p className="doc-sub">Okavango Flood Pulse</p>
        <p className="doc-formula">Old NASA data + AI = an estimate of the delta’s future</p>
        <div className="doc-team">
          <h2>Team EDev-Vision</h2>
          <ul>{TEAM.map(t => <li key={t.name}><strong>{t.name}</strong><span>{t.role}</span></li>)}</ul>
        </div>
        <dl className="doc-meta">
          <div><dt>Topic</dt><dd>The seasonal flood of the Okavango Delta, Botswana, seen by NASA–ISRO NISAR L-band radar, with a projection of open water to 2030.</dd></div>
          <div><dt>Study area</dt><dd>Okavango Delta, Botswana · 22.0–23.8° E, 18.3–20.0° S</dd></div>
          <div><dt>Data period</dt><dd>Landsat 1984–2025 · NISAR 26 June – 24 October 2026 · projection 2026–2030</dd></div>
          <div><dt>Event</dt><dd>Local event, Güngören AltTab Incubation Center, Istanbul, Türkiye · 14–15 November 2026</dd></div>
          <div><dt>Year</dt><dd>2026</dd></div>
        </dl>
        <div className="doc-abstract">
          <h2>Summary</h2>
          <p>Every year, rain from the Angolan highlands floods the Okavango Delta, a wetland that people and wildlife in a dry country depend on. RSynthesis AI combines NISAR radar, which sees water through clouds and even under reeds, with 41 years of Landsat water maps and records of rain, river flow, El Niño and heat. Our own probability algorithm learns from these data and redraws the map of open water for 2026–2030, and an AI assistant explains every number in plain words.</p>
        </div>
        <p className="doc-links">Data and pipeline: github.com/Asadgnc/edev-data · Website code: github.com/yamenkabalan/EDev-Vision</p>
      </div>
    </Page>

    <Page n={2} title="How it works: the website and the algorithm">
      <h2 className="doc-h">How it works</h2>
      <div className="doc-cols">
        <section>
          <h3>The website · one page, nine sections</h3>
          <ol className="doc-list">
            <li><b>What is RSynthesis AI</b> — the idea: data + AI = estimation.</li>
            <li><b>All-in-one radar</b> — one map, seven layers: our NISAR water classes, NISAR colour radar, raw HH radar, NASA’s NISAR image, NASA OPERA water, VIIRS photo, Landsat history.</li>
            <li><b>Compare</b> — two dates or two years, aligned, with a swipe divider.</li>
            <li><b>History</b> — Landsat open water for every year since 1984 with its rain, river flow, El Niño and heat; JRC 1984–2024 water-frequency map.</li>
            <li><b>Graphics</b> — charts by source and years: measured solid, projected dashed, up to 2030.</li>
            <li><b>Future</b> — our probability maps for 2026–2030, with the AI chat beside them.</li>
            <li><b>What should be done</b> — why the dry years happened and what could have been done.</li>
            <li><b>AI</b> — Delta AI answers only from our data.</li>
            <li><b>Sources</b> — this document.</li>
          </ol>
          <h3>Reading the radar</h3>
          <p>NISAR L2 GCOV, L-band (frequency B, 80 m), HH and HV, ten dates from one orbit (track 172, frame 168, ascending), so changes are real changes on the ground. A multitemporal speckle filter (Quegan &amp; Yu 2001) cleans the images. Fixed physical thresholds sort each pixel: <b>open water</b> is dark (HH &lt; −18 dB and HV &lt; −22 dB); <b>flooded vegetation</b> is bright through double bounce (HH &gt; −5 dB and HH − HV &gt; 7 dB). The result is a strict lower bound in km² per date.</p>
        </section>
        <section>
          <h3>The algorithm · RSynthesis estimation engine</h3>
          <p><b>1 · How much water.</b> Six possible causes (rain in the Angolan highlands, rain over the Delta, flood-season heat, El Niño / La Niña, last year’s rain, the calendar year) were scored in all 64 combinations by Bayesian evidence (Zellner g-prior, Scott–Berger multiplicity prior). Kept in every model: highland rain (Nov–Apr, ERA5) and the year; uncertain, so averaged in and out: Delta rain and El Niño. Heat, last year’s rain or water, river inflow (gauge and GloFAS) and where in the basin the rain fell were tested and dropped. Each of the 4 models is a Bayesian regression on a Box-Cox scale with Student-t errors and cloudy years as lower bounds, sampled by Gibbs; the forecast is their equal mixture, fitted on {s1?.n_years ?? 27} well-observed Landsat years. Typical error {s1 ? Math.round(s1.loo_rmse_km2) : '—'} km² with each year left out{s1?.v1 ? ` (first version: ${Math.round(s1.v1.loo_rmse_km2)})` : ''}{s1?.rolling_rmse_km2 != null && s1.v1 ? `, ${Math.round(s1.rolling_rmse_km2)} km² forecasting each year from ${s1.rolling_from} from earlier years only (first version: ${Math.round(s1.v1.rolling_rmse_km2)})` : ''}; skill {f2(s1?.chrono_skill)} when trained on 1989–2012 and tested on 2013–2025 (0 = no better than the average, 1 = perfect).</p>
          <p><b>2 · Where it goes.</b> For each of about {future ? Math.round(future.stage2.pixels / 1000) : 367},000 pixels (120 m) that were ever wet: P(water) = σ(a + b·z), z = the year’s standardised area. A Bayesian logistic regression with priors a ~ N(0, 5²), b ~ N(0, 2.5²), solved for all pixels at once by Newton’s method (a 2×2 linear system per pixel); the Laplace approximation gives each pixel’s uncertainty.</p>
          <p><b>3 · Redraw the map.</b> For a given yearly area the pixel probabilities get one global log-odds shift (bisection) so the map holds exactly that area. The expected map averages 40 such maps across the forecast range (probit approximation, MacKay 1992); the dry and wet maps use its 10th and 90th percentiles. For 2027–2030 the causes of a random past year are drawn together, because they have not happened yet.</p>
          <p><b>Tested.</b> Each year was hidden and redrawn from the others. From the yearly causes alone, the map’s squared error is {v?.brier_skill_full != null ? Math.round(v.brier_skill_full * 100) : '—'}% smaller than an “average year” map{drought.length ? `, ${Math.round(Math.min(...drought) * 100)}–${Math.round(Math.max(...drought) * 100)}% in the drought years 2019, 2021, 2023 and 2024` : ''}.</p>
          <h3>Limits</h3>
          <ul className="doc-bullets">
            <li>Radar thresholds are physical rules, not calibrated on the ground.</li>
            <li>One radar frame covers our study area, not the whole Delta.</li>
            <li>Landsat sees open water only; the projection excludes water under reeds.</li>
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
            <li><b>NISAR L2 GCOV, L-band</b> — NASA/JPL and ISRO, via the Alaska Satellite Facility DAAC (search.asf.alaska.edu).</li>
            <li><b>NASA GIBS</b> — NISAR browse imagery, OPERA DSWx-HLS surface water, VIIRS NOAA-20 true colour. We acknowledge the use of imagery provided by services from NASA’s Global Imagery Browse Services (GIBS), part of NASA’s Earth Science Data and Information System (ESDIS).</li>
            <li><b>Landsat</b> (USGS/NASA) — via Digital Earth Africa Water Observations from Space (WOfS), annual, 1984–2025.</li>
            <li><b>NASA POWER</b> (MERRA-2) — flood-season daily maximum temperature.</li>
          </ul>
          <h3>Space agency partner and other data</h3>
          <ul className="doc-bullets">
            <li><b>ISRO</b> — NASA’s partner agency in the NISAR mission.</li>
            <li><b>ERA5</b> rain — Copernicus C3S / ECMWF, via Open-Meteo (CC BY 4.0).</li>
            <li><b>GloFAS</b> river discharge — Copernicus EMS / ECMWF, via Open-Meteo. A model, not a gauge.</li>
            <li><b>JRC Global Surface Water v1.5</b> — European Commission JRC (Pekel et al. 2016).</li>
            <li><b>Oceanic Niño Index</b> — NOAA Climate Prediction Center.</li>
            <li><b>WorldPop 2020</b> population, 1 km (CC BY 4.0) · <b>OpenStreetMap</b> base map (ODbL).</li>
          </ul>
          <h3>Use of AI</h3>
          <ul className="doc-bullets">
            <li><b>Claude (Anthropic), via Claude Code</b> — helped write and review the data pipeline, the algorithm, the website and the assistant function, and draft documentation. Every number on the site is computed by our published code from the data above.</li>
            <li><b>OpenAI GPT-5.4 mini</b> (backup: gpt-oss on Groq) — powers Delta AI, which may answer only from our data file. Not trained or fine-tuned by us.</li>
            <li>The opening film is an <b>AI-generated decorative sequence</b>, not mission data. No NASA logo or insignia is used.</li>
          </ul>
        </section>
        <section>
          <h3>References</h3>
          <ul className="doc-refs">
            <li>Pekel, J.-F. et al. (2016). High-resolution mapping of global surface water and its long-term changes. <i>Nature</i> 540, 418–422.</li>
            <li>Quegan, S., Yu, J. J. (2001). Filtering of multichannel SAR images. <i>IEEE TGRS</i> 39(11), 2373–2379.</li>
            <li>Inman, V. L., Lyons, M. B. (2020). Automated inundation mapping over large areas using Landsat data and Google Earth Engine. <i>Remote Sensing</i> 12(8), 1348.</li>
            <li>Wolski, P. et al. (2017). Keeping it simple: monitoring flood extent in large data-poor wetlands using MODIS SWIR data. <i>Int. J. Appl. Earth Obs. Geoinf.</i> 57, 224–234.</li>
            <li>Box, G. E. P., Cox, D. R. (1964). An analysis of transformations. <i>J. Royal Statistical Society B</i> 26(2), 211–252.</li>
            <li>Zellner, A. (1986). On assessing prior distributions and Bayesian regression analysis with g-prior distributions. In <i>Bayesian Inference and Decision Techniques</i>, 233–243.</li>
            <li>Scott, J. G., Berger, J. O. (2010). Bayes and empirical-Bayes multiplicity adjustment in the variable-selection problem. <i>Annals of Statistics</i> 38(5), 2587–2619.</li>
            <li>Geweke, J. (1993). Bayesian treatment of the independent Student-t linear model. <i>J. Applied Econometrics</i> 8, S19–S40.</li>
            <li>Chib, S. (1992). Bayes inference in the Tobit censored regression model. <i>J. Econometrics</i> 51, 79–99.</li>
            <li>Gneiting, T., Raftery, A. E. (2007). Strictly proper scoring rules, prediction, and estimation. <i>JASA</i> 102(477), 359–378.</li>
            <li>Smith, J., Wallis, K. F. (2009). A simple explanation of the forecast combination puzzle. <i>Oxford Bulletin of Economics and Statistics</i> 71(3), 331–355.</li>
            <li>Shapley, L. S. (1953). A value for n-person games. <i>Contributions to the Theory of Games</i> II, 307–317.</li>
            <li>MacKay, D. J. C. (1992). The evidence framework applied to classification networks. <i>Neural Computation</i> 4(5), 720–736.</li>
            <li>Gelman, A. et al. (2008). A weakly informative default prior distribution for logistic and other regression models. <i>Annals of Applied Statistics</i> 2(4), 1360–1383.</li>
            <li>OKACOM (2011). Cubango-Okavango River Basin Transboundary Diagnostic Analysis.</li>
            <li>NISAR GCOV product guide and Provisional Product Known Issues, nisar-docs.asf.alaska.edu.</li>
            <li>News: Mmegi (30 Mar 2009); BOPA (26 Apr 2020); AFP via Gulf Times (26 Apr 2024).</li>
          </ul>
          <h3>Software</h3>
          <p>Python (NumPy, rasterio, h5py, Pillow, asf_search, earthaccess) · Next.js, React, TypeScript, Tailwind CSS, Framer Motion, Leaflet, three.js. Decorative Earth texture: three.js example assets.</p>
          <h3>Open source</h3>
          <p>All code and processed data are public: github.com/Asadgnc/edev-data (data, pipeline, algorithm) and github.com/yamenkabalan/EDev-Vision (website).</p>
        </section>
      </div>
    </Page>
  </>;
}

export default function SourcesDoc({ future }: { future: FutureDoc | null }) {
  const [page, setPage] = useState(0);
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
          <Pages future={future} />
        </div>
        <div className="doc-nav">
          <button type="button" className="small-button" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Previous page</button>
          <span>Page {page + 1} of 3</span>
          <button type="button" className="small-button" disabled={page === 2} onClick={() => setPage(p => p + 1)}>Next page →</button>
        </div>
      </div>
      {printing && createPortal(<div className="print-root"><Pages future={future} /></div>, document.body)}
    </section>
  );
}
