/*
  World data and the RSynthesis world engine.

  Data: public/data/global-water.json (EC JRC / UNEP SDG 6.6.1 country water,
  1984-2018, Yamen's file) and public/data/world.json (scripts/build-world-data.py:
  ERA5 rain and heat per country 1984-2025, NOAA ONI, UNEP SDG 6.6.1 2000-2022,
  continents). Both are loaded once and shared by every section.

  Engine: the stage-1 idea of the RSynthesis engine (Bayesian model averaging
  over every combination of possible causes, Zellner g-prior evidence with a
  Scott-Berger multiplicity prior, Student-t predictive) applied to any
  country, continent or the world, in the reader's browser. The reader picks
  the causes and the data treatment; every answer on the page is recomputed.
*/
import type { Geometry } from './countryGeometry';

const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
export type WaterRow = [number, number, number, number] | null;
export type CountryRegion = { id: number; name: string; area_km2: number | null; focus: [number, number] | null; geometry: Geometry | null; values: WaterRow[] };
export type GlobalData = { years: number[]; regions: CountryRegion[]; sources: { statistics: string; boundaries: string }; note: string };
type Climate = (number | null)[] | null;
type WorldRegionRow = { id: number; iso3: string | null; continent: string | null; subregion: string | null; pr: Climate; ta: Climate; sdg: Climate };
type GroupRow = { id: string; name: string; members: number[]; area_km2: number; values: WaterRow[]; pr: Climate; ta: Climate; sdg: Climate };
export type WorldDoc = {
  water_years: number[]; climate_years: number[]; sdg_years: number[];
  oni: { years: number[]; djf: (number | null)[]; latest: { season: string; year: number; value: number } };
  regions: WorldRegionRow[]; groups: GroupRow[]; sources: Record<string, string>; note: string;
};

export type PlaceKind = 'country' | 'continent' | 'world';
export type Place = {
  key: string; kind: PlaceKind; name: string; values: WaterRow[]; area_km2: number | null;
  pr: Climate; ta: Climate; sdg: Climate; continent: string | null; iso3: string | null;
  geometry: Geometry | null; focus: [number, number] | null; members?: number[]; countryId?: number;
};
export type World = { years: number[]; doc: WorldDoc; global: GlobalData; places: Place[]; countries: Place[]; groups: Place[]; byKey: Map<string, Place> };

let cache: Promise<World> | null = null;
let globalCache: Promise<GlobalData> | null = null;

export function loadGlobal(): Promise<GlobalData> {
  globalCache ??= fetch(`${base}/data/global-water.json`).then(r => { if (!r.ok) throw Error('The global water file could not be loaded.'); return r.json(); })
    .then((v: GlobalData) => { if (!v.years?.length || !v.regions?.length) throw Error('The global water file is invalid.'); return v; })
    .catch(e => { globalCache = null; throw e; });
  return globalCache;
}

export function loadWorld(): Promise<World> {
  cache ??= Promise.all([loadGlobal(), fetch(`${base}/data/world.json`).then(r => { if (!r.ok) throw Error('The world data file could not be loaded.'); return r.json() as Promise<WorldDoc>; })])
    .then(([global, doc]) => {
      const extra = new Map(doc.regions.map(r => [r.id, r]));
      const countries: Place[] = global.regions.map(r => {
        const x = extra.get(r.id);
        return { key: `c${r.id}`, kind: 'country', name: r.name.replace('�', r.name.startsWith('C') ? 'ô' : 'é'), values: r.values, area_km2: r.area_km2, pr: x?.pr ?? null, ta: x?.ta ?? null, sdg: x?.sdg ?? null, continent: x?.continent ?? null, iso3: x?.iso3 ?? null, geometry: r.geometry, focus: r.focus, countryId: r.id };
      });
      const groups: Place[] = doc.groups.map(g => ({ key: `g${g.id}`, kind: g.id === 'world' ? 'world' : 'continent', name: g.id === 'world' ? 'The whole world' : g.name, values: g.values, area_km2: g.area_km2, pr: g.pr, ta: g.ta, sdg: g.sdg, continent: g.id === 'world' ? null : g.name, iso3: null, geometry: null, focus: null, members: g.members }));
      const places = [...groups, ...countries];
      return { years: global.years, doc, global, places, countries, groups, byKey: new Map(places.map(p => [p.key, p])) };
    })
    .catch(e => { cache = null; throw e; });
  return cache;
}

