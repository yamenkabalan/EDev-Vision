# EDev Vision — Okavango Flood Pulse

New, isolated Next.js App Router implementation. The original HTML frontend in the parent directory is preserved. The source brief is saved as `BUILD_BRIEF.md`.

## Local preview

```powershell
cd C:\Users\yamen\Desktop\Nasa\EDev-Vision\observatory
npm run dev
```

Open http://127.0.0.1:3100. Requires Node.js 20.9 or newer. No API credentials or backend server are needed. React, TypeScript, Tailwind CSS, Framer Motion, Three.js / React Three Fiber / Drei, and Leaflet are used. The reference project was inspected without modification.

Dependencies are already installed in this workspace. On a fresh checkout, run `npm ci` once before starting. This downloads packages; it is unnecessary for the current local copy.

## Checks

```powershell
npm run typecheck
npm test
npm run build
```

Browser integration check (with the preview running): `node scripts/browser-check.mjs`. It uses the locally installed Chrome; no separate browser download is needed. The script verifies the current published series, intentionally blocks public basemap tile requests during automated pan/zoom, and writes screenshots and results to ignored `qa/`. Real OpenStreetMap tiles were checked separately in a stationary visual preview.

Verified on 14 November 2026: TypeScript, production static export, three data-adapter tests, live JSON and raster loading, textured WebGL globe, synchronized date/stat/quality changes, rapid-selection race protection, chart gaps, geographic swipe alignment during pan/zoom/resize, 390px mobile layout, reduced motion, feed retry, and missing/zero/raster-failure handling. These are frontend checks, not validation of classification accuracy against ground measurements.

## Static deployment

For GitHub Pages at `https://yamenkabalan.github.io/EDev-Vision/`:

```powershell
$env:NEXT_PUBLIC_BASE_PATH='/EDev-Vision'
npm run build
Remove-Item Env:NEXT_PUBLIC_BASE_PATH
```

Publish the contents of `observatory/out` using GitHub Pages Actions. The original repo's `main / root` HTML is not changed by this build. For Vercel, select `observatory` as the project root and use an empty base path. Never publish `node_modules`. This implementation is local-only until the team chooses to deploy it.

The `/EDev-Vision/` export was also served under that exact prefix and checked in Chrome: JavaScript, CSS, the Earth texture, and the live data feed loaded successfully. A normal local build without that prefix is left in `out`.

## Scientific data

Live client-side fetches from https://asadgnc.github.io/edev-data/data. No fallback or invented measurements. The typed adapter distinguishes missing measurements, valid zero, invalid payloads, and failed requests. Raster requests are lazy; raw HH is loaded only when selected. Maps load each acquisition's bounds. Two-date comparison clips both layers in viewport coordinates on a single Leaflet map, so transparent pixels cannot leak from the other date.

The chart uses actual date spacing and breaks lines at metadata gaps and missing values. Playback visits available acquisitions only. Maxima and differences are computed from the current JSON.

On 14 November 2026, the feed differed from the brief: the data team had added a multitemporal speckle filter. Highest observed open water was **772.5 km² on 8 July**; highest observed flooded vegetation was **311.6 km² on 6 September**. The old unfiltered values 1181.2 / 349.8 are not hardcoded. Frequency B metadata was corrected to native 80 m and processing block factor 1. The UI uses current feed values and notes that classification is filtered while HH is unfiltered.

The feed now includes Digital Earth Africa WOfS annual Landsat open-water history through 2025. The right-hand gauge compares a selected reliable year with the mean of reliable years from 2013–2025 in km². It does not label that mean as ecological health, water depth, or equivalent to the 2026 NISAR class. The former large chart is available in a disclosure beneath the acquisition timeline. Regional measurements are still unavailable; no regional values or forecasts are fabricated.

The historical view now loads the published JRC Global Surface Water v1.5 occurrence image (`jrc/occurrence.webp`) with its geographic bounds and source statistics. It represents 1984–2024 optical open-water frequency, separate from the 2026 NISAR classes. The opening Earth uses a fixed camera distance after its entrance, so its displayed size does not drift during page load.

## Assets and attribution

The local `public/assets/earth.jpg` is the 2048px Earth atmosphere texture from the three.js example repository:
https://github.com/mrdoob/three.js/blob/dev/examples/textures/planets/earth_atmos_2048.jpg

It is decorative and is not a NISAR raster. Attribution is visible in the hero and footer. The attempted NASA-hosted image was unavailable, so it was not used or credited as a NASA download. Earth graphics are isolated by an error boundary and have a CSS texture fallback.

Basemap: OpenStreetMap, with attribution in the map. Scientific data: NASA / JPL-Caltech and ISRO, via ASF DAAC; processing: EDev data team. Source links are visible in the application.

The site needs a connection for the published JSON, radar PNGs, and basemap tiles. Exported app code and decorative texture are local to the build.

