// Tests the RSynthesis world engine on every country with the default options and
// writes public/data/engine-summary.json (quoted in What is RSynthesis AI and Sources).
// Run: node --experimental-strip-types scripts/engine-summary.mts
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const root = new URL('../public/data/', import.meta.url);
const g = JSON.parse(readFileSync(new URL('global-water.json', root), 'utf8'));
const d = JSON.parse(readFileSync(new URL('world.json', root), 'utf8'));
globalThis.fetch = (async (u: string) => ({ ok: true, json: async () => (String(u).includes('global-water') ? g : d) })) as never;
const W = await import(pathToFileURL(new URL('../lib/world.ts', import.meta.url).pathname.replace(/^\/(\w:)/, '$1')).href);
const world = await W.loadWorld();
const med = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
const loo: number[] = [], split: number[] = [], inside: boolean[] = [], dir: boolean[] = [];
let fitted = 0, years = 0;
for (const p of world.countries) {
  const f = W.fit(world, p, W.DEFAULT_OPTIONS); if (!f.ok) continue;
  fitted++; years += f.n;
  const v = W.validate(world, p, W.DEFAULT_OPTIONS);
  if (v.loo) loo.push(v.loo.skill);
  if (v.split) split.push(v.split.skill);
  if (v.sdg) { inside.push(v.sdg.observed >= v.sdg.p10 && v.sdg.observed <= v.sdg.p90); dir.push(Math.sign(v.sdg.observed) === Math.sign(v.sdg.predicted)); }
}
const wv = W.validate(world, world.byKey.get('gworld'), W.DEFAULT_OPTIONS);
const out = {
  generated: new Date().toISOString().slice(0, 10), options: W.DEFAULT_OPTIONS, countries_fitted: fitted, mean_years: +(years / fitted).toFixed(1),
  loo_skill_median: +med(loo)!.toFixed(2), loo_skill_positive: +(loo.filter(x => x > 0).length / loo.length).toFixed(2), loo_n: loo.length,
  split_skill_median: +med(split)!.toFixed(2), split_n: split.length,
  sdg_inside_80: +(inside.filter(Boolean).length / inside.length).toFixed(2), sdg_direction: +(dir.filter(Boolean).length / dir.length).toFixed(2), sdg_n: inside.length,
  world: { loo_skill: wv.loo && +wv.loo.skill.toFixed(2), split_skill: wv.split && +wv.split.skill.toFixed(2) },
};
writeFileSync(new URL('engine-summary.json', root), JSON.stringify(out, null, 1));
console.log(out);