/* ------------------------------------------------------------------ series */
/** A year counts as well observed when Landsat's unobserved share is at most 15% of what it measured. */
export const LOW_COVERAGE = 0.15;
export type DataMode = 'measured' | 'gapfilled';
export type Point = { year: number; value: number | null; permanent: number | null; seasonal: number | null; unobserved: number | null; low: boolean };

export function series(place: Place, years: number[], mode: DataMode = 'measured'): Point[] {
  return years.map((year, i) => {
    const r = place.values[i];
    if (!r) return { year, value: null, permanent: null, seasonal: null, unobserved: null, low: true };
    const measured = r[0] + r[1], unobserved = r[2] + r[3];
    const low = measured <= 0 || unobserved > LOW_COVERAGE * measured;
    return { year, value: mode === 'gapfilled' ? measured + unobserved : measured, permanent: r[0], seasonal: r[1], unobserved, low: mode === 'gapfilled' ? measured + unobserved <= 0 : low };
  });
}

export const usable = (pts: Point[]) => pts.filter((p): p is Point & { value: number } => p.value !== null && p.value > 0 && !p.low);
export const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);
export const sd = (xs: number[]) => { const m = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, xs.length - 1)); };

/** Value of a climate series for a year, or undefined. */
export function climateAt(doc: WorldDoc, s: Climate, year: number) { const i = doc.climate_years.indexOf(year); const v = i >= 0 && s ? s[i] : null; return v ?? undefined; }
export function oniAt(doc: WorldDoc, year: number) { const i = doc.oni.years.indexOf(year); const v = i >= 0 ? doc.oni.djf[i] : null; return v ?? undefined; }
export function sdgAt(doc: WorldDoc, s: Climate, year: number) { const i = doc.sdg_years.indexOf(year); const v = i >= 0 && s ? s[i] : null; return v ?? undefined; }

/** Rain of a year as % above (+) or below (−) the place's 1991–2020 normal. */
export function rainAnomaly(doc: WorldDoc, place: Place, year: number) {
  const v = climateAt(doc, place.pr, year); if (v === undefined) return undefined;
  const normal = mean(doc.climate_years.filter(y => y >= 1991 && y <= 2020).map(y => climateAt(doc, place.pr, y)).filter((x): x is number => x !== undefined));
  return normal ? Math.round((v / normal - 1) * 100) : undefined;
}

/* ------------------------------------------------------------------ engine */
export type Cause = 'rain' | 'rain1' | 'heat' | 'enso' | 'trend';
export const CAUSES: { id: Cause; label: string; short: string; help: string }[] = [
  { id: 'rain', label: 'Rain this year', short: 'Rain', help: 'ERA5 yearly precipitation over the place (mm), standardised.' },
  { id: 'rain1', label: 'Rain last year', short: 'Last year’s rain', help: 'The year before: lakes, soils and groundwater carry water over.' },
  { id: 'heat', label: 'Heat', short: 'Heat', help: 'ERA5 yearly temperature anomaly: more heat means more evaporation.' },
  { id: 'enso', label: 'El Niño / La Niña', short: 'El Niño', help: 'NOAA Oceanic Niño Index, Dec–Feb: the Pacific changes rain worldwide.' },
  { id: 'trend', label: 'Long-term trend', short: 'Trend', help: 'Whatever changes steadily over the years: dams, irrigation, melting ice, better satellites.' },
];
export type EngineOptions = { causes: Cause[]; mode: DataMode; from: number };
export const DEFAULT_OPTIONS: EngineOptions = { causes: ['rain', 'rain1', 'heat', 'enso', 'trend'], mode: 'measured', from: 1984 };
export const LAST_PROJECTION = 2030;

