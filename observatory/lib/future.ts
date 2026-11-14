/*
  future.json, written by pipeline/future.py (the RSynthesis estimation
  engine): the 2026-2030 projection of yearly open water and the names of its
  probability maps. Validated here the same way as the rest of the feed: a
  malformed file is an error, never a silently empty projection.
*/
import { DATA_URL, getJSON } from './data';

export type Scenario = 'expected' | 'dry' | 'wet';
export const SCENARIOS: readonly Scenario[] = ['expected', 'dry', 'wet'];

export type ProjectionYear = {
  year: number;
  rain_mm: number | null;
  rain_known: boolean;
  delta_rain_mm?: number | null;
  enso?: number | null;
  mean_km2: number;
  sd_km2: number;
  p025_km2: number;
  p10_km2: number;
  p50_km2: number;
  p90_km2: number;
  p975_km2: number;
  map_km2: Record<Scenario, number>;
  likely_km2?: number;
  /** 40 equal-probability yearly areas of the forecast distribution (v2). */
  nodes_km2?: number[];
};

export type Hindcast = { year: number; observed_km2: number; predicted_km2: number };

export type FutureDoc = {
  name: string;
  version: string;
  generated: string;
  stage1: {
    /** v2: km2 per unit at a normal year, in v1's field names. */
    coef: { c1_km2_per_mm: number; c2_km2_per_year: number; local_rain_km2_per_mm?: number; enso_km2_per_point?: number };
    /** v2: t_values.year is the trend's posterior z-value. */
    t_values: { year: number };
    n_years: number;
    years: [number, number];
    loo_skill: number;
    loo_rmse_km2: number;
    chrono_skill: number;
    chrono_rmse_km2: number;
    rain_trend_t: number;
    rolling_rmse_km2?: number;
    rolling_from?: number;
    causes_used?: string[];
    v1?: { loo_skill: number; loo_rmse_km2: number; chrono_skill: number; rolling_rmse_km2: number };
  };
  stage2: {
    pixels: number;
    pixel_m: number;
    validation: {
      brier_skill_where: number;
      brier_skill_full: number | null;
      mean_iou: number;
      mean_iou_frequency_map: number;
      per_year: { year: number; brier_skill_full?: number; brier_skill_where: number; predicted_km2?: number; true_km2: number }[];
    };
  };
  projection: ProjectionYear[];
  hindcast: Hindcast[];
  climatology: { mean_km2: number; sd_km2: number; years: [number, number]; n_years: number };
  legend: { p: number; color: number[] }[];
  caveats: string[];
};

const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

export async function loadFuture(signal?: AbortSignal): Promise<FutureDoc> {
  const raw = await getJSON(`${DATA_URL}/future.json`, signal) as FutureDoc;
  const ok = raw && Array.isArray(raw.projection) && raw.projection.length > 0
    && raw.projection.every(p => num(p.year) && num(p.p10_km2) && num(p.p50_km2) && num(p.p90_km2) && num(p.sd_km2))
    && Array.isArray(raw.hindcast) && raw.stage1 && raw.stage2?.validation && raw.climatology && num(raw.climatology.mean_km2);
  if (!ok) throw new Error('The projection file is invalid.');
  return raw;
}

/** Standard normal CDF (Abramowitz & Stegun 7.1.26), enough for a displayed percentage. */
export function normalCdf(x: number) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2);
  return x >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

/** Chance (0-1) that the year's open water ends below `km2`: read from the forecast's
 *  equal-probability nodes when present (the v2 distribution is skewed), else a normal. */
export function chanceBelow(p: ProjectionYear, km2: number) {
  const q = p.nodes_km2;
  if (!q || q.length < 2) return normalCdf((km2 - p.mean_km2) / p.sd_km2);
  const n = q.length, prob = (k: number) => (k + 0.5) / n;
  if (km2 <= q[0]) return prob(0) * Math.max(0, km2) / Math.max(q[0], 1e-9);
  if (km2 >= q[n - 1]) return 1 - prob(0) * Math.exp(-(km2 - q[n - 1]) / Math.max(q[n - 1] - q[n - 2], 1e-9));
  let k = 0;
  while (q[k + 1] < km2) k++;
  return prob(k) + (prob(k + 1) - prob(k)) * (km2 - q[k]) / Math.max(q[k + 1] - q[k], 1e-9);
}

export const futureImage = (year: number, scenario: Scenario) => `${year}_${scenario}`;

/** Straight-line fit of yearly open water on Angolan Nov-Apr rain, well-observed years only. */
export function rainFit(history: { year: number; water_km2: number; low_coverage: boolean }[], rainOf: (year: number) => number | undefined) {
  const pts = history.filter(r => !r.low_coverage && rainOf(r.year) !== undefined).map(r => ({ year: r.year, rain: rainOf(r.year)!, water: r.water_km2 }));
  const n = pts.length;
  if (n < 3) return null;
  const mx = pts.reduce((s, p) => s + p.rain, 0) / n, my = pts.reduce((s, p) => s + p.water, 0) / n;
  const sxy = pts.reduce((s, p) => s + (p.rain - mx) * (p.water - my), 0);
  const sxx = pts.reduce((s, p) => s + (p.rain - mx) ** 2, 0), syy = pts.reduce((s, p) => s + (p.water - my) ** 2, 0);
  const slope = sxy / sxx;
  return { pts, n, slope, icpt: my - slope * mx, r: sxy / Math.sqrt(sxx * syy) };
}

export const km = (v: number) => new Intl.NumberFormat('en', { maximumFractionDigits: 0 }).format(Math.round(v));
export const pct = (v: number) => `${Math.round(v * 100)}%`;
