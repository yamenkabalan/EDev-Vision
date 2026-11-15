'use client';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/*
  Thirty short findings about the world's water, one every 8 seconds, looping.
  Numbers computed by us come from the site's own files (public/data:
  global-water.json = EC JRC / UNEP SDG 6.6.1 country water 1984-2018;
  world.json = ERA5 rain and heat via Our World in Data, NOAA ONI, UNEP SDG
  6.6.1 2000-2022; engine-summary.json = our engine's tests). Published
  findings name their source. Text between *asterisks* is highlighted.
*/
export const FACTS: [text: string, source: string][] = [
  ['In 2018 Landsat mapped *3.77 million km²* of inland surface water: more than the whole area of India.', 'EC JRC / UNEP SDG 6.6.1'],
  ['Canada and Russia alone hold *43%* of the world’s mapped inland surface water.', 'EC JRC / UNEP · 2018'],
  ['Between 1984 and 2015, permanent water vanished from almost *90,000 km²* — about the size of Lake Superior.', 'Pekel et al. 2016, Nature'],
  ['In the same years *184,000 km²* of new permanent water formed, much of it behind new dams.', 'Pekel et al. 2016, Nature'],
  ['Over *70%* of the world’s net loss of permanent water happened in the Middle East and Central Asia.', 'Pekel et al. 2016, Nature'],
  ['That global map was built from more than *three million* Landsat images at 30 m.', 'Pekel et al. 2016, Nature'],
  ['In 1984 Landsat could not see about *half* of the world’s water. A gap in the data is not a dry year.', 'EC JRC unobserved estimate'],
  ['Since 2000, only about *3%* of the world’s water goes unseen by Landsat in a typical year.', 'EC JRC / UNEP · 2000–2018'],
  ['About a *quarter* of the world’s surface water is seasonal: it comes and goes within one year.', 'EC JRC / UNEP · 2018'],
  ['In Namibia *96%* of mapped water is seasonal; in Botswana 93%. Whole landscapes flood and dry each year.', 'EC JRC / UNEP · 2018'],
  ['Oceania’s water is mostly seasonal: only *36%* of it stays all year.', 'EC JRC / UNEP · 2018'],
  ['Of 101 countries with more than 1,000 km² of water, *91* gained some between 2000–02 and 2016–18.', 'EC JRC / UNEP · our analysis'],
  ['Better satellite coverage can make mapped water area rise. The default Bayesian model excludes years with poor coverage.', 'EDev-Vision method'],
  ['Cambodia lost *13%* of its surface water between 2000–02 and 2016–18, the largest share among big-water countries.', 'EC JRC / UNEP · our analysis'],
  ['Australia lost about *2,900 km²* of surface water over the same years, the largest loss in km².', 'EC JRC / UNEP · our analysis'],
  ['Pakistan’s mapped surface water grew by *82%* from 2000–02 to 2016–18, most of it seasonal.', 'EC JRC / UNEP · our analysis'],
  ['In Thailand, yearly rain and yearly water move together almost in step: *r = 0.82*.', 'ERA5 · EC JRC / UNEP'],
  ['The *Bayesian map* compares the projected area with each country’s own historical average.', 'RSynthesis Bayesian projections'],
  ['The *Ridge experiment* learns how much mapped water area changes relative to the last reliable observation.', 'RSynthesis one-year experiment'],
  ['The *Oceanic Niño Index* measures sea surface temperature anomalies in the tropical Pacific.', 'NOAA CPC · ONI'],
  ['Worldwide, 2024 was *0.72 °C* warmer than the 1991–2020 average.', 'Copernicus ERA5 · via OWID'],
  ['The same rainfall can correspond to different water areas depending on prior conditions and the shape of a basin.', 'RSynthesis model context'],
  ['UNEP’s later release shows the world’s lakes and rivers *+3.1%* larger in 2022 than in 2018.', 'UNEP SDG 6.6.1 · 2018–2022'],
  ['The Bayesian model trains on *water observations through 2018* and uses climate inputs for later years when available.', 'RSynthesis Bayesian projections'],
  ['The probability map’s *50%* mark means roughly half the simulated outcomes fall below the historical average.', 'RSynthesis Bayesian projections'],
  ['*153* countries share rivers, lakes or aquifers with a neighbour.', 'UN-Water'],
  ['Shared, cross-border basins carry about *60%* of the world’s freshwater flow.', 'UN-Water'],
  ['NISAR’s L-band radar maps nearly all of Earth’s land and ice every *12 days*, through clouds, day or night.', 'NASA–ISRO NISAR'],
  ['Radar sees calm water as dark and flooded forests as bright: water hiding under plants *bounces back twice*.', 'SAR physics · NASA OPERA DSWx-S1'],
  ['Optical satellites miss water under clouds and plants. That is why this site starts from radar.', 'NASA OPERA DSWx-HLS vs DSWx-S1'],
];

const INTERVAL_MS = 8000;

function Highlighted({ text }: { text: string }) {
  return <>{text.split('*').map((part, i) => (i % 2 ? <b key={i}>{part}</b> : part))}</>;
}

export default function FactTicker({ reduced = false }: { reduced?: boolean }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % FACTS.length), INTERVAL_MS);
    return () => clearInterval(id);
  }, []);
  const [text, source] = FACTS[index];
  return (
    <div className="fact-card">
      <div className="fact-top">
        <span>DID YOU KNOW?</span>
        <span>{String(index + 1).padStart(2, '0')} / {FACTS.length}</span>
      </div>
      <div className="fact-body" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={index}
            initial={{ opacity: 0, y: reduced ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : -8 }}
            transition={{ duration: reduced ? 0 : 0.45 }}
          >
            <Highlighted text={text} />
          </motion.p>
        </AnimatePresence>
      </div>
      <small className="fact-source">{source}</small>
      {/* Restarts with every sentence, so the 8-second rhythm is visible. */}
      <i key={index} className="fact-progress" style={{ animationDuration: `${INTERVAL_MS}ms` }} />
    </div>
  );
}
