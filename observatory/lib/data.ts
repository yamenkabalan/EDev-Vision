export const DATA_URL = 'https://asadgnc.github.io/edev-data/data';
export type Gap = [string, string];
export type Observation = { date: string; open_water_km2: number | null; flooded_veg_km2: number | null; flooded_km2: number | null; valid_km2: number | null; quality: string | null; granule: string | null };
export type Metric = 'open_water_km2' | 'flooded_veg_km2';
export type LegendItem = { class: string; label: string; color: number[] };
export type Meta = { dates: string[]; gaps: Gap[]; mission: string; product: string; geometry: { track: string; frame: string; pass: string }; pixel_m: number | null; native_pixel_m: number | null; looks: number | null; frequency: string | null; db_stretch: [number, number] | null; legend: LegendItem[]; uncertain: boolean; band_note: string; despeckle: { applied: boolean; method: string; note: string } | null };
export type Feed = { meta: Meta; observations: Observation[]; fetchedAt: string };
export type Bounds = { bounds: [[number, number], [number, number]]; width: number; height: number; date: string; granule: string | null };
const object = (x: unknown): Record<string, unknown> => { if (!x || typeof x !== 'object' || Array.isArray(x)) throw new Error('Unexpected data format.'); return x as Record<string, unknown>; };
const string = (x: unknown, fallback = '') => typeof x === 'string' ? x : fallback;
export const measurement = (x: unknown): number | null => typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : null;
export const validDate = (x: unknown): x is string => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && Number.isFinite(Date.parse(x)) && new Date(x).toISOString().slice(0, 10) === x;
export const stamp = (date: string) => Date.parse(`${date}T12:00:00Z`);
export function parseMeta(raw: unknown): Meta {
  const m = object(raw);
  if (!Array.isArray(m.dates) || !m.dates.every(validDate)) throw new Error('The published acquisition list is invalid.');
  const geometry = m.geometry ? object(m.geometry) : {};
  const despeckle = m.despeckle ? object(m.despeckle) : null;
  const gaps: Gap[] = Array.isArray(m.gaps) ? m.gaps.filter((g): g is Gap => Array.isArray(g) && g.length === 2 && g.every(validDate) && g[0] <= g[1]) : [];
  const legend: LegendItem[] = Array.isArray(m.legend) ? m.legend.flatMap(v => {
    const l = object(v); return Array.isArray(l.color) && l.color.length >= 3 && l.color.every(n => typeof n === 'number' && n >= 0 && n <= 255) ? [{ class: string(l.class), label: string(l.label), color: l.color as number[] }] : [];
  }) : [];
  return { dates: [...new Set(m.dates)].sort(), gaps, mission: string(m.mission, 'NISAR'), product: string(m.product, 'Product unspecified'), geometry: { track: string(geometry.track, '—'), frame: string(geometry.frame, '—'), pass: string(geometry.pass, 'Unspecified') }, pixel_m: measurement(m.pixel_m), native_pixel_m: measurement(m.native_pixel_m), looks: measurement(m.looks), frequency: string(m.frequency) || null, db_stretch: Array.isArray(m.db_stretch) && m.db_stretch.length === 2 && m.db_stretch.every(n => typeof n === 'number' && Number.isFinite(n)) && m.db_stretch[0] < m.db_stretch[1] ? m.db_stretch as [number, number] : null, legend, uncertain: m.uncertain === true, band_note: string(m.band_note), despeckle: despeckle ? { applied: despeckle.applied === true, method: string(despeckle.method), note: string(despeckle.note) } : null };
}
export function parseSeries(raw: unknown, dates: string[]): Observation[] {
  if (!Array.isArray(raw)) throw new Error('The published time series is invalid.');
  const rows = new Map<string, Record<string, unknown>>();
  for (const value of raw) { const row = object(value); if (!validDate(row.date)) throw new Error('An observation has an invalid date.'); if (rows.has(row.date)) throw new Error('Duplicate observation dates in the feed.'); rows.set(row.date, row); }
  return dates.map(date => { const r = rows.get(date) || {}; return { date, open_water_km2: measurement(r.open_water_km2), flooded_veg_km2: measurement(r.flooded_veg_km2), flooded_km2: measurement(r.flooded_km2), valid_km2: measurement(r.valid_km2), quality: string(r.quality) || null, granule: string(r.granule) || null }; });
}
export function parseBounds(raw: unknown, expectedDate: string): Bounds {
  const b = object(raw); const v = b.bounds;
  if (!Array.isArray(v) || v.length !== 2 || !v.every(pair => Array.isArray(pair) && pair.length === 2 && pair.every(n => typeof n === 'number' && Number.isFinite(n)))) throw new Error('Invalid geographic bounds.');
  const [[s, w], [n, e]] = v as [[number, number], [number, number]];
  if (s >= n || w >= e || s < -90 || n > 90 || w < -180 || e > 180 || b.date !== expectedDate || typeof b.width !== 'number' || typeof b.height !== 'number' || b.width <= 0 || b.height <= 0) throw new Error('The overlay footprint is inconsistent.');
  return { bounds: [[s, w], [n, e]], width: b.width, height: b.height, date: expectedDate, granule: string(b.granule) || null };
}
export async function getJSON(url: string, signal?: AbortSignal): Promise<unknown> {
  const timeout = AbortSignal.timeout(20000);
  const response = await fetch(url, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout, cache: 'no-cache' });
  if (!response.ok) throw new Error(`Data request failed (${response.status}).`);
  return response.json();
}
export async function loadFeed(signal?: AbortSignal): Promise<Feed> {
  const [m, s] = await Promise.all([getJSON(`${DATA_URL}/meta.json`, signal), getJSON(`${DATA_URL}/timeseries.json`, signal)]);
  const meta = parseMeta(m);
  return { meta, observations: parseSeries(s, meta.dates), fetchedAt: new Date().toISOString() };
}
const boundsCache = new Map<string, Promise<Bounds>>();
export async function loadBounds(date: string, signal?: AbortSignal) { if (!validDate(date)) throw new Error('Invalid acquisition date.'); const cached=boundsCache.get(date); if(cached)return cached; const request=getJSON(`${DATA_URL}/${date}/bounds.json`, signal).then(raw=>parseBounds(raw,date)); if(!signal){boundsCache.set(date,request);request.catch(()=>boundsCache.delete(date));} return request; }
export async function loadHistoryBounds(year: string, signal?: AbortSignal) { if(!/^\d{4}$/.test(year))throw new Error('Invalid historical year.'); const raw=object(await getJSON(`${DATA_URL}/history/bounds.json`,signal)); return parseBounds({...raw,date:year},year); }
export const inGap = (date: string, gaps: Gap[]) => gaps.some(([a,b]) => date >= a && date <= b);
export function segments(rows: Observation[], key: Metric, gaps: Gap[]): Observation[][] {
  const result: Observation[][] = []; let part: Observation[] = [];
  for (const r of rows) {
    if (r[key] === null || inGap(r.date, gaps)) { if (part.length) result.push(part); part = []; continue; }
    const prior = part.at(-1);
    if (prior && gaps.some(([a,b]) => prior.date < b && r.date > a)) { result.push(part); part = []; }
    part.push(r);
  }
  if (part.length) result.push(part); return result;
}
export function highest(rows: Observation[], key: Metric, gaps: Gap[] = []): Observation | null {
  return rows.filter(r => r[key] !== null && !inGap(r.date, gaps)).reduce<Observation | null>((best,r) => !best || r[key]! > best[key]! ? r : best, null);
}
export const change = (before: number | null, after: number | null) => before === null || after === null ? null : after - before;
export const formatArea = (v: number | null | undefined) => v == null ? 'Unavailable' : new Intl.NumberFormat('en', { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(v);
export const formatDate = (s: string, year = false) => new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', ...(year ? {year: 'numeric'} : {}), timeZone: 'UTC' }).format(new Date(`${s}T12:00:00Z`));
