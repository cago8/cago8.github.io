/**
 * The whole site runs on four water tones plus two accents. Canvas drawing
 * cannot read CSS custom properties cheaply per frame, so the values live here
 * and `globals.css` mirrors them as tokens. Keep the two in sync.
 *
 * Contrast ratios of every text pairing actually used (WCAG 2.1):
 *   ink   on sand   14.64  ·  inkSoft on sand   6.71
 *   sand  on deep   15.27  ·  sand    on plate 12.31
 *   aqua  on plate   7.73  ·  coral   on plate  5.13
 * No readable text is ever drawn on the raw water gradient.
 */
export const palette = {
  /** Water column, surface → seabed. Used for the background gradient. */
  waterTop: '#1E6B8C',
  waterMid: '#0E4260',
  waterDeep: '#061B2C',
  /** Solid fill behind every object label in the scene. */
  plate: '#0A2E45',
  /** Warm off-white: panels, list surfaces, object labels. */
  sand: '#F5EFE3',
  ink: '#0B1F30',
  inkSoft: '#3C566A',
  /** Accents. Aqua = structure/currents. Coral = the diver and anything live. */
  aqua: '#46D4C8',
  coral: '#FF6F4E',
} as const;

/**
 * The water column as a ramp, surface → seabed. `drawWater` builds its
 * gradient from these stops and `waterAt` samples the same ramp, so anything
 * that has to match the background never has to guess where the stops sit.
 */
export const waterStops = [
  { at: 0, color: palette.waterTop },
  { at: 0.42, color: palette.waterMid },
  { at: 1, color: palette.waterDeep },
] as const;

export type Rgb = [number, number, number];

/** Hex token → channels, for the canvas code that needs to blend one. */
export function rgbOf(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** The water's colour at `depth` — 0 at the surface, 1 at the seabed. */
export function waterAt(depth: number): Rgb {
  const d = Math.min(1, Math.max(0, depth));
  let i = 1;
  while (i < waterStops.length - 1 && d > waterStops[i].at) i++;
  const lo = waterStops[i - 1];
  const hi = waterStops[i];
  const f = (d - lo.at) / (hi.at - lo.at);
  const a = rgbOf(lo.color);
  const b = rgbOf(hi.color);
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

/** Blend two colours, `f` = 0 all `a`, 1 all `b`. */
export function mixRgb(a: Rgb, b: Rgb, f: number): Rgb {
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

/** Channels → a canvas fill string. */
export function toneOf([r, g, b]: Rgb, alpha = 1) {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
}

/** Per-category accent, so a cluster is identifiable at a glance. */
export const categoryAccent = {
  profile: palette.sand,
  experience: palette.aqua,
  skills: '#8FD6E8',
  projects: palette.coral,
  contact: '#FFC46B',
} as const;

export type Category = keyof typeof categoryAccent;
