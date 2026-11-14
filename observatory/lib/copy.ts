/*
  Every string introduced by the layer strip, the right-hand stats column, the
  yearly box and the AI chat lives here, so a translation only touches this
  file. Functions are used where a value has to be inserted into the sentence.
*/
/** "+1.0", "−0.4" (true minus sign), "0.0". */
export const signed = (v: number, digits = 0) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(digits)}`;

export type LayerId ='class' | 'rgb' | 'viirs' | 'nasa' | 'dswx' | 'history' | 'hh';

export type LayerCopy = {
  label: string;
  /** "[What it shows]." */
  what: string;
  /** "[Best for]." */
  best: string;
  /** Two or three plain sentences for the "?" popover. */
  more: readonly string[];
  /** Technical details, only shown inside the popover. */
  tech: readonly string[];
};

export const COPY = {
  layers: {
    groupLabel: 'Map layer',
    more: 'More layers',
    moreActive: (name: string) => `More: ${name}`,
    menuLabel: 'More map layers',
    sheetTitle: 'More layers',
    close: 'Close',
    unavailable: 'No image for this date',
    infoButton: (name: string) => `About the ${name} layer`,
    techHeading: 'Technical details',
    items: {
      class: {
        label: 'Water map',
        what: 'Open water in blue and flooded vegetation in green, detected by radar',
        best: 'Best for seeing where the flood is and how it changes between dates',
        more: [
          'Every pixel is sorted with the same fixed radar thresholds on every date.',
          'The thresholds are strict, so the mapped area is a lower bound: trust the change between dates more than the exact size.',
        ],
        tech: [
          'Our classification of NISAR L2 GCOV (L-band, frequency B), HH and HV polarisations.',
          'Open water: low HH and low HV. Flooded vegetation: high HH and HH much higher than HV.',
          'Multitemporal speckle filter (Quegan & Yu 2001) over all dates.',
        ],
      },
      rgb: {
        label: 'Radar',
        what: 'The radar signal drawn in colour: smooth surfaces show blue, flooded reeds red-orange, vegetation on dry ground green',
        best: 'Best for seeing why the water map looks the way it does',
        more: [
          'This is a picture of the measurement, not a classification.',
          'Blue also covers smooth dry or wet flats, so it shows more area than the strict open-water class.',
        ],
        tech: [
          'Red = HH minus HV (dB), green = HV (dB), blue = inverted HH (dB).',
          'Same NISAR L2 GCOV data as the water map, speckle-filtered.',
        ],
      },
      viirs: {
        label: 'Satellite photo',
        what: 'A normal daily satellite photo (VIIRS). Clouds can hide the ground, which is why we also use radar',
        best: 'Best for a quick real-world look',
        more: [
          'The photo is from the same day as the radar date.',
          'It is context only, not a water measurement.',
        ],
        tech: [
          'NOAA-20 VIIRS corrected reflectance, true colour, about 250 m per pixel.',
          'Live tiles from NASA GIBS.',
        ],
      },
      nasa: {
        label: 'NISAR radar image',
        what: "NASA's own colour rendering of the same NISAR radar data",
        best: 'Best for checking our processing against NASA’s',
        more: [
          'NASA publishes these images from 13 August 2026 onwards, so the first three radar dates have none.',
          'Some tiles can be empty.',
        ],
        tech: [
          'NISAR L2 GCOV browse imagery via NASA GIBS (live tiles, up to map zoom 13).',
          'Not processed by us.',
        ],
      },
      dswx: {
        label: 'NASA water product',
        what: "NASA's own open-water map from optical satellites (Landsat and Sentinel-2), shown as a reference",
        best: 'Best for comparing with our radar classification',
        more: [
          'Optical satellites cannot see water under plants or through clouds; grey means no clear view.',
          'It shows the clear day closest to the radar date, at most two days apart.',
        ],
        tech: [
          'NASA OPERA L3 DSWx-HLS (Dynamic Surface Water Extent), 30 m.',
          'Live tiles from NASA GIBS.',
        ],
      },
      history: {
        label: 'Landsat history',
        what: 'Yearly open-water maps from Landsat, 1984–2025',
        best: 'Best for comparing with past floods',
        more: [
          'Light blue is seasonal water, dark blue is water present most of the year.',
          'Landsat is optical, so it misses water under vegetation; years with few clear images are a lower bound.',
        ],
        tech: [
          'Digital Earth Africa Water Observations from Space (WOfS), annual summary.',
          'Landsat 5/7/8/9, shown at 120 m. Water = wet in at least 10% of clear looks.',
        ],
      },
      hh: {
        label: 'Raw radar (HH)',
        what: 'The HH radar band before our speckle filter, in grey: dark is smooth water, bright is flooded vegetation or trees',
        best: 'Best for experts checking the raw signal',
        more: [
          'This is the image the water map is built from, before cleaning.',
          'The grain you see is speckle, a normal property of radar images.',
        ],
        tech: [
          'NISAR L2 GCOV HH backscatter, no speckle filter.',
        ],
      },
    } satisfies Record<LayerId, LayerCopy>,
    tech: {
      product: (product: string, frequency: string | null, pixel: number | null) =>
        `${product}${frequency ? `, frequency ${frequency}` : ''}${pixel ? `, ${pixel} m output spacing` : ''}.`,
      stretch: (lo: number, hi: number) => `Fixed ${lo} to ${hi} dB grey stretch.`,
    },
  },

  caption: {
    nisar: 'Radar satellite (NISAR) sees through clouds and into vegetation.',
    history: 'Landsat history: optical satellites see open water only, on cloud-free days.',
  },

  howToRead: {
    button: 'How to read this map',
    title: 'How to read this map',
    legend: 'Legend',
    noData: 'No colour: dry land, or outside the radar footprint',
    historyLegend: [
      { label: 'Seasonal open water', color: '#6baed6' },
      { label: 'Permanent open water', color: '#08519c' },
    ],
    bullets: [
      'Blue is open water. Calm water reflects the radar away, so it looks dark to the radar.',
      'Green is flooded vegetation. The signal bounces between water and stems and comes back strong.',
      'The map covers one radar footprint, not the whole Delta. Compare dates rather than reading exact sizes.',
    ],
    historyBullets: [
      'Light blue is seasonal open water, dark blue is water present most of the year.',
      'Landsat cannot see water under vegetation, so flooded reeds are missing here.',
      'Years with few clear images show less water than there was: treat them as a lower bound.',
    ],
  },

  stats: {
    qualityHelp: {
      PROVISIONAL: 'Provisional = not yet fully validated. A small calibration offset against later, validated data is possible.',
      VALIDATED: 'Validated = released by the NISAR team after calibration checks.',
      LANDSAT: 'Landsat yearly map: optical satellite, open water only.',
      LIMITED: 'Few clear Landsat images this year, so the area is a lower bound.',
      UNKNOWN: 'The data feed does not state a quality level for this date.',
    },
    qualityLabel: (tag: string) => `Data quality: ${tag}. Show what this means`,
    openWater: 'Open water',
    openWaterHelp: 'Calm, open water such as channels and lagoons. Radar bounces away from smooth water, so it looks dark in radar images.',
    openWaterHistoryHelp: 'Open water Landsat saw in this year: wet in at least 10% of its clear images.',
    floodedVeg: 'Flooded vegetation',
    floodedVegHelp: 'Reeds and papyrus standing in water. The radar signal bounces between the water and the stems and returns strongly, which is how radar finds water that optical satellites cannot see beneath plants.',
    floodedVegHistoryHelp: 'Not measured by Landsat: optical satellites cannot see water beneath plants.',
    unitNisar: 'km² classified',
    unitHistory: 'km² annual area',
    notMeasured: 'Not measured by Landsat',
    footprint: (valid: string) => `Within the observed radar footprint (${valid} km² of valid area), not the whole Delta. Threshold-based relative indicators.`,
    footprintHistory: 'Optical open water only. It does not measure water below vegetation.',
    associations: 'Associations show context, not proof of cause.',
  },

  yearly: {
    title: 'Open water by year',
    subtitle: 'Yearly open-water area seen by Landsat, compared with the long-term average.',
    stripLabel: 'Open water by year, compared with the long-term average. Select a year for details.',
    meanNote: (mean: string, n: number, first: number, last: number) =>
      `Long-term average: ${mean} km² (${n} years with enough clear images, ${first}–${last}).`,
    loading: 'Loading the yearly record…',
    failed: 'The yearly record could not be loaded.',
    classes: {
      dry: { label: 'Dry year', icon: '▼', hint: 'below average' },
      near: { label: 'Near average', icon: '●', hint: 'within 20% of the average' },
      wet: { label: 'Wet year', icon: '▲', hint: 'above average' },
      uncertain: { label: 'Too few clear images', icon: '◌', hint: 'value is a lower bound' },
      none: { label: 'No data', icon: '×', hint: 'no yearly water value' },
    },
    partialBadge: 'Partial year',
    partialNote: 'Few clear Landsat images this year, so the area is a lower bound.',
    atLeast: 'at least',
    barLabel: (year: number, value: string, anomaly: string, cls: string) => `${year}: ${value}. ${anomaly}. ${cls}.`,
    openWater: 'Open water this year',
    vsAverage: 'Compared with the average',
    vsPrev: (y: number) => `vs ${y}`,
    vsNext: (y: number) => `vs ${y}`,
    partialSuffix: '(partial year)',
    above: (pct: number) => `${pct}% above average`,
    below: (pct: number) => `${pct}% below average`,
    same: 'Same as the average',
    noValue: 'No value',
    notComparable: 'Not comparable: the value is a lower bound',
    unit: 'km²',
    changeValue: (diff: string, pct: string | null) => `${diff} km²${pct ? ` (${pct}%)` : ''}`,
    eventOpens: 'opens in a new tab',
    noData1988: 'Landsat has no water map for this year.',
    noData2026: 'The Landsat map for this year is not complete yet. See the NISAR radar season above.',
    noDataGeneric: 'No yearly water value for this year.',
    driversTitle: 'What happened this year',
    driversEmpty: 'No driver data for this year.',
    pushes: { dry: 'towards a smaller flood', wet: 'towards a larger flood', neutral: 'no clear push' },
    eventsTitle: 'Reported at the time',
    askAi: (year: number) => `Ask AI about ${year}`,
    askPrompt: (year: number) =>
      `What happened to the Okavango flood in ${year}? Compare it with the long-term average and tell me which indicators went with it.`,
    legendTitle: 'Legend',
  },

  drivers: {
    enso: { label: 'El Niño / La Niña', indicator: 'NOAA Oceanic Niño Index (ONI), Dec–Feb' },
    headwater_rain: { label: 'Rain in the Angolan highlands', indicator: 'ERA5 rainfall, Nov–Apr. Feeds the Delta flood months later' },
    inflow: { label: 'River inflow (model)', indicator: 'GloFAS river model near Mohembo, Jan–Jun peak. Not a gauge' },
    local_rain: { label: 'Rain over the Delta', indicator: 'ERA5 rainfall, Nov–Apr' },
    heat: { label: 'Flood-season temperature', indicator: 'NASA POWER daily maximum, May–Oct' },
    values: {
      oni: (v: number, phase: string) => `ONI ${signed(v, 1)} · ${phase}`,
      rain: (mm: number, pct: number) => `${mm} mm · ${Math.abs(pct) < 3 ? 'close to normal' : `${Math.abs(pct)}% ${pct > 0 ? 'above' : 'below'} normal`}`,
      inflow: (m3s: number, rank: number, of: number) => `${m3s} m³/s · rank ${rank} of ${of}`,
      heat: (d: number) => `${signed(d, 1)} °C vs normal`,
    },
    phases: { elNino: 'El Niño', strongElNino: 'strong El Niño', laNina: 'La Niña', strongLaNina: 'strong La Niña', neutral: 'neutral Pacific' },
  },

  /* Rule-built sentence for "What happened this year". Each clause names its indicator. */
  sentence: {
    headwater: (pct: number) =>
      Math.abs(pct) < 3
        ? 'rain in the Angolan highlands (ERA5) was close to normal'
        : `rain in the Angolan highlands (ERA5) was ${Math.abs(pct)}% ${pct > 0 ? 'above' : 'below'} normal`,
    inflow: (rank: number, of: number) => `modelled river inflow (GloFAS) ranked ${rank} of ${of} years`,
    noUpstream: 'there is no upstream rain or river data for this year',
    fit: {
      dryDry: 'which fits the low flood',
      wetWet: 'which fits the high flood',
      nearNear: 'which fits a near-average flood',
      nearPushed: 'yet the flood ended near average',
      dryNeutral: 'but the flood was still low',
      wetNeutral: 'but the flood was still high',
      dryWet: 'which does not match the low flood; water carried over from the year before, or local factors, may matter',
      wetDry: 'which does not match the high flood; water carried over from the year before, or local factors, may matter',
      uncertain: 'but Landsat saw too few clear days to judge the flood this year',
      none: 'but there is no yearly water value to compare with',
    },
    alsoPrefix: 'Also: ',
    enso: (phase: string, v: number) => `the Pacific showed ${phase} conditions (NOAA ONI ${signed(v, 1)})`,
    localRain: (pct: number) => `rain over the Delta (ERA5) was ${Math.abs(pct)}% ${pct > 0 ? 'above' : 'below'} normal`,
    heat: (d: number) => `flood-season days were ${Math.abs(d).toFixed(1)} °C ${d > 0 ? 'hotter' : 'cooler'} than normal (NASA POWER)`,
    othersNormal: 'Other indicators were near normal.',
    caveat: 'These are associations, not proof of cause.',
  },

  chat: {
    title: 'Ask AI about Okavango',
    fab: 'Ask AI about the Okavango data',
    intro: 'Ask about the radar, past water years, rainfall or river flow. Answers come only from the project data.',
    prompts: ['Why was 2019 so dry?', 'Compare this year with last year'],
    context: (date: string | null, year: number | null) =>
      `Using: ${[date && `observation ${date}`, year && `year ${year}`].filter(Boolean).join(' · ') || 'project data'}`,
    inputLabel: 'Your question about the Okavango',
    placeholder: 'Ask about water, weather, or the data…',
    send: 'Ask',
    note: 'AI can be wrong. Compare answers with the data panels.',
    thinking: 'Reading the field notes',
    you: 'YOU',
    ai: 'DELTA AI',
    minimise: 'Minimise',
    restore: 'Restore',
    expand: 'Expand',
    shrink: 'Shrink',
    close: 'Close',
  },
} as const;