type Model = { vars: Cause[]; weight: number; n: number; ybar: number; beta: number[]; shrink: number; S: number; XtXinv: number[][]; logEv: number };
export type Fit = {
  ok: boolean; reason?: string; n: number; years: number[]; available: Cause[]; used: Cause[];
  models: Model[]; pip: Record<Cause, number>; center: Record<Cause, [number, number]>;
  trendPerDecade: number | null; rainEffect: number | null; observedMean: number; lastObserved: { year: number; value: number } | null;
  /** Model-averaged effect of one standard deviation of each cause, on log water. */
  effect: Record<Cause, number>;
};

function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length, M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-10) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((row, i) => row[n] / row[i]);
}
function inverse(A: number[][]): number[][] | null {
  const n = A.length, cols: number[][] = [];
  for (let j = 0; j < n; j++) { const e = Array.from({ length: n }, (_, i) => (i === j ? 1 : 0)); const c = solve(A, e); if (!c) return null; cols.push(c); }
  return A.map((_, i) => cols.map(c => c[i]));
}
const lchoose = (n: number, k: number) => { let s = 0; for (let i = 1; i <= k; i++) s += Math.log((n - k + i) / i); return s; };

/** Raw covariate value of one cause for one year, or undefined when not known. */
function rawCause(doc: WorldDoc, place: Place, cause: Cause, year: number): number | undefined {
  switch (cause) {
    case 'rain': return climateAt(doc, place.pr, year);
    case 'rain1': return climateAt(doc, place.pr, year - 1);
    case 'heat': return climateAt(doc, place.ta, year);
    case 'enso': return oniAt(doc, year);
    case 'trend': return (year - 2000) / 10;
  }
}

export function availableCauses(doc: WorldDoc, place: Place): Cause[] {
  return CAUSES.map(c => c.id).filter(c => c === 'trend' || c === 'enso' || (c === 'heat' ? !!place.ta : !!place.pr));
}

