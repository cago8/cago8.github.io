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

/** Per-category accent, so a cluster is identifiable at a glance. */
export const categoryAccent = {
  profile: palette.sand,
  experience: palette.aqua,
  skills: '#8FD6E8',
  projects: palette.coral,
  contact: '#FFC46B',
} as const;

export type Category = keyof typeof categoryAccent;
