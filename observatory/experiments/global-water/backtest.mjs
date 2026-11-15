// Run with Node 24 from observatory: node experiments/global-water/backtest.mjs
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { loadWorld, mean } from '../../lib/world.ts';
import { asOf, CANDIDATES, combine, estimate, fitPanel, learnWapeWeights, learnWeights, median, observations, predictors } from './models.mjs';

const FIRST_REPORT_YEAR = 2013;
const BASIN_URL = 'https://storage.googleapis.com/global-surface-water-stats/hydrobasins3-all-2018.csv';
const activeCandidates = kind => kind === 'basin' ? CANDIDATES.filter(model => model !== 'climatePanel') : CANDIDATES;

async function loadData() {
  const read = name => readFile(new URL(`../../public/data/${name}.json`, import.meta.url));
  const [global, drivers] = await Promise.all([read('global-water'), read('world')]);
  const fingerprint = data => createHash('sha256').update(data).digest('hex');
  const cache = new URL('cache/hydrobasins3.csv', import.meta.url);
  let csv;
  try {
    csv = await readFile(cache);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const response = await fetch(BASIN_URL, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw Error(`HydroBASIN download failed (HTTP ${response.status}).`);
    csv = Buffer.from(await response.arrayBuffer());
    parseBasins(csv, JSON.parse(global).years);
    await mkdir(new URL('cache/', import.meta.url), { recursive: true });
    await writeFile(cache, csv);
  }
  const documents = { 'global-water': JSON.parse(global), world: JSON.parse(drivers) };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async url => ({ ok: true, json: async () => documents[String(url).split('/').at(-1).replace('.json', '')] });
  try {
    const world = await loadWorld();
    return {
      world,
      basins: parseBasins(csv, world.years),
      inputSha256: { globalWater: fingerprint(global), world: fingerprint(drivers), hydrobasins: fingerprint(csv) },
    };
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function parseBasins(csv, years) {
  const [header, ...lines] = csv.toString('utf8').trim().split(/\r?\n/);
  const columns = header.split(',');
  const fields = ['year', 'PFAF_ID', 'permanent', 'seasonal', 'projectedPermanent', 'projectedSeasonal'].map(name => columns.indexOf(name));
  assert.ok(fields.every(index => index >= 0), 'Unexpected HydroBASIN CSV header');
  const basins = new Map();
  for (const line of lines) {
    const parts = line.split(',');
    const [year, id, ...values] = fields.map(i => parts[i]?.trim() ? Number(parts[i]) : NaN);
    const index = years.indexOf(year);
    assert.ok(index >= 0 && Number.isInteger(id) && values.every(v => Number.isFinite(v) && v >= 0), 'Invalid HydroBASIN row');
    if (!basins.has(id)) basins.set(id, { key: `b${id}`, kind: 'basin', name: String(id), values: years.map(() => null), pr: null, ta: null });
    const basin = basins.get(id);
    assert.equal(basin.values[index], null, 'Duplicate HydroBASIN year');
    basin.values[index] = values;
  }
  assert.ok(basins.size > 0, 'Empty HydroBASIN file');
  return [...basins.values()];
}

function run(world, places, horizon) {
  const rows = [];
  const training = [];
  const series = places.map(place => ({ place, points: observations(world, place) }));
  for (const year of world.years) {
    const cutoff = year - horizon;
    const known = asOf(world, cutoff);
    const priorTraining = training.filter(row => row.year <= cutoff);
    const priorErrors = rows.filter(row => row.year <= cutoff);
    const panels = { water: fitPanel(priorTraining, 'water'), climate: fitPanel(priorTraining, 'climate') };
    const wapeWeights = new Map([...new Set(places.map(place => place.kind))].map(kind => [
      kind, learnWapeWeights(priorErrors.filter(row => row.kind === kind && row.year > cutoff - 8), activeCandidates(kind)),
    ]));
    for (const { place, points } of series) {
      const prior = points.filter(point => point.year <= cutoff);
      const actual = points.find(point => point.year === year);
      if (!actual || prior.length < 3) continue;
      if (place.kind !== 'world' && place.kind !== 'continent') {
        training.push({
          year, ...predictors(known.doc, place, prior, cutoff),
          logChange: Math.log(actual.value / prior.at(-1).value),
        });
      }
      if (prior.length < 8) continue;
      const predictions = estimate(known, place, year, prior, panels);
      if (!predictions) continue;
      const candidates = activeCandidates(place.kind);
      const equalWeights = Object.fromEntries(candidates.map(model => [model, 1 / candidates.length]));
      const weights = priorErrors.some(row => row.kind === place.kind) ? learnWeights(priorErrors, place, candidates) : equalWeights;
      const sameExperts = Object.keys(weights);
      const equalSelected = Object.fromEntries(sameExperts.map(model => [model, 1 / sameExperts.length]));
      predictions.equal = combine(predictions, equalWeights);
      predictions.equalSelected = combine(predictions, equalSelected);
      predictions.learned = combine(predictions, weights);
      predictions.wapeBlend = combine(predictions, wapeWeights.get(place.kind));
      assert.ok(Object.values(predictions).every(v => Number.isFinite(v) && v > 0), `Invalid prediction for ${place.name} in ${year}`);
      rows.push({
        key: place.key, kind: place.kind, name: place.name, year, cutoff,
        actual: actual.value, lastObserved: prior.at(-1).year, unobservedRatio: actual.unobserved / actual.value,
        predictions, weights, wapeWeights: wapeWeights.get(place.kind),
      });
    }
  }
  return rows;
}

function score(rows, model) {
  const errors = rows.map(row => Math.abs(row.predictions[model] - row.actual));
  const percentages = errors.map((error, i) => 100 * error / rows[i].actual);
  const totalActual = rows.reduce((sum, row) => sum + row.actual, 0);
  const round = value => Number(value.toFixed(3));
  return {
    mae_km2: round(mean(errors)),
    rmse_km2: round(Math.sqrt(mean(errors.map(error => error ** 2)))),
    wape_pct: round(100 * errors.reduce((a, b) => a + b, 0) / totalActual),
    mape_pct: round(mean(percentages)),
    median_ape_pct: round(median(percentages)),
    within_3_pct: round(100 * mean(percentages.map(error => Number(error <= 3)))),
  };
}

function summarize(rows, candidates) {
  if (!rows.length) return null;
  return {
    places: new Set(rows.map(row => row.key)).size,
    rows: rows.length,
    allYears: [...new Set(rows.map(row => row.year))],
    candidates: Object.fromEntries(candidates.map(model => [model, score(rows, model)])),
  };
}

function verifyNoFutureInputs(world, place, rows) {
  const row = rows.find(candidate => candidate.key === place.key && candidate.year === FIRST_REPORT_YEAR);
  assert.ok(row, 'Expected a validation row for the temporal leakage check');
  const { year, cutoff } = row;
  const poison = (values, years) => values?.map((value, i) => years[i] > cutoff ? 1e12 : value);
  const changedPlace = {
    ...place,
    values: place.values.map((value, i) => world.years[i] > cutoff ? [1e12, 1e12, 0, 0] : value),
    pr: poison(place.pr, world.doc.climate_years),
    ta: poison(place.ta, world.doc.climate_years),
  };
  const changedWorld = {
    ...world, doc: {
      ...world.doc,
      oni: { ...world.doc.oni, djf: poison(world.doc.oni.djf, world.doc.oni.years) },
    },
  };
  const predict = (w, p) => {
    const known = asOf(w, cutoff);
    return estimate(known, p, year, observations(known, p), { climate: x => mean(x.climate), water: x => mean(x.water) });
  };
  assert.deepEqual(predict(world, place), predict(changedWorld, changedPlace));
  const earlier = rows.filter(candidate => candidate.year <= cutoff);
  assert.deepEqual(row.weights, learnWeights(earlier, place, CANDIDATES));
  assert.deepEqual(row.wapeWeights, learnWapeWeights(earlier.filter(candidate => candidate.kind === place.kind && candidate.year > cutoff - 8), CANDIDATES));
  for (const candidate of rows) {
    assert.ok(candidate.lastObserved <= candidate.cutoff && candidate.cutoff < candidate.year);
    for (const weights of [candidate.weights, candidate.wapeWeights]) {
      const values = Object.values(weights);
      assert.ok(values.every(w => w >= 0) && Math.abs(values.reduce((total, w) => total + w, 0) - 1) < 1e-9);
    }
  }
}

const { world, basins, inputSha256 } = await loadData();
const models = [...CANDIDATES, 'equal', 'equalSelected', 'learned', 'wapeBlend'];
const report = {
  inputs: { countriesAndTerritories: world.countries.length, basins: basins.length, inputSha256, basinSource: BASIN_URL },
  evaluationYears: [FIRST_REPORT_YEAR, world.years.at(-1)],
  target: 'JRC measured permanent plus seasonal surface-water area (km²)',
  cutoffRule: 'Water, climate and forecast errors available through target year minus horizon',
  evaluation: {},
};
const csv = [
  ['cohort', 'horizon', 'place_key', 'place', 'year', 'data_through', 'last_observed', 'observed_km2', 'unobserved_ratio', ...models, 'learned_weights', 'wape_weights'].join(','),
];

for (const horizon of [1, 2]) {
  const adminRows = run(world, world.places, horizon);
  const basinRows = run(world, basins, horizon);
  verifyNoFutureInputs(world, world.countries.find(place => place.iso3 === 'BRA'), adminRows);
  for (const row of [...adminRows, ...basinRows].filter(candidate => candidate.year >= FIRST_REPORT_YEAR)) {
    csv.push([
      row.kind, horizon, row.key, row.name, row.year, row.cutoff, row.lastObserved, row.actual, row.unobservedRatio,
      ...models.map(model => row.kind === 'basin' && model === 'climatePanel' ? '' : row.predictions[model].toFixed(6)),
      JSON.stringify(row.weights), JSON.stringify(row.wapeWeights),
    ].map(value => '"' + String(value).replaceAll('"', '""') + '"').join(','));
  }
  const heldYears = rows => rows.filter(row => row.year >= FIRST_REPORT_YEAR);
  const countries = heldYears(adminRows.filter(row => row.kind === 'country'));
  report.evaluation[horizon] = {
    countries: summarize(countries, models),
    countriesMax5pctUnobserved: summarize(countries.filter(row => row.unobservedRatio <= 0.05), models),
    continents: summarize(heldYears(adminRows.filter(row => row.kind === 'continent')), models),
    world: summarize(heldYears(adminRows.filter(row => row.kind === 'world')), models),
    basins: summarize(heldYears(basinRows), models.filter(model => model !== 'climatePanel')),
  };
}

const results = new URL('results/', import.meta.url);
await mkdir(results, { recursive: true });
await Promise.all([
  writeFile(new URL('report.json', results), JSON.stringify(report, null, 2) + '\n'),
  writeFile(new URL('predictions.csv', results), csv.join('\n') + '\n'),
]);
for (const [horizon, cohorts] of Object.entries(report.evaluation)) {
  console.log(`Data through target year minus ${horizon} · WAPE (%)`);
  console.table(Object.fromEntries(Object.entries(cohorts).map(([cohort, result]) => [cohort, result && {
    places: result.places, rows: result.rows, ...Object.fromEntries(Object.entries(result.candidates).map(([model, metric]) => [model, metric.wape_pct])),
  }])));
}
