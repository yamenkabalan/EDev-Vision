# RSynthesis AI — Estimate the future of life

The whole site is about the world's inland surface water. There is no single focus area any more.

- **02 Global water**: annual inland surface water for 266 countries and territories, 1984–2018, on a MapLibre globe; compare two countries and fit each one to the map with "See on map".
- **03 All-in-one radar**: one globe with seven live layers (NISAR radar, OPERA DSWx-S1 radar water, OPERA DSWx-HLS optical water, VIIRS floods, GPM IMERG rain, VIIRS photo, JRC Landsat years). 12 daily layers are stacked per NISAR cycle (`lib/gibs.ts`).
- **04 Compare**: any place at two years or two 12-day cycles, swipe divider (two synced MapLibre maps).
- **05 History / 06 Graphics / 07 Future / 08 What should be done**: world, continent, country or two countries; the place choice is shared by every section (`components/PlacePicker.tsx`).
- **RSynthesis world engine** (`lib/world.ts`): Bayesian model averaging over every combination of the chosen causes (rain, last year's rain, heat, El Niño, trend), with a Zellner g-prior and a Scott–Berger prior, a Student-t predictive and simulation to 2030. It runs in the browser on the reader's options.

Data files, all committed and rebuilt by scripts:

- `public/data/global-water.json`: EC JRC / UNEP SDG 6.6.1 country water (Yamen's file, `scripts/build-global-water.py`)
- `public/data/world.json`: ERA5 rain and heat per country (Our World in Data), NOAA ONI, UNEP SDG 6.6.1 2000–2022 and continents (`python scripts/build-world-data.py`)
- `public/data/engine-summary.json`: the engine tested on every country (`node --experimental-strip-types scripts/engine-summary.mts`)
- `../../assistant-proxy/api/world-context.json`: what the AI assistant may say (`node --experimental-strip-types scripts/assistant-context.mts`)

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

## Global water explorer

`components/GlobalExplorer.tsx` (section, country readouts, chart, sources) and `components/UnifiedGlobeMap.tsx` (one MapLibre canvas from globe to street level) were ported from Yamen's global water feature. Styles are in `app/global-explorer.css`, scoped to `.global-*`.

- **Country statistics** — `public/data/global-water.json`: UNEP SDG 6.6.1 / EC JRC permanent + seasonal surface water area in km², aggregated by GAUL 0, 1984–2018, 266 countries and territories. Regenerate with `scripts/build-global-water.py`.
- **Annual water map** — `lib/annualWater.ts` requests the EC JRC / Google Yearly History ImageServer with a one-year time window, so the selected year redraws the raster. Blue = permanent water, green = seasonal **open** water; non-water and unobserved pixels are transparent. The service covers 1984–2021; the UI stops at 2018 to match the country statistics. The raster and the country totals come from different JRC releases and can differ.
- **Borders and labels** — Natural Earth country outlines (click hit-testing, `lib/countryGeometry.ts`; area percentages are approximate) and landform labels (`public/data/physical-labels.json`); Esri place labels, whose district coverage is incomplete.
- **Globe tiles** — 85 low-zoom Earth tiles in `public/data/earth-overview/`.

The map does not repeat the Okavango views: it outlines the study area, can fly there, and links to the radar and history sections. Surface water area is not water level, depth, flood risk, drinking water or a real-time measurement. NISAR data is shown for the Okavango footprint only, never globally. The country numbers are not an input to the RSynthesis projection. Delta AI answers from the Okavango data only.

## Assets and attribution

The local `public/assets/earth.jpg` is the 2048px Earth atmosphere texture from the three.js example repository:
https://github.com/mrdoob/three.js/blob/dev/examples/textures/planets/earth_atmos_2048.jpg

It is decorative and is not a NISAR raster. Attribution is visible in the hero and footer. The attempted NASA-hosted image was unavailable, so it was not used or credited as a NASA download. Earth graphics are isolated by an error boundary and have a CSS texture fallback.

Basemaps: OpenStreetMap (Okavango maps and the Streets option) and Esri (water map, imagery, place labels), with attribution in the maps. Global water: EC JRC / Google, UNEP SDG 6.6.1, Natural Earth. Scientific data: NASA / JPL-Caltech and ISRO, via ASF DAAC; processing: EDev data team. Source links are visible in the application.

The site needs a connection for the published JSON, radar PNGs, and basemap tiles. Exported app code and decorative texture are local to the build.

