/*
  The seven world views of section 03 (and the compare swipe in 04): NASA GIBS
  layers for any date of the NISAR era, plus the JRC Landsat yearly water map.
  Everything is drawn live from the providers; nothing here is processed by us
  except the colours (white "not water" and grey "cloud" become transparent so
  several days can be stacked into one picture of a 12-day NISAR cycle).
*/
import * as maplibregl from 'maplibre-gl';
import type { Map as MLMap, StyleSpecification } from 'maplibre-gl';
import { annualWaterTiles } from './annualWater';

export type ViewId = 'nisar' | 's1water' | 'hlswater' | 'flood' | 'rain' | 'photo' | 'landsat';
type Recolour = 'hls' | 's1' | 'flood' | 'none';
export type ViewDef = {
  id: ViewId; label: string; what: string; best: string; more: string[]; tech: string[];
  kind: 'date' | 'year'; layer?: string; ext?: 'png' | 'jpg'; level?: number; window?: number; recolour?: Recolour;
  first?: string; last?: string; gaps?: [string, string][]; legend: { label: string; color: string }[]; source: string; sourceUrl: string;
};

export const VIEWS: ViewDef[] = [
  {
    id: 'nisar', label: 'NISAR radar', kind: 'date', layer: 'NISAR_L2_Geocoded_Polarimetric_Covariance', ext: 'png', level: 13, window: 12, recolour: 'none', first: '2025-10-29', last: '2026-11-13',
    gaps: [['2026-03-02', '2026-03-03'], ['2026-03-30', '2026-03-31'], ['2026-04-13', '2026-04-13'], ['2026-07-28', '2026-08-09']],
    what: 'NASA–ISRO NISAR L-band radar: one full 12-day orbit cycle stacked into one picture of the Earth',
    best: 'Best for seeing what radar sees through clouds, day or night',
    more: ['Each strip is one orbit pass. Twelve days of passes cover nearly all land.', 'NISAR launched in 2025 and its public coverage is still growing: for many regions (including Türkiye) the first full passes arrive from mid-2026, so earlier dates can look empty. Use Radar water for a complete record.', 'Dark tones are smooth surfaces such as calm open water; bright tones are rough ground, forest and flooded vegetation.'],
    tech: ['NISAR L2 GCOV browse imagery (HH/HV colour rendering by NASA), via NASA GIBS.', 'Up to 12 daily layers drawn on top of each other, newest on top.'],
    legend: [{ label: 'Smooth / open water (dark)', color: '#16324a' }, { label: 'Vegetation, rough ground (bright)', color: '#a7c94a' }],
    source: 'NASA–ISRO NISAR · NASA GIBS', sourceUrl: 'https://nisar.jpl.nasa.gov/',
  },
  {
    id: 's1water', label: 'Radar water', kind: 'date', layer: 'OPERA_L3_Dynamic_Surface_Water_Extent-Sentinel-1', ext: 'png', level: 12, window: 12, recolour: 's1', first: '2024-08-21', last: '2026-11-15',
    what: 'NASA OPERA water map from Sentinel-1 radar: open water in blue and water hidden under vegetation in green',
    best: 'Best for finding water under plants and clouds',
    more: ['Radar sees open water as dark and flooded vegetation as very bright (double bounce).', 'Blank areas were not imaged in this 12-day window or are masked (steep terrain, radar shadow). Sea inside a radar strip is also drawn as open water.'],
    tech: ['NASA OPERA L3 DSWx-S1, 30 m, via NASA GIBS.', 'White "not water" and masked classes made transparent so 12 days stack.'],
    legend: [{ label: 'Open water', color: '#3d8ff0' }, { label: 'Inundated vegetation', color: '#7ccf4a' }],
    source: 'NASA OPERA DSWx-S1 · NASA GIBS', sourceUrl: 'https://www.jpl.nasa.gov/go/opera/products/dswx-product-suite/',
  },
  {
    id: 'hlswater', label: 'Optical water', kind: 'date', layer: 'OPERA_L3_Dynamic_Surface_Water_Extent-HLS', ext: 'png', level: 12, window: 12, recolour: 'hls', first: '2023-01-01', last: '2026-11-05',
    what: 'NASA OPERA water map from Landsat and Sentinel-2 optical images, wherever a clear look exists',
    best: 'Best for comparing with the radar water map',
    more: ['Optical satellites cannot see through clouds or under plants, so this map misses water radar finds.', 'Partial water (light blue) is a pixel only partly covered by water.'],
    tech: ['NASA OPERA L3 DSWx-HLS, 30 m, via NASA GIBS.', 'Not-water, cloud and snow classes made transparent; up to 12 days stacked.'],
    legend: [{ label: 'Open water', color: '#3d8ff0' }, { label: 'Partial surface water', color: '#9cc8f2' }],
    source: 'NASA OPERA DSWx-HLS · NASA GIBS', sourceUrl: 'https://www.jpl.nasa.gov/go/opera/products/dswx-product-suite/',
  },
  {
    id: 'flood', label: 'Floods now', kind: 'date', layer: 'VIIRS_Combined_Flood_3-Day', ext: 'png', level: 9, window: 1, recolour: 'flood', first: '2025-06-24', last: '2026-11-14',
    what: 'NASA’s near-real-time flood map: water outside its usual extent in red, recurring floods in yellow',
    best: 'Best for spotting floods that are happening on that date',
    more: ['Built from three days of VIIRS images, so short cloud gaps are filled.', 'Normal water is drawn faintly so the floods stand out.'],
    tech: ['NASA LANCE VIIRS Combined Flood, 3-day composite, ~375 m, via NASA GIBS.', '"Insufficient data" made transparent.'],
    legend: [{ label: 'Flood', color: '#fa1e24' }, { label: 'Recurring flood', color: '#ffe600' }, { label: 'Normal surface water', color: '#2c7fae' }],
    source: 'NASA LANCE VIIRS flood · NASA GIBS', sourceUrl: 'https://www.earthdata.nasa.gov/data/instruments/viirs/near-real-time-data/nrt-global-flood-products',
  },
  {
    id: 'rain', label: 'Rain', kind: 'date', layer: 'IMERG_Precipitation_Rate', ext: 'png', level: 6, window: 1, recolour: 'none', first: '2000-06-01', last: '2026-11-13', gaps: [['2025-10-23', '2025-10-29']],
    what: 'NASA GPM IMERG rain rate for that day: the cause behind most changes in surface water',
    best: 'Best for seeing where the water comes from',
    more: ['Rain today becomes river water, lakes and floods days to months later.', 'Green is light rain, red and purple heavy rain.'],
    tech: ['NASA GPM IMERG precipitation rate (mm/h), daily, ~10 km, via NASA GIBS.'],
    legend: [{ label: 'Light rain', color: '#00a503' }, { label: 'Moderate', color: '#ff8814' }, { label: 'Heavy', color: '#fa0000' }],
    source: 'NASA GPM IMERG · NASA GIBS', sourceUrl: 'https://gpm.nasa.gov/data/imerg',
  },
  {
    id: 'photo', label: 'Satellite photo', kind: 'date', layer: 'VIIRS_NOAA20_CorrectedReflectance_TrueColor', ext: 'jpg', level: 9, window: 1, recolour: 'none', first: '2018-01-05', last: '2026-11-14',
    what: 'A normal daily photo of the whole Earth (VIIRS). Clouds hide the ground, which is why radar matters',
    best: 'Best for a quick real-world look',
    more: ['One picture per day, stitched from the satellite’s passes.', 'Context only, not a water measurement.'],
    tech: ['NOAA-20 VIIRS corrected reflectance, true colour, ~250 m, via NASA GIBS.'],
    legend: [],
    source: 'NOAA-20 VIIRS · NASA GIBS', sourceUrl: 'https://worldview.earthdata.nasa.gov/',
  },
  {
    id: 'landsat', label: 'Landsat history', kind: 'year', recolour: 'none',
    what: 'Yearly water maps from Landsat, 1984–2021: permanent water in blue, seasonal water in green',
    best: 'Best for comparing with past decades',
    more: ['Each year is classified on its own, so you can watch lakes shrink and reservoirs fill.', 'Optical only: water under vegetation and areas never seen clearly are missing.'],
    tech: ['EC JRC / Google Global Surface Water, Yearly History, 30 m.', 'Classes 2 (seasonal) and 3 (permanent); others transparent.'],
    legend: [{ label: 'Permanent water', color: '#2171b5' }, { label: 'Seasonal water', color: '#31a354' }],
    source: 'EC JRC / Google Global Surface Water', sourceUrl: 'https://global-surface-water.appspot.com/',
  },
];
export const VIEW = Object.fromEntries(VIEWS.map(v => [v.id, v])) as Record<ViewId, ViewDef>;

