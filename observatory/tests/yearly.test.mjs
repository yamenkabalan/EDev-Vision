import { test } from 'node:test';
import assert from 'node:assert/strict';
import { yearlySeries, compareYear, driverTable, yearSentences, ensoPhase } from '../lib/yearly.ts';
import { COPY } from '../lib/copy.ts';

const rows = [
  { year: 2016, water_km2: 1000, low_coverage: false },
  { year: 2017, water_km2: 1500, low_coverage: false },
  { year: 2019, water_km2: 500, low_coverage: false },
  { year: 2020, water_km2: 300, low_coverage: true },
  { year: 2021, water_km2: 1800, low_coverage: true },
];

test('Missing years stay gaps and partial years never count as dry', () => {
  const s = yearlySeries(rows, 2022);
  assert.equal(s.mean, 1000); // only full-coverage years
  assert.deepEqual(s.points.map(p => p.year), [2016, 2017, 2018, 2019, 2020, 2021, 2022]);
  const by = Object.fromEntries(s.points.map(p => [p.year, p]));
  assert.equal(by[2018].cls, 'none'); assert.equal(by[2018].water, null);
  assert.equal(by[2022].cls, 'none');
  assert.equal(by[2016].cls, 'near');
  assert.equal(by[2017].cls, 'wet');
  assert.equal(by[2019].cls, 'dry');
  assert.equal(by[2020].cls, 'uncertain'); // lower bound below the mean says nothing
  assert.equal(by[2021].cls, 'wet'); assert.equal(by[2021].partial, true); // lower bound already wet
});

test('Year comparisons are hidden when a neighbour has no value', () => {
  const s = yearlySeries(rows, 2022);
  assert.equal(compareYear(s, 2019, 2018), null);
  assert.deepEqual(compareYear(s, 2017, 2016), { year: 2016, diff: 500, pct: 50, partial: false });
  assert.equal(compareYear(s, 2019, 2020).partial, true);
});

const story = {
  normal_period: [1991, 2020],
  years: {
    '1991': { causes: [{ id: 'headwater_rain', level: 0, value: '1000 mm' }, { id: 'inflow', level: 0, value: '600 m3/s' }] },
    '2019': { causes: [
      { id: 'enso', level: -1, value: 'ONI +1.0' },
      { id: 'headwater_rain', level: -2, value: '700 mm' },
      { id: 'inflow', level: -1, value: '371 m3/s' },
      { id: 'local_rain', level: 0, value: '500 mm' },
      { id: 'heat', level: -1, value: '+0.6 C' },
    ] },
    '2025': { causes: [{ id: 'enso', level: 0, value: 'ONI -0.5' }] },
  },
};

test('Driver anomalies follow the pipeline: normal period, rank and ENSO level', () => {
  const t = driverTable(story);
  const d = t.get(2019);
  assert.equal(d.headwater_rain.pct, -18); // normal = mean of 1991 and 2019 = 850 mm; 700 / 850 - 1 = -18%
  assert.equal(d.inflow.rank, 2); assert.equal(d.inflow.of, 2);
  assert.equal(d.heat.value, 0.6);
  assert.equal(d.enso.phase, 'elNino');
  // -0.5 printed, but the pipeline called it neutral (level 0)
  assert.equal(t.get(2025).enso.phase, 'neutral');
  assert.equal(ensoPhase(-2), 'strongElNino'); assert.equal(ensoPhase(2), 'strongLaNina');
});

test('The yearly sentence names indicators, matches direction and ends with the caveat', () => {
  const d = driverTable(story).get(2019);
  const s = yearSentences('dry', d, COPY.sentence, k => COPY.drivers.phases[k]);
  assert.match(s[0], /^Rain in the Angolan highlands \(ERA5\) was 18% below normal and modelled river inflow \(GloFAS\) ranked 2 of 2 years, which fits the low flood\.$/);
  assert.match(s[1], /NOAA ONI \+1\.0/); assert.match(s[1], /NASA POWER/);
  assert.doesNotMatch(s[1], /over the Delta/); // level 0 is left out
  assert.equal(s.at(-1), COPY.sentence.caveat);
  assert.match(yearSentences('wet', d, COPY.sentence, k => k)[0], /does not match the high flood/);
  assert.match(yearSentences('none', undefined, COPY.sentence, k => k)[0], /no upstream rain or river data/);
});
