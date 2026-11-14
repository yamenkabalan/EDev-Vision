'use client';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/*
  Thirty short findings, one every 8 seconds, looping.
  Every number is read from the published data feed
  (https://asadgnc.github.io/edev-data/data): timeseries.json (NISAR 2026),
  history.json (Landsat 1984-2025), story.json (yearly causes, people, events),
  forecast.json (skill test), assistant_context.json (JRC occurrence, water
  balance) and meta.json. Questions stay questions; our hypothesis says so.
  Text between *asterisks* is highlighted.
*/
export const FACTS: [text: string, source: string][] = [
  ['In 2019 the flood simply did not arrive: only *376 km²* of open water was mapped.', 'Landsat · WOfS annual'],
  ['2014 held *2,196 km²* of open water. Five years later, 376. The same delta.', 'Landsat · 1984–2025'],
  ['The water arriving here in July fell as rain in the Angolan highlands months earlier.', 'Inman & Lyons 2020'],
  ['Of all the water entering the delta, *96–98%* leaves again as vapour, not as river.', 'Water-balance literature'],
  ['Only about *2%* of the inflow ever flows on towards Maun. A delta that empties upward.', 'Water-balance literature'],
  ['In 2024 a strong El Niño met flood days *2.0 °C* hotter than normal. Water: 59% down.', 'NASA POWER · ONI · WOfS'],
  ['During that 2024 drought, herds of hippos were stranded in drying pools near Maun.', 'AFP, 26 April 2024'],
  ['A sign, or a coincidence? The 2016 El Niño was stronger, yet the flood stayed large.', 'ONI +2.5 · 1,541 km²'],
  ['Angolan November–April rain explains about *59%* of the yearly water, r = 0.77.', 'Leave-one-year-out test'],
  ['One number beats the long-term average at predicting this flood: upstream rainfall.', 'Forecast test · skill 0.56'],
  ['The river model puts the 2026 inflow peak at *808 m³/s*: rank 14 of 30 years.', 'GloFAS model, not a gauge'],
  ['2026 inflow nearly doubled the 2023–2025 peaks, which all stayed below 460 m³/s.', 'GloFAS model · Mohembo'],
  ['NISAR saw the 2026 open-water peak on *8 July*: 773 km² of mirror-dark surface.', 'NISAR L2 GCOV · HH, HV'],
  ['By 12 October 2026 that open water was down to 157 km²: an *80%* retreat.', 'NISAR · 10 dates, 2026'],
  ['Open water peaked in July. Flooded vegetation peaked *60 days* later, in September.', 'NISAR · 2026 series'],
  ['Our hypothesis, not proof: the flood fills the channels first, the reed beds later.', 'EDev-Vision reading'],
  ['In September 2026 nearly half of the mapped flood was hiding under vegetation.', 'NISAR · 312 km² flooded veg'],
  ['L-band radar sees through the canopy; optical sensors do not. Two different deltas.', 'SAR physics · NISAR docs'],
  ['Open water is dark to radar, flooded reeds are bright. One image holds both answers.', 'Double bounce in HH'],
  ['In 2019 only 37,700 people lived within 5 km of water, a third fewer than usual.', 'WorldPop 2020 · WOfS'],
  ['Water moves and people follow it: that count swings by *20,000* between years.', 'WorldPop 2020 · WOfS'],
  ['Across 41 years, *1,913 km²* of this area was covered by water at least once.', 'JRC occurrence 1984–2024'],
  ['Only *13 km²* stayed wet in three quarters of those years. A delta is motion.', 'JRC occurrence 1984–2024'],
  ['Landsat mapped zero water here in 1985. Not a drought: only one cloud-free look.', 'WOfS · low-coverage flag'],
  ['1988 is missing from the 41-year record. A gap in the data is not a dry year.', 'WOfS · 1988 absent'],
  ['NISAR has no data between 27 July and 10 August 2026, so we draw the hole.', 'NISAR · known gap'],
  ['Unfiltered radar left one mapped pixel in six standing alone. That is speckle, not ponds.', 'Quegan & Yu 2001 filter'],
  ['Frequency B carries a sixteenth of the data and still agrees within tenths of a decibel.', 'NISAR product metadata'],
  ['All ten 2026 dates share one track, frame and pass: what changes is the ground itself.', 'Track 172 · frame 168'],
  ['2025 split the evidence: the river model said weak year, Landsat mapped a normal flood.', 'Models disagree, we say so'],
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