const DAY = 864e5;
export const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
export const LANDSAT_YEARS = Array.from({ length: 2021 - 1984 + 1 }, (_, i) => 1984 + i);

/** True when a day falls inside one of the view's known no-data gaps. */
const inGap = (view: ViewDef, day: string) => !!view.gaps?.some(([a, b]) => day >= a && day <= b);

/**
 * The timeline each date view offers, oldest first and covering the view's
 * whole life — not one shared Nov-2025→Nov-2026 strip. NISAR keeps its real
 * 12-day orbit cadence; every other layer gets one step a month (thinned so a
 * long record such as rain, 2000→now, stays a short, scrollable strip).
 */
export function stepsFor(view: ViewDef): string[] {
  const first = Date.parse(view.first!), last = Date.parse(view.last!);
  if (view.id === 'nisar') {
    const out: string[] = [];
    for (let t = last; t >= first; t -= 12 * DAY) out.unshift(iso(t));
    return out;
  }
  const fy = new Date(first).getUTCFullYear(), fm = new Date(first).getUTCMonth();
  const months = (new Date(last).getUTCFullYear() - fy) * 12 + (new Date(last).getUTCMonth() - fm);
  const stride = Math.max(1, Math.ceil((months + 1) / 72));
  const out: string[] = [];
  for (let m = months; m >= 0; m -= stride) out.unshift(iso(Math.min(last, Math.max(first, Date.UTC(fy, fm + m, 15)))));
  if (out.at(-1) !== iso(last)) out.push(iso(last));
  return out.filter((d, i, a) => a.indexOf(d) === i);
}