/** Fit every combination of the chosen causes, optionally leaving some years out. */
export function fit(world: World, place: Place, opt: EngineOptions, leaveOut: (year: number) => boolean = () => false): Fit {
  const doc = world.doc;
  const available = availableCauses(doc, place);
  const used = opt.causes.filter(c => available.includes(c));
  const pts = usable(series(place, world.years, opt.mode)).filter(p => p.year >= opt.from && !leaveOut(p.year) && used.every(c => rawCause(doc, place, c, p.year) !== undefined));
  const zero = { rain: 0, rain1: 0, heat: 0, enso: 0, trend: 0 } as Record<Cause, number>;
  const empty = { effect: zero, n: pts.length, years: pts.map(p => p.year), available, used, models: [], pip: { rain: 0, rain1: 0, heat: 0, enso: 0, trend: 0 }, center: {} as Fit['center'], trendPerDecade: null, rainEffect: null, observedMean: mean(pts.map(p => p.value)), lastObserved: null };
  if (pts.length < 8) return { ...empty, ok: false, reason: `Only ${pts.length} well-observed years: too few to learn from.` };
  const n = pts.length, y = pts.map(p => Math.log(p.value)), ybar = mean(y), yc = y.map(v => v - ybar), SST = yc.reduce((s, v) => s + v * v, 0);
  const center = {} as Fit['center'];
  const col = (c: Cause) => { const raw = pts.map(p => rawCause(doc, place, c, p.year)!); const m = mean(raw), s = sd(raw) || 1; center[c] = [m, s]; return raw.map(v => (v - m) / s); };
  const X = Object.fromEntries(used.map(c => [c, col(c)])) as Record<Cause, number[]>;
  const g = Math.max(n, used.length ** 2), K = used.length;
  const models: Model[] = [];
  for (let mask = 0; mask < 1 << K; mask++) {
    const vars = used.filter((_, j) => mask & (1 << j)), k = vars.length;
    if (k >= n - 2) continue;
    const prior = -Math.log(K + 1) - lchoose(K, k);
    if (!k) { models.push({ vars, weight: 0, n, ybar, beta: [], shrink: 0, S: SST, XtXinv: [], logEv: prior }); continue; }
    const XtX = vars.map(a => vars.map(b => X[a].reduce((s, v, i) => s + v * X[b][i], 0)));
    const Xty = vars.map(a => X[a].reduce((s, v, i) => s + v * yc[i], 0));
    const inv = inverse(XtX); if (!inv) continue;
    const bhat = inv.map(row => row.reduce((s, v, j) => s + v * Xty[j], 0));
    const SSR = bhat.reduce((s, v, j) => s + v * Xty[j], 0), R2 = Math.min(.9999, Math.max(0, SSR / SST));
    const logEv = ((n - 1 - k) / 2) * Math.log(1 + g) - ((n - 1) / 2) * Math.log(1 + g * (1 - R2)) + prior;
    const shrink = g / (1 + g);
    models.push({ vars, weight: 0, n, ybar, beta: bhat.map(b => b * shrink), shrink, S: SST * (1 - shrink * R2), XtXinv: inv, logEv });
  }
  const top = Math.max(...models.map(m => m.logEv));
  let total = 0; for (const m of models) { m.weight = Math.exp(m.logEv - top); total += m.weight; }
  for (const m of models) m.weight /= total;
  const pip = { rain: 0, rain1: 0, heat: 0, enso: 0, trend: 0 } as Record<Cause, number>;
  for (const m of models) for (const v of m.vars) pip[v] += m.weight;
  // Average effect of ten years (trend) and of one standard deviation of rain, as % change of water.
  const eff = (c: Cause, per: number) => used.includes(c) ? Math.exp(models.reduce((s, m) => { const j = m.vars.indexOf(c); return s + (j >= 0 ? m.weight * m.beta[j] : 0); }, 0) * per) - 1 : null;
  const last = [...pts].reverse()[0];
  const effect = { ...zero };
  for (const m of models) m.vars.forEach((v, j) => { effect[v] += m.weight * m.beta[j]; });
  return { effect, ok: true, n, years: pts.map(p => p.year), available, used, models, pip, center, trendPerDecade: used.includes('trend') ? eff('trend', 1 / center.trend[1]) : null, rainEffect: eff('rain', 1), observedMean: mean(pts.map(p => p.value)), lastObserved: last ? { year: last.year, value: last.value } : null };
}

/** Standardised value of a cause in a year for a fitted place, or undefined. */
export function causeZ(world: World, place: Place, f: Fit, cause: Cause, year: number) {
  const v = rawCause(world.doc, place, cause, year), c = f.center[cause];
  return v === undefined || !c ? undefined : (v - c[0]) / c[1];
}

/* random numbers: seeded, so the page shows the same answer for the same choices */
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function normal(r: () => number) { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }
function gamma(r: () => number, k: number): number { if (k < 1) return gamma(r, k + 1) * Math.pow(r(), 1 / k); const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d); for (;;) { let x, v; do { x = normal(r); v = 1 + c * x; } while (v <= 0); v = v * v * v; const u = r(); if (u < 1 - .0331 * x ** 4 || Math.log(u) < .5 * x * x + d * (1 - v + Math.log(v))) return d * v; } }

export type Known = 'known' | 'partly' | 'unknown';
export type ProjectionYear = { year: number; p025: number; p10: number; p50: number; p90: number; p975: number; known: Known; draws: number[] };

/** Where a cause is not known for a year, draw it from these years of the same place. */
function pool(doc: WorldDoc, place: Place, cause: Cause): number[] {
  const years = cause === 'heat' ? doc.climate_years.filter(y => y >= 2016) : cause === 'enso' ? doc.oni.years : doc.climate_years;
  return years.map(y => rawCause(doc, place, cause, y)).filter((v): v is number => v !== undefined);
}

