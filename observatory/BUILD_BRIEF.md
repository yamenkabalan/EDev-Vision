Build “EDev Vision — Okavango Flood Pulse”: a visually exceptional, cinematic Earth-observation website with a genuinely functional scientific data explorer.

The result must feel like a premium interactive research experience: immersive, sophisticated, and memorable enough to impress a NASA Space Apps jury immediately.

## Project and technology

Target project:
`C:\Users\yamen\Desktop\Nasa\EDev-Vision`

Technology reference:
`C:\Users\yamen\Desktop\temp\beykozkosu-web`

Inspect the reference project to understand its stack and conventions. Use Next.js App Router, React, TypeScript/TSX, Tailwind CSS, and Framer Motion. Do not modify the reference project.

Use Three.js with React Three Fiber and Drei for the globe and suitable 3D effects. Keep rendering efficient and provide a graceful fallback.

Inspect the existing target files, project notes, and data integration before changing anything. Preserve the real backend data contract. You may substantially rebuild the current frontend: its existing simple appearance is not the desired design.

All website content, controls, explanations, loading states, and errors must be in English.

## The central goal

The website must achieve BOTH:

1. Deliver an extraordinary first impression through art direction, 3D, typography, and choreography.
2. Demonstrate that our actual NISAR data pipeline works through a real interactive map, acquisition selection, statistics, chart, and two-date comparison.

The landing page introduces the experience; the working data explorer is the main proof.

Do not build a generic company website. No contact page, newsletter, pricing, testimonials, account registration, or unrelated filler.

## Visual direction

Create an immersive “orbital observatory meets living wetland” identity.

Use:
- Deep space and forest backgrounds.
- Rich emerald, teal, water blue, and restrained lime highlights.
- Large editorial typography with confident spacing.
- Carefully composed asymmetric layouts.
- Thin scientific annotations, coordinates, restrained grid lines, and subtle radar motifs.
- Depth, atmosphere, and selective translucent surfaces.
- Organic transitions from space into water and vegetation.

Avoid a generic template, repetitive card grids, excessive glassmorphism, neon overload, cartoon graphics, and a plain sphere with crude continent polygons.

Every major screen should look deliberately art-directed.

## Opening experience: precise animation sequence

On initial load:

1. Begin with a beautiful full-screen Earth scene. Show a realistic textured 3D globe with atmosphere, convincing lighting, and subtle stars. Earth rotates smoothly.
2. Bring the globe into its intended composition with a brief cinematic camera movement.
3. Reveal the navigation from TOP TO BOTTOM: the header descends into view, then its menu items appear in a controlled stagger.
4. Reveal the headline in a refined sequence, followed by its description and primary action.
5. Highlight southern Africa and the Okavango location with a tasteful marker and geographic annotation.

Suggested headline:
“Every flood has a pulse.”

Suggested supporting copy:
“Follow open water. Reveal inundation beneath vegetation. Explore the Okavango through NISAR radar.”

Primary CTA:
“Explore the flood pulse”

The experience must be immediately usable. Do not force visitors through a long intro or lock scrolling until an animation ends.

## Scroll choreography

As the visitor scrolls:
- The globe moves upward and gradually recedes.
- The composition transitions from orbital darkness into a wetland-inspired green and water environment.
- Reveal the next sections with staggered top-to-bottom movement and subtle depth.
- Introduce the observatory controls as the natural continuation of the story.
- Use sticky sections only where they improve understanding.

Make the movement feel connected, not like unrelated entrance animations pasted onto every element.

Use Framer Motion for interface choreography and scroll-linked transitions. Support reduced motion, keyboard access, touch devices, and a lightweight mobile presentation.

## Navigation and structure

Use a concise navigation:
- The Pulse
- Observatory
- Compare
- Science & Sources

Build one coherent experience with these sections:

### 1. Cinematic landing
The 3D Earth opening described above.

### 2. The scientific question
Explain visually:
“When does water appear in open channels, and when does an inundation signal emerge beneath vegetation?”

Distinguish open water from flooded vegetation using a compact, engaging visual explanation.

### 3. Working observatory
This is the core feature. Include:
- A real geographic map.
- Actual NISAR classification PNG overlays positioned using their geographic bounds.
- Acquisition date selector.
- Timeline reflecting actual acquisition dates.
- Open-water and flooded-vegetation measurements for the selected date.
- Classification legend.
- Overlay opacity control.
- Classification / raw HH toggle where the corresponding files exist.
- Acquisition quality label from metadata.
- Time-series chart with actual dates and real measurements.
- Clear loading, missing-data, and error states.
- Optional playback through available acquisitions with visible playback status.

Selecting a date must synchronize the map, statistics, quality label, and chart selection.

Keep the map large and usable. Do not bury it below excessive promotional content.

### 4. Two-date comparison
Implement a working before/after swipe comparison for the SAME geographic area.

Default to 8 July and 6 September 2026 if those acquisitions exist.

Provide independent date selectors and clearly visible date labels. Both overlays must remain geographically aligned, using each acquisition’s actual bounds. The divider must work correctly while panning, zooming, and resizing.

Display an unavailable state if either overlay cannot load. Never substitute a decorative image for a missing scientific layer.

### 5. Data insights
Generate concise, understandable insights from the actual loaded JSON.