/** The days drawn for a view at a step date, oldest first. */
export function daysFor(view: ViewDef, date: string): string[] {
  const n = view.window || 1, end = Date.parse(date) > Date.parse(view.last!) ? view.last! : date;
  return Array.from({ length: n }, (_, i) => iso(Date.parse(end) - (n - 1 - i) * DAY))
    .filter(d => d >= view.first! && d <= view.last! && !inGap(view, d));
}

export function tileURL(view: ViewDef, day: string) {
  const url = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${view.layer}/default/${day}/GoogleMapsCompatible_Level${view.level}/{z}/{y}/{x}.${view.ext}`;
  return view.recolour && view.recolour !== 'none' ? `wtile://${view.recolour}/${url}` : url;
}

/* ---------------------------------------------------------- recolouring */
let registered = false;
const blank = (() => { let cached: Promise<ArrayBuffer> | null = null; return () => { if (!cached) { const c = new OffscreenCanvas(256, 256); c.getContext('2d')!.clearRect(0, 0, 256, 256); cached = c.convertToBlob({ type: 'image/png' }).then(x => x.arrayBuffer()); } return cached; }; })();
function recolour(mode: Recolour, p: Uint8ClampedArray) {
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i], g = p[i + 1], b = p[i + 2], a = p[i + 3];
    if (!a) continue;
    let out: [number, number, number, number] | null = null;
    const grey = Math.abs(r - g) < 22 && Math.abs(g - b) < 22;
    if (mode === 'flood') {
      if (r > 200 && g < 90) out = [250, 30, 36, 255];
      else if (r > 200 && g > 200 && b < 90) out = [255, 230, 0, 255];
      else if (b > 180 && g > 150 && r < 120) out = [44, 127, 174, 150];
    } else if (!grey) {
      if (b > 150 && r < 120 && g < 150) out = [61, 143, 240, 255];
      else if (mode === 's1' && g > 150 && r < 120 && b < 120) out = [124, 207, 74, 255];
      else if (mode === 'hls' && b > 200 && g > 180 && r > 140 && r < 215) out = [156, 200, 242, 200];
    }
    if (out) { p[i] = out[0]; p[i + 1] = out[1]; p[i + 2] = out[2]; p[i + 3] = out[3]; } else p[i + 3] = 0;
  }
}
export function registerRecolour() {
  if (registered) return; registered = true;
  maplibregl.addProtocol('wtile', async (params, abort) => {
    const m = params.url.match(/^wtile:\/\/(\w+)\/(.*)$/);
    if (!m) throw new Error('Bad tile URL');
    const response = await fetch(m[2], { signal: abort.signal });
    if (!response.ok) return { data: await blank() };
    const bitmap = await createImageBitmap(await response.blob());
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height), ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(bitmap, 0, 0);
    const data = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    recolour(m[1] as Recolour, data.data);
    ctx.putImageData(data, 0, 0);
    return { data: await (await canvas.convertToBlob({ type: 'image/png' })).arrayBuffer() };
  });
}

/* ---------------------------------------------------------- base map */
const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const MAX_STACK = 12;
const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

