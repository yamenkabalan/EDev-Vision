import * as maplibregl from 'maplibre-gl';

const cache = new Map<string, ArrayBuffer>();
let registered = false;
export const cycleTiles = (days: string[]) => `ncycle://${days.join(',')}/{z}/{y}/{x}`;

/** A single newest-on-top mosaic, retaining all uncovered pixels from the cycle. */
export function registerNisarTiles() {
  if (registered) return;
  registered = true;
  maplibregl.addProtocol('ncycle', async (params, abort) => {
    const saved = cache.get(params.url);
    if (saved) {
      cache.delete(params.url); cache.set(params.url, saved);
      return { data: saved.slice(0) };
    }
    const parts = params.url.slice('ncycle://'.length).split('/');
    const days = parts[0].split(',').filter(Boolean).reverse();
    const path = parts.slice(1).join('/');
    const canvas = new OffscreenCanvas(256, 256);
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.globalCompositeOperation = 'destination-over';
    let complete = false;
    for (let i = 0; i < days.length && !complete; i += 3) {
      const blobs = await Promise.all(days.slice(i, i + 3).map(async day => {
        const url = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/NISAR_L2_Geocoded_Polarimetric_Covariance/default/${day}/GoogleMapsCompatible_Level13/${path}.png`;
        const response = await fetch(url, { signal: AbortSignal.any([abort.signal, AbortSignal.timeout(15000)]) });
        if (!response.ok) throw new Error(`NISAR tile unavailable (${response.status})`);
        return response.blob();
      }));
      for (const blob of blobs) {
        abort.signal.throwIfAborted();
        const bitmap = await createImageBitmap(blob);
        ctx.drawImage(bitmap, 0, 0, 256, 256);
        bitmap.close();
        const pixels = ctx.getImageData(0, 0, 256, 256).data;
        complete = true;
        for (let a = 3; a < pixels.length; a += 4) {
          if (pixels[a] !== 255) { complete = false; break; }
        }
        // Older imagery cannot change an already fully opaque mosaic.
        if (complete) break;
      }
    }
    abort.signal.throwIfAborted();
    const buffer = await (await canvas.convertToBlob({ type: 'image/png' })).arrayBuffer();
    cache.set(params.url, buffer);
    if (cache.size > 96) cache.delete(cache.keys().next().value!);
    return { data: buffer.slice(0) };
  });
}