export function project(world: World, place: Place, f: Fit, years: number[], draws = 1200, seed = 7): ProjectionYear[] {
  if (!f.ok) return [];
  const doc = world.doc, r = rng(seed), pools = Object.fromEntries(f.used.map(c => [c, pool(doc, place, c)])) as Record<Cause, number[]>;
  const cum: number[] = []; let acc = 0; for (const m of f.models) { acc += m.weight; cum.push(acc); }
  const cap = Math.max(...usable(series(place, world.years, 'gapfilled')).map(p => p.value), f.observedMean) * 3;
  return years.map(year => {
    const raw = Object.fromEntries(f.used.map(c => [c, rawCause(doc, place, c, year)])) as Record<Cause, number | undefined>;
    const missing = f.used.filter(c => raw[c] === undefined);
    const known: Known = !missing.length ? 'known' : missing.length < f.used.filter(c => c !== 'trend').length ? 'partly' : 'unknown';
    const out: number[] = [];
    for (let d = 0; d < draws; d++) {
      const u = r(); let mi = cum.findIndex(c => c >= u); if (mi < 0) mi = f.models.length - 1;
      const m = f.models[mi];
      const x = m.vars.map(c => { const v = raw[c] ?? pools[c][Math.floor(r() * pools[c].length)]; const [mu, s] = f.center[c]; return (v - mu) / s; });
      const loc = m.ybar + x.reduce((s, v, j) => s + v * m.beta[j], 0);
      const quad = m.vars.length ? x.reduce((s, v, i) => s + v * m.XtXinv[i].reduce((t, w, j) => t + w * x[j], 0), 0) : 0;
      const df = m.n - 1, scale = Math.sqrt((m.S / df) * (1 + 1 / m.n + m.shrink * quad));
      const t = normal(r) / Math.sqrt(2 * gamma(r, df / 2) / df);
      out.push(Math.min(cap, Math.exp(loc + scale * t)));
    }
    out.sort((a, b) => a - b);
    const q = (p: number) => out[Math.min(out.length - 1, Math.floor(p * out.length))];
    return { year, p025: q(.025), p10: q(.1), p50: q(.5), p90: q(.9), p975: q(.975), known, draws: out };
  });
}

export const chanceBelow = (p: ProjectionYear, v: number) => { let lo = 0, hi = p.draws.length; while (lo < hi) { const m = (lo + hi) >> 1; if (p.draws[m] < v) lo = m + 1; else hi = m; } return lo / p.draws.length; };

export type Validation = { loo: { rmse: number; skill: number; n: number; points: { year: number; observed: number; predicted: number }[] } | null; split: { rmse: number; skill: number; trainTo: number; n: number } | null; sdg: { from: number; to: number; observed: number; predicted: number; p10: number; p90: number } | null };

const medianOf = (world: World, place: Place, f: Fit, year: number) => project(world, place, f, [year], 300, year)[0]?.p50;

export function validate(world: World, place: Place, opt: EngineOptions): Validation {
  const full = fit(world, place, opt);
  if (!full.ok) return { loo: null, split: null, sdg: null };
  const obs = new Map(usable(series(place, world.years, opt.mode)).map(p => [p.year, p.value]));
  const points: { year: number; observed: number; predicted: number }[] = [];
  let se = 0, sc = 0;
  for (const year of full.years) {
    const f = fit(world, place, opt, y => y === year); if (!f.ok) continue;
    const pred = medianOf(world, place, f, year); if (pred === undefined) continue;
    const o = obs.get(year)!; points.push({ year, observed: o, predicted: pred });
    se += (o - pred) ** 2; sc += (o - mean(full.years.filter(y => y !== year).map(y => obs.get(y)!))) ** 2;
  }
  const loo = points.length ? { rmse: Math.sqrt(se / points.length), skill: 1 - se / sc, n: points.length, points } : null;
  const trainTo = 2008, test = full.years.filter(y => y > trainTo);
  let split: Validation['split'] = null;
  const fs = fit(world, place, opt, y => y > trainTo);
  if (fs.ok && test.length >= 4) {
    const train = full.years.filter(y => y <= trainTo).map(y => obs.get(y)!), m = mean(train);
    let a = 0, b = 0; for (const year of test) { const p = medianOf(world, place, fs, year)!; a += (obs.get(year)! - p) ** 2; b += (obs.get(year)! - m) ** 2; }
    split = { rmse: Math.sqrt(a / test.length), skill: 1 - a / b, trainTo, n: test.length };
  }
  // Independent check after 2018: the later UNEP release, compared as a change, never as a total.
  let sdg: Validation['sdg'] = null;
  const s18 = sdgAt(world.doc, place.sdg, 2018), s22 = sdgAt(world.doc, place.sdg, 2022), last = obs.get(2018);
  if (s18 && s22 && last) {
    const p = project(world, place, full, [2022], 1200, 22)[0];
    sdg = { from: 2018, to: 2022, observed: s22 / s18 - 1, predicted: p.p50 / last - 1, p10: p.p10 / last - 1, p90: p.p90 / last - 1 };
  }
  return { loo, split, sdg };
}

