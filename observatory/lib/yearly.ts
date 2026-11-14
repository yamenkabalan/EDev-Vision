/*
  Yearly open water and its drivers, computed from the published feed:
  history.json (Landsat WOfS annual open water) and story.json (per-year
  driver levels and values produced by pipeline/story.py).

  No runtime imports, so the Node test runner can load this file directly.
  Wording is passed in by the caller (see COPY in lib/copy.ts).
*/

export type HistoryRow = { year: number; water_km2: number; low_coverage: boolean };
export type YearClass = 'dry' | 'near' | 'wet' | 'uncertain' | 'none';
export type YearPoint = {
  year: number;
  /** Annual open-water area in km², null when the year has no value. */
  water: number | null;
  /** Few clear Landsat looks: the area is a lower bound. */
  partial: boolean;
  /** Percent difference from the long-term mean, null without a value. */
  anomaly: number | null;
  cls: YearClass;
};
export type YearSeries = {
  points: YearPoint[];
  mean: number | null;
  meanCount: number;
  meanFirst: number | null;
  meanLast: number | null;
};

/** ± percent around the long-term mean that counts as "near average". */
export const NEAR_BAND = 20;

/**
 * One point per calendar year from the first record to `through`, with gaps kept
 * as 'none' (never interpolated). The long-term mean uses only years with enough
 * clear images; low-coverage years are lower bounds and are classed 'uncertain'
 * unless even their lower bound is above the wet threshold.
 */
export function yearlySeries(rows: HistoryRow[], through?: number): YearSeries {
  const valid = rows.filter(r => Number.isInteger(r.year) && typeof r.water_km2 === 'number' && Number.isFinite(r.water_km2) && r.water_km2 >= 0);
  if (!valid.length) return { points: [], mean: null, meanCount: 0, meanFirst: null, meanLast: null };
  const full = valid.filter(r => !r.low_coverage);
  const mean = full.length ? full.reduce((s, r) => s + r.water_km2, 0) / full.length : null;
  const byYear = new Map(valid.map(r => [r.year, r]));
  const first = Math.min(...valid.map(r => r.year));
  const last = Math.max(through ?? -Infinity, ...valid.map(r => r.year));
  const points: YearPoint[] = [];
  for (let year = first; year <= last; year++) {
    const r = byYear.get(year);
    if (!r) { points.push({ year, water: null, partial: false, anomaly: null, cls: 'none' }); continue; }
    const anomaly = mean ? 100 * (r.water_km2 / mean - 1) : null;
    let cls: YearClass;
    if (anomaly === null) cls = 'uncertain';
    else if (r.low_coverage) cls = anomaly > NEAR_BAND ? 'wet' : 'uncertain';
    else cls = anomaly < -NEAR_BAND ? 'dry' : anomaly > NEAR_BAND ? 'wet' : 'near';
    points.push({ year, water: r.water_km2, partial: r.low_coverage, anomaly, cls });
  }
  return {
    points, mean, meanCount: full.length,
    meanFirst: full.length ? Math.min(...full.map(r => r.year)) : null,
    meanLast: full.length ? Math.max(...full.map(r => r.year)) : null,
  };
}

export type YearChange = { year: number; diff: number; pct: number | null; partial: boolean };
/** Selected year compared with another year; null when either has no value. */
export function compareYear(series: YearSeries, year: number, other: number): YearChange | null {
  const a = series.points.find(p => p.year === year), b = series.points.find(p => p.year === other);
  if (a?.water == null || b?.water == null) return null;
  return { year: other, diff: a.water - b.water, pct: b.water > 0 ? 100 * (a.water / b.water - 1) : null, partial: a.partial || b.partial };
}

/* ---------------------------------------------------------------- drivers */

export type DriverId = 'headwater_rain' | 'inflow' | 'enso' | 'local_rain' | 'heat';
export const DRIVER_ORDER: DriverId[] = ['headwater_rain', 'inflow', 'enso', 'local_rain', 'heat'];
export type EnsoPhase = 'strongElNino' | 'elNino' | 'neutral' | 'laNina' | 'strongLaNina';
export type Driver = {
  id: DriverId;
  /** -2 pushes towards a smaller flood … +2 towards a larger flood (story.json). */
  level: number;
  /** mm, m³/s, ONI index or °C anomaly, as published. */
  value: number;
  /** Rain: percent from the 1991–2020 normal. */
  pct?: number;
  /** Inflow: 1 = highest modelled peak. */
  rank?: number;
  of?: number;
  phase?: EnsoPhase;
};
export type YearDrivers = Partial<Record<DriverId, Driver>>;
type StoryCause = { id?: unknown; level?: unknown; value?: unknown };
type StoryYear = { causes?: unknown };
export type StoryDoc = { normal_period?: unknown; years?: Record<string, StoryYear> };

