import { climateAt, fit, mean, oniAt, project, sd, series, solve, usable, DEFAULT_OPTIONS } from '../../lib/world.ts';

export const CANDIDATES = ['persistence', 'median3', 'dampedTrend', 'bayesian', 'waterPanel', 'climatePanel'];

export function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export const limit = (n, max) => Math.min(max, Math.max(-max, n));

export function asOf(world, cutoff) {
  const climateYears = world.doc.climate_years.filter(year => year <= cutoff);
  const oniYears = world.doc.oni.years.filter(year => year <= cutoff);
  return {
    ...world,
    years: world.years.filter(year => year <= cutoff),
    doc: {
      ...world.doc,
      climate_years: climateYears,
      oni: { ...world.doc.oni, years: oniYears, djf: world.doc.oni.djf.slice(0, oniYears.length) },
    },
  };
}

function anomaly(doc, values, year, baseline, floor) {
  const value = climateAt(doc, values, year);
  if (value === undefined || baseline.length < 5) return [0, 1];
  return [limit((value - mean(baseline)) / Math.max(sd(baseline), floor), 4), 0];
}

export function predictors(doc, place, prior, cutoff) {
  const recent = prior.slice(-5);
  const last = recent.at(-1);
  const previous = recent.at(-2);
  const changes = recent.slice(1).map((point, i) =>
    Math.log(point.value / recent[i].value) / (point.year - recent[i].year));
  const logDeviation = Math.log(last.value / median(recent.map(point => point.value)));
  const water = [
    limit(Math.log(last.value / previous.value) / (last.year - previous.year), 1),
    limit(logDeviation, 1),
    limit(median(changes), 1),
    last.seasonal / last.value,
    last.unobserved / last.value,
    Math.log1p(cutoff - last.year),
  ];
  const climateHistory = values => Array.from({ length: 10 }, (_, i) => climateAt(doc, values, cutoff - 10 + i))
    .filter(value => value !== undefined);
  const rainHistory = climateHistory(place.pr);
  const enso = oniAt(doc, cutoff);
  return {
    water,
    climate: [
      ...water,
      ...anomaly(doc, place.pr, cutoff, rainHistory, 1),
      ...anomaly(doc, place.pr, cutoff - 1, rainHistory, 1),
      ...anomaly(doc, place.ta, cutoff, climateHistory(place.ta), 0.05),
      enso ?? 0,
      Number(enso === undefined),
    ],
  };
}

export function fitPanel(rows, field) {
  if (rows.length < 30) return () => 0;
  const columns = rows[0][field].map((_, i) => rows.map(row => row[field][i]));
  const centers = columns.map(mean);
  const scales = columns.map(column => Math.max(sd(column), 0.01));
  const standardize = xs => xs.map((x, i) => limit((x - centers[i]) / scales[i], 5));
  const design = rows.map(row => standardize(row[field]));
  const targets = rows.map(row => limit(row.logChange, Math.log(2)));
  const intercept = median(targets);
  const gram = centers.map((_, i) => centers.map((__, j) => {
    const ridge = i === j ? rows.length * 0.1 : 0;
    return design.reduce((sum, x) => sum + x[i] * x[j], ridge);
  }));
  const rhs = centers.map((_, i) => design.reduce((sum, x, j) => sum + x[i] * (targets[j] - intercept), 0));
  const beta = solve(gram, rhs);
  if (!beta) throw Error('Regularized panel regression could not be solved.');
  return row => limit(intercept + standardize(row[field]).reduce((sum, x, i) => sum + x * beta[i], 0), Math.log(2));
}

export function estimate(world, place, year, prior, panels) {
  const last = prior.at(-1);
  const cutoff = world.years.at(-1);
  const historicalPlace = { ...place, values: place.values.slice(0, world.years.length) };
  const fitted = fit(world, historicalPlace, DEFAULT_OPTIONS);
  if (!fitted.ok) return null;

  const recent = prior.slice(-5);
  const slopes = recent.slice(1).map((point, i) =>
    Math.log(point.value / recent[i].value) / (point.year - recent[i].year));
  const features = predictors(world.doc, place, prior, cutoff);
  return {
    persistence: last.value,
    median3: median(prior.slice(-3).map(point => point.value)),
    dampedTrend: last.value * Math.exp(0.5 * Math.min(3, year - last.year) * limit(median(slopes), 0.3)),
    bayesian: project(world, historicalPlace, fitted, [year], 501, year)[0].p50,
    waterPanel: last.value * Math.exp(panels.water(features)),
    climatePanel: last.value * Math.exp(panels.climate(features)),
  };
}

export function learnWeights(priorRows, region, candidates) {
  const peers = priorRows.filter(row => row.kind === region.kind);
  const local = peers.filter(row => row.key === region.key);
  const loss = (row, model) => Math.min(1, Math.abs(row.predictions[model] / row.actual - 1));
  const scores = candidates.map(model => {
    const typical = peers.length ? mean(peers.map(row => loss(row, model))) : 0.25;
    const localLoss = local.reduce((sum, row) => sum + loss(row, model), 0);
    return { model, error: (localLoss + 8 * typical) / (local.length + 8) };
  });
  const best = scores.sort((a, b) => a.error - b.error).slice(0, 3);
  const inverseLosses = best.map(row => 1 / Math.max(row.error, 0.01));
  const sum = inverseLosses.reduce((a, b) => a + b, 0);
  return Object.fromEntries(best.map((row, i) => [row.model, inverseLosses[i] / sum]));
}

export const combine = (predictions, weights) =>
  Object.entries(weights).reduce((sum, [model, weight]) => sum + weight * predictions[model], 0);

// Search convex mixtures in 25 percentage point steps on earlier forecasts.
export function learnWapeWeights(rows, candidates) {
  if (new Set(rows.map(row => row.year)).size < 3) return { persistence: 1 };
  const errors = rows.map(row => candidates.map(model => row.predictions[model] - row.actual));
  const units = candidates.map(() => 0);
  let bestError = Infinity;
  let bestWeights = { persistence: 1 };
  function search(index, remaining) {
    if (index === candidates.length - 1) {
      units[index] = remaining;
      let error = 0;
      for (const row of errors) {
        let weighted = 0;
        for (let i = 0; i < row.length; i++) weighted += units[i] * row[i];
        error += Math.abs(weighted);
      }
      if (error < bestError) {
        bestError = error;
        bestWeights = Object.fromEntries(candidates.flatMap((model, i) => units[i] ? [[model, units[i] / 4]] : []));
      }
      return;
    }
    for (let count = remaining; count >= 0; count--) {
      units[index] = count;
      search(index + 1, remaining - count);
    }
  }
  search(0, 4);
  return bestWeights;
}

export function observations(world, place) {
  return usable(series(place, world.years, DEFAULT_OPTIONS.mode));
}