/* ------------------------------------------------------------------ formatting */
export const km = (v: number | null | undefined) => v == null || !Number.isFinite(v) ? '—' : new Intl.NumberFormat('en', { maximumFractionDigits: v < 10 ? 1 : 0 }).format(v);
export const pctText = (v: number | null | undefined, digits = 0) => v == null || !Number.isFinite(v) ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v * 100).toFixed(digits)}%`;
export const prob = (v: number) => `${Math.round(v * 100)}%`;
/** A place's name inside a sentence: "the world" rather than "The whole world". */
export const inText = (p: Place) => (p.kind === 'world' ? 'the world' : p.name);

/** Bounding box of a country outline, choosing the narrower of the plain and the antimeridian-shifted view. */
export function geometryBounds(geometry: Geometry): [[number, number], [number, number]] {
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates as number[][][]] : geometry.coordinates as number[][][][];
  const pts = polys.flatMap(p => p[0]);
  const lats = pts.map(p => p[1]);
  const plain = pts.map(p => p[0]), shifted = plain.map(x => (x < 0 ? x + 360 : x));
  const span = (xs: number[]) => Math.max(...xs) - Math.min(...xs);
  const xs = span(shifted) < span(plain) - 1 ? shifted : plain;
  let west = Math.min(...xs), east = Math.max(...xs);
  if (west > 180) { west -= 360; east -= 360; }
  return [[west, Math.min(...lats)], [east, Math.max(...lats)]];
}

const CONTINENT_BOUNDS: Record<string, [[number, number], [number, number]]> = {
  Africa: [[-19, -36], [53, 38]], Asia: [[26, -11], [150, 56]], Europe: [[-25, 35], [45, 71]],
  'North America': [[-168, 7], [-52, 72]], 'South America': [[-82, -56], [-34, 13]], Oceania: [[112, -48], [180, 0]],
};

/** Bounds of a place: its outline, its continent, or the whole map. */
export function placeBounds(place: Place): [[number, number], [number, number]] {
  if (place.kind === 'world') return [[-160, -50], [175, 72]];
  if (place.kind === 'continent') return CONTINENT_BOUNDS[place.name] ?? [[-160, -50], [175, 72]];
  if (place.geometry) return geometryBounds(place.geometry);
  if (place.focus) return [[place.focus[0] - 2, place.focus[1] - 2], [place.focus[0] + 2, place.focus[1] + 2]];
  return [[-160, -50], [175, 72]];
}

/* ------------------------------------------------------------------ selection shared by sections 03-08 */
export type Selection = { mode: 'world' | 'continent' | 'country' | 'compare'; a: string; b: string };
export const DEFAULT_SELECTION: Selection = { mode: 'world', a: 'gworld', b: 'c37' };
/** The places a selection shows: one, or two in compare mode. */
export function selected(world: World, s: Selection): Place[] {
  const a = world.byKey.get(s.a) ?? world.byKey.get('gworld')!;
  if (s.mode !== 'compare') return [a];
  const b = world.byKey.get(s.b);
  return b && b.key !== a.key ? [a, b] : [a];
}
