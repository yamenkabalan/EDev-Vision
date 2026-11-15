'use client';

/*
  One MapLibre canvas from globe to close-up: low-zoom Earth tiles, a dark
  "water map", satellite or street basemap, the JRC annual water raster for
  the selected year, place and landform labels, and the outlines of the
  selected countries. Ported from Yamen's global water explorer.

  "See on map" (compare mode) fits a whole country, borders included, to the canvas.
*/
import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map, StyleSpecification } from 'maplibre-gl';
import { contains, type Geometry } from '@/lib/countryGeometry';
import { annualWaterTiles, annualWaterService } from '@/lib/annualWater';

export type MapRegion = { id: number; name: string; area_km2: number | null; focus: [number, number] | null; geometry: Geometry | null };
type Props = { regions: MapRegion[]; primary: MapRegion; secondary: MapRegion | null; focusRegion: MapRegion | null; focusToken: number; fit?: { bounds: [[number, number], [number, number]]; token: number } | null; showWater: boolean; year: number; onPick: (id: number) => void };
type Basemap = 'water' | 'satellite' | 'streets';

const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
const satelliteURL = 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const streetsURL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const placesURL = 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
const physicalLabelsURL = `${base}/data/physical-labels.json`;
const earthOverviewURL = `${base}/data/earth-overview/{z}/{x}/{y}.webp`;
const emptyCollection: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };


const style: StyleSpecification = {
  version: 8,
  glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
  projection: { type: 'globe' },
  sky: { 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 4, 1, 7, 0] },
  sources: {
    'earth-overview': { type: 'raster', tiles: [earthOverviewURL], tileSize: 256, maxzoom: 3 },
    dark: { type: 'raster', tiles: ['https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 16 },
    annual: { type: 'raster', tiles: [annualWaterTiles(2018)], tileSize: 256, maxzoom: 14, attribution: 'Source: EC JRC/Google' },
    satellite: { type: 'raster', tiles: [satelliteURL], tileSize: 256, maxzoom: 19, attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics, GIS User Community' },
    streets: { type: 'raster', tiles: [streetsURL], tileSize: 256, maxzoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' },
    places: { type: 'raster', tiles: [placesURL], tileSize: 256, minzoom: 3, maxzoom: 19, attribution: '&copy; Esri, HERE, Garmin, OpenStreetMap contributors, GIS User Community' },
    primary: { type: 'geojson', data: emptyCollection },
    secondary: { type: 'geojson', data: emptyCollection },
    physical: { type: 'geojson', data: physicalLabelsURL },
  },
  layers: [
    { id: 'space', type: 'background', paint: { 'background-color': '#06151f' } },
    { id: 'earth-overview', type: 'raster', source: 'earth-overview', maxzoom: 4.5, paint: { 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 0, 1, 3.5, 1, 4.5, 0], 'raster-fade-duration': 0 } },
    { id: 'satellite', type: 'raster', source: 'satellite', paint: { 'raster-fade-duration': 120 } },
    { id: 'streets', type: 'raster', source: 'streets', layout: { visibility: 'none' }, paint: { 'raster-fade-duration': 120 } },
    { id: 'dark', type: 'raster', source: 'dark', paint: { 'raster-fade-duration': 120, 'raster-brightness-max': .3, 'raster-saturation': -1 } },
    { id: 'annual', type: 'raster', source: 'annual', paint: { 'raster-opacity': .95, 'raster-fade-duration': 0, 'raster-resampling': 'nearest' } },
    { id: 'places', type: 'raster', source: 'places', minzoom: 3, paint: { 'raster-opacity': .9, 'raster-fade-duration': 100 } },
    { id: 'physical', type: 'symbol', source: 'physical', minzoom: 4, layout: { 'text-field': ['get', 'name'], 'text-font': ['Open Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], 4, 10, 8, 13], 'text-max-width': 12, 'text-allow-overlap': false, 'symbol-sort-key': ['get', 'rank'] }, paint: { 'text-color': '#d9eac7', 'text-halo-color': '#102b2d', 'text-halo-width': 1.5, 'text-opacity': ['step', ['zoom'], 0, 4, ['case', ['<=', ['get', 'minZoom'], 4], 1, 0], 5, ['case', ['<=', ['get', 'minZoom'], 5], 1, 0], 6, ['case', ['<=', ['get', 'minZoom'], 6], 1, 0], 7, 1] } },
    { id: 'primary-border', type: 'line', source: 'primary', paint: { 'line-color': '#f6c676', 'line-width': 2, 'line-opacity': .95 } },
    { id: 'secondary-border', type: 'line', source: 'secondary', paint: { 'line-color': '#55d8f3', 'line-width': 2, 'line-opacity': .95 } },
  ],
};

function countryFeature(region: MapRegion | null): GeoJSON.FeatureCollection {
  if (!region?.geometry) return emptyCollection;
  return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { name: region.name }, geometry: region.geometry as GeoJSON.Geometry }] };
}

export default function UnifiedGlobeMap({ regions, primary, secondary, focusRegion, focusToken, fit, showWater, year, onPick }: Props) {
  const initialZoom = typeof window !== 'undefined' && window.matchMedia('(max-width: 600px)').matches ? 1.15 : 2;
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const regionsRef = useRef(regions);
  const onPickRef = useRef(onPick);
  regionsRef.current = regions;
  onPickRef.current = onPick;
  const [basemap, setBasemap] = useState<Basemap>('water');
  const [zoom, setZoom] = useState(initialZoom);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [annualStatus, setAnnualStatus] = useState('Loading annual water…');
  const [labels, setLabels] = useState(true);

  useEffect(() => {
    if (!host.current || !document.createElement('canvas').getContext('webgl2')) { setError(true); return; }
    maplibregl.setWorkerUrl(new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).toString());
    const m = new maplibregl.Map({
      container: host.current,
      style,
      center: [21, -6],
      zoom: initialZoom,
      minZoom: .6,
      maxZoom: 18,
      pitch: 0,
      bearing: 0,
      dragRotate: false,
      touchPitch: false,
      attributionControl: false,
      fadeDuration: 120,
      maxTileCacheSize: 80,
      canvasContextAttributes: { powerPreference: 'high-performance' },
    });
    map.current = m;
    m.on('style.load', () => setReady(true));
    m.on('sourcedata', e => { if (e.sourceId === 'annual' && e.isSourceLoaded) setAnnualStatus('Annual water loaded'); });
    m.on('error', e => { if ('sourceId' in e && e.sourceId === 'annual') setAnnualStatus('Annual water unavailable — retry by selecting a year'); });
    m.on('zoomend', () => setZoom(m.getZoom()));
    m.on('click', event => {
      const { lng, lat } = event.lngLat;
      const found = regionsRef.current.find(region => region.geometry && contains(region.geometry, lng, lat));
      if (found) onPickRef.current(found.id);
    });
    return () => { m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const apply = () => {
      (m.getSource('primary') as maplibregl.GeoJSONSource | undefined)?.setData(countryFeature(primary));
      (m.getSource('secondary') as maplibregl.GeoJSONSource | undefined)?.setData(countryFeature(secondary));
    };
    if (ready) apply(); else { m.once('style.load', apply); return () => { m.off('style.load', apply); }; }
  }, [primary, secondary, ready]);

  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    m.setLayoutProperty('dark', 'visibility', basemap === 'water' ? 'visible' : 'none');
    m.setLayoutProperty('satellite', 'visibility', basemap === 'satellite' ? 'visible' : 'none');
    m.setLayoutProperty('streets', 'visibility', basemap === 'streets' ? 'visible' : 'none');
  }, [basemap, ready]);

  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    m.setLayoutProperty('annual', 'visibility', showWater ? 'visible' : 'none');
  }, [showWater, ready]);

  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    m.setLayoutProperty('places', 'visibility', labels && basemap !== 'streets' ? 'visible' : 'none');
    m.setLayoutProperty('physical', 'visibility', labels ? 'visible' : 'none');
  }, [labels, basemap, ready]);

  useEffect(() => {
    const m = map.current;
    if (!m || !focusRegion?.focus) return;
    const [lon, lat] = focusRegion.focus;
    const current = m.getZoom();
    const target = current < 3.5 ? 3.5 : Math.min(current, 7.5);
    m.flyTo({ center: [lon, lat], zoom: target, duration: 900, essential: true });
  }, [focusRegion, focusToken]);

  // The year changes the actual raster, not only the numbers: the tile URL carries a one-year time window.
  useEffect(() => {
    if (!ready || !map.current) return;
    setAnnualStatus('Loading annual water…');
    const timer = window.setTimeout(() => (map.current?.getSource('annual') as maplibregl.RasterTileSource | undefined)?.setTiles([annualWaterTiles(year)]), 200);
    return () => window.clearTimeout(timer);
  }, [year, ready]);

  const zoomBy = (step: number) => map.current?.easeTo({ zoom: Math.max(.6, Math.min(18, map.current.getZoom() + step)), duration: 350, essential: true });
  useEffect(() => {
    const m = map.current;
    if (!m || !fit) return;
    const mobile = window.matchMedia('(max-width: 600px)').matches;
    m.fitBounds(fit.bounds, { padding: mobile ? { top: 120, right: 24, bottom: 70, left: 24 } : { top: 130, right: 60, bottom: 90, left: 60 }, maxZoom: 9, duration: 1100, essential: true });
  }, [fit]);

  return <div className="global-unified-map">
    <div ref={host} className="global-map-canvas" role="region" aria-label="Interactive globe and detailed map of annual surface water. Drag to rotate or pan, scroll or pinch to zoom, click a country to inspect its water history." />
    {!ready && <div className="global-map-loading" role="status">{error ? 'Map unavailable on this device.' : 'Preparing the Earth…'}</div>}
    <div className="global-map-topbar">
      <div className="global-map-basemap" role="group" aria-label="Basemap">
        <button type="button" aria-pressed={basemap === 'water'} onClick={() => setBasemap('water')}>Water map</button>
        <button type="button" aria-pressed={basemap === 'satellite'} onClick={() => setBasemap('satellite')}>Satellite</button>
        <button type="button" aria-pressed={basemap === 'streets'} onClick={() => setBasemap('streets')}>Streets</button>
      </div>
      <button type="button" className="global-map-label-toggle" aria-pressed={labels} onClick={() => setLabels(value => !value)}>{labels ? '◆ Labels on' : '◇ Labels off'}</button>
      <span>{zoom < 5 ? 'DRAG TO ROTATE · SCROLL TO ZOOM' : 'DRAG TO PAN · SCROLL TO ZOOM'} · CLICK A COUNTRY</span>
    </div>
    {showWater && <div className="global-annual-key"><strong>{year} · ANNUAL SURFACE WATER</strong><span><i style={{ background: '#2171b5' }} />Permanent water</span><span><i style={{ background: '#31a354' }} />Seasonal open water</span><small role="status">{annualStatus}</small><small>Unobserved areas are transparent.</small></div>}
    <div className="global-map-zoom" role="group" aria-label="Map zoom controls">
      <button type="button" aria-label="Zoom in" disabled={zoom >= 17.9} onClick={() => zoomBy(1)}>+</button>
      <button type="button" aria-label="Zoom out" disabled={zoom <= .7} onClick={() => zoomBy(-1)}>−</button>
    </div>
    <div className="global-map-scale">{zoom < 5 ? 'GLOBE' : 'DETAIL'} · ZOOM {zoom.toFixed(1)}/18 <span>ANNUAL WATER · 30 M SOURCE</span></div>
    <div className="global-map-credit">
      {basemap !== 'streets' ? <span>{basemap === 'water' ? 'Basemap © Esri, HERE, Garmin, OSM contributors' : 'Imagery © Esri, Maxar, Earthstar Geographics, GIS User Community'}</span> : <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>}
      {showWater && <a href={annualWaterService} target="_blank" rel="noreferrer">· Source: EC JRC/Google · {year}</a>}
      {labels && <><a href="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer" target="_blank" rel="noreferrer">· Places © Esri, HERE, Garmin, OSM</a><a href="https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-physical-labels/" target="_blank" rel="noreferrer">· Landforms © Natural Earth</a></>}
    </div>
  </div>;
}
