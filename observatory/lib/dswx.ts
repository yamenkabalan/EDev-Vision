/**
 * Display colours (RGBA) for NASA's OPERA DSWx layer on the dark map. ReferenceMap redraws NASA's
 * tiles with these, and the legend under the map uses the same values.
 */
export const DSWX_COLOURS = {
  open: [70, 150, 240, 255],
  partial: [150, 200, 240, 150],
  cloud: [175, 175, 175, 110],
} as const;