const firstNumber = (v: unknown) => {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') return NaN;
  const m = v.replace('−', '-').match(/[-+]?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : NaN;
};
/**
 * ENSO phase from the pipeline's level, not from the rounded ONI string: the
 * pipeline decided on the unrounded index (e.g. -0.47 is neutral, shown as -0.5).
 * El Niño dries southern Africa, so it carries a negative level.
 */
export const ensoPhase = (level: number): EnsoPhase =>
  level <= -2 ? 'strongElNino' : level === -1 ? 'elNino' : level >= 2 ? 'strongLaNina' : level === 1 ? 'laNina' : 'neutral';

/**
 * Numeric drivers per year from story.json. Rain anomalies use the same normal
 * period and the same rounding as pipeline/story.py, and the inflow rank is
 * recomputed over every year that has a modelled peak, as the pipeline does.
 */
export function driverTable(story: StoryDoc | null | undefined): Map<number, YearDrivers> {
  const out = new Map<number, YearDrivers>();
  const years = story?.years && typeof story.years === 'object' ? story.years : {};
  const raw = new Map<number, Partial<Record<DriverId, { level: number; value: number }>>>();
  for (const [key, rec] of Object.entries(years)) {
    const year = Number(key);
    if (!Number.isInteger(year) || !Array.isArray(rec?.causes)) continue;
    const row: Partial<Record<DriverId, { level: number; value: number }>> = {};
    for (const c of rec.causes as StoryCause[]) {
      const id = c?.id as DriverId;
      const value = firstNumber(c?.value), level = typeof c?.level === 'number' ? Math.max(-2, Math.min(2, Math.round(c.level))) : NaN;
      if (DRIVER_ORDER.includes(id) && Number.isFinite(value) && Number.isFinite(level)) row[id] = { level, value };
    }
    raw.set(year, row);
  }
  const np = Array.isArray(story?.normal_period) && story.normal_period.length === 2 ? story.normal_period.map(Number) : [1991, 2020];
  const normal = (id: DriverId) => {
    const v = [...raw].filter(([y, r]) => y >= np[0] && y <= np[1] && r[id]).map(([, r]) => r[id]!.value);
    return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
  };
  const rainNormal = { headwater_rain: normal('headwater_rain'), local_rain: normal('local_rain') };
  const inflowRank = [...raw].filter(([, r]) => r.inflow).sort((a, b) => b[1].inflow!.value - a[1].inflow!.value).map(([y]) => y);
  for (const [year, r] of raw) {
    const d: YearDrivers = {};
    for (const id of DRIVER_ORDER) {
      const c = r[id];
      if (!c) continue;
      const base: Driver = { id, level: c.level, value: c.value };
      if (id === 'headwater_rain' || id === 'local_rain') {
        const n = rainNormal[id];
        if (n) base.pct = Math.round(100 * (c.value / n - 1));
      } else if (id === 'inflow') {
        base.rank = inflowRank.indexOf(year) + 1;
        base.of = inflowRank.length;
      } else if (id === 'enso') {
        base.phase = ensoPhase(c.level);
      }
      d[id] = base;
    }
    out.set(year, d);
  }
  return out;
}

/** Which way a driver pushed the flood, from its published level. */
export const push = (level: number): 'dry' | 'wet' | 'neutral' => level < 0 ? 'dry' : level > 0 ? 'wet' : 'neutral';

/* --------------------------------------------------------------- sentence */

export type SentenceCopy = {
  headwater: (pct: number) => string;
  inflow: (rank: number, of: number) => string;
  noUpstream: string;
  fit: Record<'dryDry' | 'wetWet' | 'nearNear' | 'nearPushed' | 'dryNeutral' | 'wetNeutral' | 'dryWet' | 'wetDry' | 'uncertain' | 'none', string>;
  alsoPrefix: string;
  enso: (phase: string, v: number) => string;
  localRain: (pct: number) => string;
  heat: (d: number) => string;
  othersNormal: string;
  caveat: string;
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const list = (parts: string[]) => parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;

/**
 * Plain-language summary built by fixed rules from the computed anomalies.
 * Upstream drivers (Angolan rain, modelled inflow) lead because they feed the
 * flood months later; the other drivers follow only when they were not normal.
 * Always ends with the association caveat.
 */
export function yearSentences(cls: YearClass, d: YearDrivers | undefined, S: SentenceCopy, phaseLabel: (p: EnsoPhase) => string): string[] {
  const out: string[] = [];
  const hw = d?.headwater_rain, inf = d?.inflow;
  const upstream: string[] = [];
  if (hw?.pct !== undefined) upstream.push(S.headwater(hw.pct));
  if (inf?.rank) upstream.push(S.inflow(inf.rank, inf.of!));
  if (upstream.length) {
    const dir = Math.sign((hw?.level ?? 0) + (inf?.level ?? 0));
    const fit = cls === 'none' ? S.fit.none
      : cls === 'uncertain' ? S.fit.uncertain
      : cls === 'dry' ? (dir < 0 ? S.fit.dryDry : dir > 0 ? S.fit.dryWet : S.fit.dryNeutral)
      : cls === 'wet' ? (dir > 0 ? S.fit.wetWet : dir < 0 ? S.fit.wetDry : S.fit.wetNeutral)
      : dir === 0 ? S.fit.nearNear : S.fit.nearPushed;
    out.push(`${cap(list(upstream))}, ${fit}.`);
  } else {
    out.push(`${cap(S.noUpstream)}.`);
  }
  const also: string[] = [];
  const enso = d?.enso, local = d?.local_rain, heat = d?.heat;
  if (enso && enso.level !== 0 && enso.phase) also.push(S.enso(phaseLabel(enso.phase), enso.value));
  if (local && local.level !== 0 && local.pct !== undefined && Math.abs(local.pct) >= 3) also.push(S.localRain(local.pct));
  if (heat && heat.level !== 0) also.push(S.heat(heat.value));
  if (also.length) out.push(`${S.alsoPrefix}${list(also)}.`);
  else if (enso || local || heat) out.push(S.othersNormal);
  out.push(S.caveat);
  return out;
}