export function baseStyle(): StyleSpecification {
  const stack = Array.from({ length: MAX_STACK }, (_, i) => i);
  return {
    version: 8,
    glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
    projection: { type: 'globe' },
    sky: { 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 4, 1, 7, 0] },
    sources: {
      'earth-overview': { type: 'raster', tiles: [`${base}/data/earth-overview/{z}/{x}/{y}.webp`], tileSize: 256, maxzoom: 3 },
      dark: { type: 'raster', tiles: ['https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 16, attribution: 'Basemap © Esri, HERE, Garmin, OSM contributors' },
      places: { type: 'raster', tiles: ['https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, minzoom: 2, maxzoom: 19 },
      landsat: { type: 'raster', tiles: [annualWaterTiles(2021)], tileSize: 256, maxzoom: 14 },
      ...Object.fromEntries(stack.map(i => [`v${i}`, { type: 'raster', tiles: [`${base}/data/earth-overview/0/0/0.webp`], tileSize: 256, maxzoom: 9 }])),
      selected: { type: 'geojson', data: empty },
    },
    layers: [
      { id: 'space', type: 'background', paint: { 'background-color': '#06151f' } },
      { id: 'dark', type: 'raster', source: 'dark', paint: { 'raster-brightness-max': .32, 'raster-saturation': -1, 'raster-fade-duration': 100 } },
      { id: 'earth-overview', type: 'raster', source: 'earth-overview', maxzoom: 4.5, paint: { 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 0, .55, 3.5, .55, 4.5, 0], 'raster-fade-duration': 0 } },
      { id: 'landsat', type: 'raster', source: 'landsat', layout: { visibility: 'none' }, paint: { 'raster-resampling': 'nearest', 'raster-fade-duration': 0 } },
      ...stack.map(i => ({ id: `v${i}`, type: 'raster' as const, source: `v${i}`, layout: { visibility: 'none' as const }, paint: { 'raster-fade-duration': 0 } })),
      { id: 'places', type: 'raster', source: 'places', minzoom: 2, paint: { 'raster-opacity': .85, 'raster-fade-duration': 100 } },
      { id: 'selected-line', type: 'line', source: 'selected', paint: { 'line-color': '#f6c676', 'line-width': 2 } },
    ],
  };
}

/** Show one view at one date (or year) on a map made with baseStyle(). */
export function showView(map: MLMap, view: ViewDef, when: string | number, opacity: number) {
  if (view.kind === 'year') {
    (map.getSource('landsat') as maplibregl.RasterTileSource).setTiles([annualWaterTiles(Number(when))]);
    map.setLayoutProperty('landsat', 'visibility', 'visible');
    map.setPaintProperty('landsat', 'raster-opacity', opacity);
    for (let i = 0; i < MAX_STACK; i++) map.setLayoutProperty(`v${i}`, 'visibility', 'none');
    return;
  }
  map.setLayoutProperty('landsat', 'visibility', 'none');
  ensureStack(map, view.level!);
  const days = daysFor(view, String(when));
  for (let i = 0; i < MAX_STACK; i++) {
    const day = days[i], id = `v${i}`;
    if (!day) { map.setLayoutProperty(id, 'visibility', 'none'); continue; }
    (map.getSource(id) as maplibregl.RasterTileSource).setTiles([tileURL(view, day)]);
    map.setLayoutProperty(id, 'visibility', 'visible');
    map.setPaintProperty(id, 'raster-opacity', opacity);
  }
}

/** A source's maxzoom is fixed when it is created, so the stack is rebuilt when a view with another tile level is chosen. */
function ensureStack(map: MLMap, maxzoom: number) {
  const current = (map.getSource('v0') as unknown as { maxzoom?: number } | undefined)?.maxzoom;
  if (current === maxzoom) return;
  for (let i = 0; i < MAX_STACK; i++) {
    const id = `v${i}`;
    if (map.getLayer(id)) map.removeLayer(id);
    if (map.getSource(id)) map.removeSource(id);
    map.addSource(id, { type: 'raster', tiles: [`${base}/data/earth-overview/0/0/0.webp`], tileSize: 256, maxzoom });
    map.addLayer({ id, type: 'raster', source: id, layout: { visibility: 'none' }, paint: { 'raster-fade-duration': 0 } }, 'places');
  }
}

export function setSelected(map: MLMap, geometry: GeoJSON.Geometry | null) {
  (map.getSource('selected') as maplibregl.GeoJSONSource | undefined)?.setData(geometry ? { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry }] } : empty);
}

export function createWorldMap(container: HTMLElement, opts: { center?: [number, number]; zoom?: number } = {}): MLMap | null {
  if (!document.createElement('canvas').getContext('webgl2')) return null;
  registerRecolour();
  maplibregl.setWorkerUrl(new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).toString());
  return new maplibregl.Map({
    container, style: baseStyle(), center: opts.center ?? [15, 10], zoom: opts.zoom ?? 1.4, minZoom: .6, maxZoom: 14,
    dragRotate: false, touchPitch: false, attributionControl: false, fadeDuration: 100, maxTileCacheSize: 120,
    canvasContextAttributes: { powerPreference: 'high-performance' },
  });
}
