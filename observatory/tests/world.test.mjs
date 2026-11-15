// The RSynthesis world engine on the published data files.
// Run: npm test   (node --experimental-strip-types --test tests/*.test.mjs)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const g = JSON.parse(readFileSync(new URL('../public/data/global-water.json', import.meta.url), 'utf8'));
const d = JSON.parse(readFileSync(new URL('../public/data/world.json', import.meta.url), 'utf8'));
globalThis.fetch = async (u) => ({ ok: true, json: async () => (String(u).includes('global-water') ? g : d) });
const W = await import('../lib/world.ts');
const world = await W.loadWorld();
const byName = (n) => world.places.find((p) => p.name === n);

test('world file matches the country file', () => {
  assert.equal(d.regions.length, g.regions.length);
  assert.equal(world.groups[0].key, 'gworld');
  assert.ok(world.groups.length === 7);
});

test('low-coverage years are flagged and kept out of fitting', () => {
  const pts = W.series(byName('The whole world'), world.years);
  assert.ok(pts[0].low, '1984 is mostly unseen');
  assert.ok(!pts.at(-1).low, '2018 is well observed');
  const f = W.fit(world, byName('The whole world'), W.DEFAULT_OPTIONS);
  assert.ok(f.ok && f.years.every((y) => y >= 1999));
});

test('model weights form a probability distribution', () => {
  const f = W.fit(world, byName('Brazil'), W.DEFAULT_OPTIONS);
  assert.ok(f.ok);
  const total = f.models.reduce((s, m) => s + m.weight, 0);
  assert.ok(Math.abs(total - 1) < 1e-9);
  for (const v of Object.values(f.pip)) assert.ok(v >= 0 && v <= 1);
});

test('projections are ordered quantiles and reproducible', () => {
  const p = byName('India'), f = W.fit(world, p, W.DEFAULT_OPTIONS);
  const [a] = W.project(world, p, f, [2030]), [b] = W.project(world, p, f, [2030]);
  assert.ok(a.p025 <= a.p10 && a.p10 <= a.p50 && a.p50 <= a.p90 && a.p90 <= a.p975);
  assert.equal(a.p50, b.p50);
  assert.equal(a.known, 'unknown');
  assert.equal(W.project(world, p, f, [2020])[0].known, 'known');
});

test('the same year has the same projection alone or in a chart', () => {
  const p = byName('India'), f = W.fit(world, p, W.DEFAULT_OPTIONS);
  const [, chart] = W.project(world, p, f, [2022, 2030]);
  const [map] = W.project(world, p, f, [2030]);
  assert.deepEqual(chart, map);
});

test('chosen causes change the answer', () => {
  const p = byName('Australia');
  const all = W.fit(world, p, W.DEFAULT_OPTIONS), trendOnly = W.fit(world, p, { ...W.DEFAULT_OPTIONS, causes: ['trend'] });
  assert.ok(all.pip.rain > 0.5);
  assert.equal(trendOnly.used.length, 1);
  assert.notEqual(W.project(world, p, all, [2022])[0].p50, W.project(world, p, trendOnly, [2022])[0].p50);
});

test('country bounds handle the antimeridian', () => {
  const [[w, s], [e, n]] = W.geometryBounds(byName('Russian Federation').geometry);
  assert.ok(e - w < 200 && n > s);
});