Examples:
- Highest observed open-water value.
- Highest observed flooded-vegetation value.
- Change between two selected acquisitions, when both measurements exist.

Describe maxima as “highest among available observations,” never as the definitive annual peak.

Use carefully designed insight panels, not a fake chatbot.

### 6. Science, limitations, and sources
Provide a concise and readable explanation of the method, scope, uncertainty, and data provenance.

Include source links and a restrained project footer.

## Real data integration

Inspect the existing integration first. The current frontend references:

`https://asadgnc.github.io/edev-data/data`

Expected contract:
- `meta.json`
- `timeseries.json`
- Per-date `bounds.json`
- Per-date classification PNG, currently `class.png`
- Per-date raw HH PNG, currently `hh.png`

Confirm the actual schema and available files before implementing adapters. Keep data loading and validation in a dedicated typed module.

Preserve these distinctions:
- A valid zero measurement is zero.
- A missing measurement is null / unavailable.
- A failed request is an error.
- A missing acquisition is “No data.”

Never fabricate intermediate dates, measurements, raster overlays, quality labels, or successful connection states.

Show meaningful provenance near the explorer: acquisition date, data source, product quality, and footprint scope. Only show product identifiers or additional metadata when actually provided.

Do not claim live-data verification unless it has been tested successfully.

## Scientific constraints

The supplied briefing describes ten NISAR acquisitions between 26 June and 24 October 2026, using the same track, frame, and flight direction. Read available metadata to confirm the actual records.

There is a data gap between 27 July and 10 August 2026:
- Label it “No data.”
- Show the gap on the time-series chart.
- Do not draw a continuous measurement line across it.
- Do not interpret it as zero flooding.

Frequency B output spacing is approximately 80 m. Existing metadata fields `native_pixel_m: 20` and `looks: 4` have been flagged as inconsistent. Do not silently reinterpret them as confirmed resolution.

Interpretation:
- Calm open water often appears dark in radar.
- Flooded vegetation can produce bright HH double-bounce returns.
- HH/HV-based classes are algorithm outputs with thresholds that are not fully calibrated.
- Present results as consistent relative indicators, not definitive hydrological measurements.
- Matching acquisition geometry reduces one source of variation; it does not prove that every radar change is caused by flooding.
- The study covers one NISAR image footprint, not the entire Okavango Delta.
- One 2026 season does not establish annual recurrence or long-term change.
- Show PROVISIONAL / VALIDATED only as supplied by the actual observation metadata.

Briefing reference values:
- Open water: 1,181.2 km² on 8 July 2026.
- Flooded vegetation: 349.8 km² on 6 September 2026.

Verify these against the loaded series before presenting them as computed insights. If the feed differs, use the actual data and report the discrepancy.

## JRC and regional comparison

JRC / Landsat is historical OPEN-WATER context. Its long-term summaries cover 1984–2024; monthly history versions must be tracked when combining products.

JRC open water is not the same measurement as NISAR flooded vegetation.

Do not create a fake 2026 JRC layer or imply same-day validation.

Only enable historical comparison if the historical dataset is genuinely available. Otherwise show a concise “Historical context coming next” explanation.

Regional comparison requires actual regional boundaries and regional statistics from the data team. Do not invent northern/southern regional measurements.

Do not give unfinished features the same visual prominence as working features.

## Environmental context

Upstream rainfall in Angola and river flow are meaningful variables for understanding the flood pulse.

Wind may affect radar returns but must not be presented as the established primary cause of the observed flood pattern.

Do not add earthquakes or unrelated deformation analysis.

## AI and security

Do not expose API keys in frontend code.

An LLM assistant is optional and lower priority than the working explorer. Without a secure backend, use deterministic Data Insight panels derived from the actual JSON.

Never invent forecasts, causal conclusions, or unsupported answers.

## Sources

Include:
- NISAR GCOV guide:
  https://nisar-docs.asf.alaska.edu/gcov/
- JRC data coverage:
  https://global-surface-water.appspot.com/download
- OKACOM basin report:
  https://www.okacom.org/sites/default/files/documents/TDA_Final-English.pdf

Keep decorative Earth imagery clearly separate from radar measurements and credit visual assets appropriately.

## Engineering and delivery

- Use reusable, typed React components.
- Keep the 3D scene isolated from data loading so a graphics failure cannot break the explorer.
- Lazy-load expensive components appropriately.
- Keep animation smooth without unnecessary GPU load.
- Ensure responsive layouts with a strong desktop presentation and usable mobile controls.
- Avoid unnecessary backend infrastructure.
- Preserve compatibility with the intended static GitHub Pages deployment; account for base paths and static export.
- Respect the local project deadline: Sunday, 15 November, 15:30 Istanbul time. Prioritize the cinematic opening and fully working NISAR explorer over speculative features.

Validate:
- TypeScript and production build.
- Actual data loading.
- Map placement and correct initial location.
- Rapid date changes without stale overlay races.
- Chart gaps and missing values.
- Comparison alignment and divider behavior.
- Desktop and mobile layouts.
- Reduced-motion behavior.
- Failure states when the feed or an overlay is unavailable.

Finish with a concise report of what works, what was verified, and what remains blocked by missing data.

Build a polished, integrated result. The final experience should make visitors think: “This is beautiful—and their data really works.”