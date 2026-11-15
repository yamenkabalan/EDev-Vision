// Builds ../../assistant-proxy/api/world-context.json: everything the AI assistant may say about
// any country, continent or the world, computed by the same engine the site runs.
// Run: node --experimental-strip-types scripts/assistant-context.mts
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const root = new URL('../public/data/', import.meta.url);
const g = JSON.parse(readFileSync(new URL('global-water.json', root), 'utf8'));
const d = JSON.parse(readFileSync(new URL('world.json', root), 'utf8'));
globalThis.fetch = (async (u: string) => ({ ok: true, json: async () => (String(u).includes('global-water') ? g : d) })) as never;
const W = await import(pathToFileURL(new URL('../lib/world.ts', import.meta.url).pathname.replace(/^\/(\w:)/, '$1')).href);
const world = await W.loadWorld();
const r0 = (v: number | null | undefined) => v == null || !Number.isFinite(v) ? null : Math.round(v);
const r2 = (v: number | null | undefined) => v == null || !Number.isFinite(v) ? null : Math.round(v * 100) / 100;
const places: Record<string, unknown> = {};
for (const p of world.places) {
  const pts = W.series(p, world.years);
  if (!pts.some((q: { value: number | null }) => q.value)) continue;
  const f = W.fit(world, p, W.DEFAULT_OPTIONS);
  const good = W.usable(pts), avg = W.mean(good.map((q: { value: number }) => q.value));
  const proj = f.ok ? W.project(world, p, f, Array.from({ length: 12 }, (_, i) => 2019 + i)) : [];
  const v = f.ok ? W.validate(world, p, W.DEFAULT_OPTIONS) : null;
  places[p.key] = {
    name: p.name, kind: p.kind, continent: p.continent,
    water: pts.map((q: { year: number; value: number | null; low: boolean; permanent: number | null; seasonal: number | null }) => [q.year, r0(q.value), q.low ? 1 : 0, r0(q.permanent), r0(q.seasonal)]),
    average_km2: r0(avg), well_observed_years: good.length,
    rain_pct_vs_normal: world.doc.climate_years.map((y: number) => [y, W.rainAnomaly(world.doc, p, y) ?? null]).filter((x: unknown[]) => x[1] !== null),
    heat_anomaly_c: p.ta ? world.doc.climate_years.map((y: number, i: number) => [y, p.ta[i]]).filter((x: unknown[]) => x[1] !== null) : [],
    unep_lakes_rivers_km2: p.sdg ? world.doc.sdg_years.map((y: number, i: number) => [y, r0(p.sdg[i])]).filter((x: unknown[]) => x[1] !== null) : [],
    engine: f.ok ? {
      weight_of_evidence: Object.fromEntries(f.used.map((c: string) => [c, r2(f.pip[c])])),
      effect_sign: Object.fromEntries(f.used.map((c: string) => [c, f.effect[c] > .002 ? 'more water' : f.effect[c] < -.002 ? 'less water' : 'no clear sign'])),
      trend_pct_per_decade_causes_held_equal: f.trendPerDecade == null ? null : r2(f.trendPerDecade * 100),
      projection: proj.map((q: { year: number; p10: number; p50: number; p90: number; known: string }) => ({ year: q.year, p10: r0(q.p10), median: r0(q.p50), p90: r0(q.p90), chance_below_average: r2(W.chanceBelow(q, avg)), causes: q.known })),
      test: v && { loo_skill: r2(v.loo?.skill), loo_typical_error_km2: r0(v.loo?.rmse), later_years_skill: r2(v.split?.skill), unep_2018_2022_change_pct: v.sdg ? { unep: r2(v.sdg.observed * 100), engine: r2(v.sdg.predicted * 100), range80: [r2(v.sdg.p10 * 100), r2(v.sdg.p90 * 100)] } : null },
    } : { not_fitted: f.reason },
  };
}
const out = { generated: new Date().toISOString().slice(0, 10), oni_dec_feb: world.doc.oni.years.map((y: number, i: number) => [y, world.doc.oni.djf[i]]), oni_latest: world.doc.oni.latest, places };
const path = new URL('../../../assistant-proxy/api/world-context.json', import.meta.url);
writeFileSync(path, JSON.stringify(out));
console.log('places', Object.keys(places).length, 'bytes', JSON.stringify(out).length);
