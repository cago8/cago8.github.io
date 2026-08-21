/**
 * Where everything stands, for a given screen shape.
 *
 * The world is not a fixed 1600×1000 box any more. It is derived from the
 * stage's aspect ratio so that the canvas transform is a single uniform scale
 * with no offset — the scene always fills the stage exactly, with no
 * letterboxing and nothing cropped.
 *
 * Objects are placed by packing each category into a normalized band. Three
 * band tables cover the shapes a browser window actually takes: `wide` for
 * laptops and ultrawides, `standard` for near-square windows, `portrait` for
 * phones and tablets held upright. Everything else — seabed, kelp, currents,
 * the diver's spawn — is expressed as a fraction of the world, so the reef
 * spreads with the water instead of bunching up on the left.
 *
 * This module is pure and has no dependency on matter-js, React or the DOM,
 * which is what makes it testable: see `layout.test.ts`.
 */
import type { Category } from './palette';
import { sceneObjects, type SceneObject } from './scene';

export type LayoutMode = 'wide' | 'standard' | 'portrait';

/** Resolved geometry for one object. The single source of size and position. */
export interface Placement {
  x: number;
  y: number;
  hw: number;
  hh: number;
  r: number;
}

export interface CurrentZone {
  x: number;
  y: number;
  w: number;
  h: number;
  fx: number;
  fy: number;
}

export interface Boulder {
  x: number;
  y: number;
  rx: number;
  ry: number;
  tilt: number;
}

export interface Kelp {
  x: number;
  h: number;
  phase: number;
  lean: number;
}

export interface Pinnacle {
  x: number;
  baseY: number;
  topY: number;
  baseW: number;
  topW: number;
}

export interface Layout {
  mode: LayoutMode;
  /**
   * The cast actually present in this layout, in scene order.
   *
   * Normally every object in `sceneObjects`; on the mobile tab layout only the
   * focused category's. It is the single answer to "what is in the water right
   * now" — physics, hit testing, the a11y node list and the renderer all read
   * it, so no consumer can disagree with `placements` about who exists.
   */
  objects: SceneObject[];
  /** The category this layout is narrowed to, or null when all are present. */
  focus: Category | null;
  /** Resolved object scale — the renderer sizes labels with it. */
  scale: number;
  world: { w: number; h: number };
  /** Everything below this line is seabed silhouette, not swimmable. */
  seabedY: number;
  diverStart: { x: number; y: number };
  placements: Map<string, Placement>;
  boulders: Boulder[];
  kelp: Kelp[];
  pinnacle: Pinnacle;
  currents: CurrentZone[];
}

/* --------------------------------------------------------------- world box */

/**
 * Nominal world height. Held constant across the aspect ratios real windows
 * take, so object sizes stay visually constant; only the width changes. At the
 * extremes the width pins instead and the height gives, which is what a phone
 * wants anyway — a taller column to stack into.
 */
const NOMINAL_H = 1000;
const MIN_W = 760;
const MAX_W = 2600;

function worldFor(aspect: number) {
  const w = NOMINAL_H * aspect;
  if (w < MIN_W) return { w: MIN_W, h: MIN_W / aspect };
  if (w > MAX_W) return { w: MAX_W, h: MAX_W / aspect };
  return { w, h: NOMINAL_H };
}

/* ------------------------------------------------------------ band tables */

/** A normalized rect in 0–1 world space. */
interface Band {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Offset alternate rows by half a cell — reads as a reef, not a spreadsheet. */
  stagger?: boolean;
}

interface ModeSpec {
  /** Largest object scale this composition may use; the fitter goes down from here. */
  maxScale: number;
  bands: Record<Category, Band>;
  diver: { x: number; y: number };
}

const MODES: Record<LayoutMode, ModeSpec> = {
  wide: {
    maxScale: 1,
    bands: {
      profile: { x0: 0.012, y0: 0.08, x1: 0.145, y1: 0.34 },
      experience: { x0: 0.26, y0: 0.03, x1: 0.74, y1: 0.42 },
      skills: { x0: 0.025, y0: 0.5, x1: 0.42, y1: 0.87 },
      projects: { x0: 0.555, y0: 0.5, x1: 0.985, y1: 0.87 },
      contact: { x0: 0.855, y0: 0.08, x1: 0.99, y1: 0.34 },
    },
    diver: { x: 0.5, y: 0.46 },
  },
  standard: {
    maxScale: 0.9,
    bands: {
      profile: { x0: 0.02, y0: 0.02, x1: 0.2, y1: 0.18 },
      experience: { x0: 0.22, y0: 0.02, x1: 0.78, y1: 0.36 },
      skills: { x0: 0.02, y0: 0.42, x1: 0.5, y1: 0.86 },
      projects: { x0: 0.52, y0: 0.42, x1: 0.99, y1: 0.86 },
      contact: { x0: 0.8, y0: 0.02, x1: 0.99, y1: 0.18 },
    },
    diver: { x: 0.5, y: 0.39 },
  },
  portrait: {
    maxScale: 0.8,
    bands: {
      // The top band starts below the hint banner, which is screen-space and
      // would otherwise sit on top of Profile and Contact on a phone.
      profile: { x0: 0.03, y0: 0.07, x1: 0.46, y1: 0.17 },
      contact: { x0: 0.54, y0: 0.07, x1: 0.97, y1: 0.17 },
      experience: { x0: 0.03, y0: 0.2, x1: 0.97, y1: 0.45 },
      skills: { x0: 0.03, y0: 0.47, x1: 0.97, y1: 0.66 },
      projects: { x0: 0.03, y0: 0.68, x1: 0.97, y1: 0.815 },
    },
    diver: { x: 0.5, y: 0.865 },
  },
};

/** Below this fraction of the world height, portrait keeps the water empty:
 *  it is the diver's own lane, kept free of objects to spawn and rest in. */
export const PORTRAIT_CLEAR_Y = 0.82;

/**
 * The mobile tab layout: one category at a time, given the whole stage.
 *
 * A phone cannot show five clusters at a readable size, so the tab bar trades
 * breadth for size — the band is deliberately generous and the scale ceiling is
 * the full 1, because six hexes alone in a portrait window should be big enough
 * to read and big enough to hit, not shrunk to fit neighbours that are not
 * there. The lower fifth stays clear for the diver, as in `portrait`.
 */
const FOCUS_SPEC: ModeSpec = {
  maxScale: 1,
  bands: (() => {
    const band: Band = { x0: 0.06, y0: 0.08, x1: 0.94, y1: 0.68 };
    return {
      profile: band,
      experience: band,
      skills: band,
      projects: band,
      contact: band,
    };
  })(),
  diver: { x: 0.5, y: 0.82 },
};

export function modeFor(aspect: number): LayoutMode {
  if (aspect < 0.95) return 'portrait';
  if (aspect < 1.5) return 'standard';
  return 'wide';
}

/* ------------------------------------------------------------------ packing */

const byCategory = new Map<Category, SceneObject[]>();
for (const obj of sceneObjects) {
  const list = byCategory.get(obj.category);
  if (list) list.push(obj);
  else byCategory.set(obj.category, [obj]);
}

/**
 * Breathing room between two neighbouring objects, in world units. Kept wider
 * than the diver's own diameter (40): anything tighter turns every packed row
 * into a wall the diver can only bounce off, never slip through, which is
 * what made the object in the middle of a row (nothing but neighbours on
 * every side) effectively unreachable.
 */
const GAP = 46;

interface Grid {
  cols: number;
  rows: number;
  gw: number;
  gh: number;
  stagger: number;
  overflow: number;
  score: number;
}

/**
 * Choose the column count whose grid shape best matches the band's own shape.
 * Balanced grids beat greedy ones: eight skill gauges in a wide band want 5×2,
 * not 6+2. Horizontal overflow is weighted far heavier than vertical, because
 * a grid too tall for its band merely crowds its neighbour while one too wide
 * leaves the world entirely.
 */
function bestGrid(band: Band, bw: number, bh: number, count: number, cellW: number, cellH: number): Grid {
  const bandRatio = bw / bh;
  let best: Grid | null = null;
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const stagger = band.stagger && rows > 1 ? cellW / 2 : 0;
    const gw = cols * cellW + stagger;
    const gh = rows * cellH;
    const overW = Math.max(0, gw - bw) / bw;
    const overH = Math.max(0, gh - bh) / bh;
    // A ragged final row (five hexes then one) reads as a mistake, so grids
    // that divide evenly are strongly preferred over marginally better-shaped
    // ones that leave an orphan.
    const remainder = count % cols;
    const orphan = remainder === 0 ? 0 : (cols - remainder) / count;
    const score =
      Math.abs(gw / gh - bandRatio) / bandRatio + orphan * 4.5 + overW * 40 + overH * 12;
    if (!best || score < best.score) {
      best = { cols, rows, gw, gh, stagger, overflow: overW + overH, score };
    }
  }
  return best as Grid;
}

function cellsFor(objects: SceneObject[], scale: number) {
  return {
    w: objects[0].baseHw * 2 * scale + GAP,
    h: objects[0].baseHh * 2 * scale + GAP,
  };
}

const SCALE_FLOOR = 0.45;
const SCALE_STEP = 0.05;

/**
 * Largest object scale at which every category's grid fits inside its band.
 * A fixed per-mode scale cannot serve both a 760×1013 tablet and a 760×1520
 * phone, and guessing one produces exactly the off-screen objects this search
 * rules out.
 */
function scaleFor(
  spec: ModeSpec,
  world: { w: number; h: number },
  cast: [Category, SceneObject[]][],
): number {
  for (let scale = spec.maxScale; scale > SCALE_FLOOR; scale -= SCALE_STEP) {
    let ok = true;
    for (const [category, objects] of cast) {
      const band = spec.bands[category];
      const bw = (band.x1 - band.x0) * world.w;
      const bh = (band.y1 - band.y0) * world.h;
      const cell = cellsFor(objects, scale);
      if (bestGrid(band, bw, bh, objects.length, cell.w, cell.h).overflow > 0) {
        ok = false;
        break;
      }
    }
    if (ok) return scale;
  }
  return SCALE_FLOOR;
}

/** Lay `count` cells out inside `band`, centred, with short rows centred too. */
function packBand(
  band: Band,
  world: { w: number; h: number },
  count: number,
  cellW: number,
  cellH: number,
): { x: number; y: number }[] {
  const bx = band.x0 * world.w;
  const by = band.y0 * world.h;
  const bw = (band.x1 - band.x0) * world.w;
  const bh = (band.y1 - band.y0) * world.h;
  const { cols, gw, gh, stagger } = bestGrid(band, bw, bh, count, cellW, cellH);

  // Centre the grid in its band, then keep it inside the world even in the
  // degenerate case where nothing fits.
  const originX = Math.min(Math.max(bx + (bw - gw) / 2, 0), Math.max(0, world.w - gw));
  const originY = Math.min(Math.max(by + (bh - gh) / 2, 0), Math.max(0, world.h - gh));

  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const inRow = Math.min(cols, count - row * cols);
    const rowOffset = (cols * cellW - inRow * cellW) / 2 + (row % 2 === 1 ? stagger : 0);
    out.push({
      x: originX + rowOffset + col * cellW + cellW / 2,
      y: originY + row * cellH + cellH / 2,
    });
  }
  return out;
}

/* -------------------------------------------------------------------- decor */

const BOULDER_SPEC = [
  { fx: 0.08, frx: 0.103, ry: 78, tilt: -0.06 },
  { fx: 0.25, frx: 0.06, ry: 40, tilt: 0.05 },
  { fx: 0.41, frx: 0.082, ry: 56, tilt: -0.03 },
  { fx: 0.57, frx: 0.119, ry: 96, tilt: 0.04 },
  { fx: 0.74, frx: 0.074, ry: 48, tilt: -0.05 },
  { fx: 0.92, frx: 0.107, ry: 70, tilt: 0.03 },
];

const KELP_SPEC = [
  { fx: 0.039, fh: 0.268, phase: 0, lean: 0.16 },
  { fx: 0.06, fh: 0.206, phase: 1.9, lean: 0.1 },
  { fx: 0.524, fh: 0.314, phase: 0.7, lean: -0.14 },
  { fx: 0.545, fh: 0.246, phase: 2.6, lean: -0.08 },
  { fx: 0.654, fh: 0.288, phase: 1.2, lean: 0.13 },
  { fx: 0.674, fh: 0.214, phase: 3.4, lean: 0.07 },
  { fx: 0.968, fh: 0.232, phase: 2.1, lean: -0.11 },
];

const CURRENT_SPEC: { fx0: number; fy0: number; fw: number; fh: number; fx: number; fy: number }[] =
  [
    // Broad lateral drift through the middle of the water column.
    { fx0: 0.069, fy0: 0.442, fw: 0.556, fh: 0.112, fx: 1, fy: 0 },
    // Rising column off the pinnacle — pushes you back up toward the objects.
    { fx0: 0.5, fy0: 0.52, fw: 0.094, fh: 0.385, fx: 0, fy: -1 },
    // Small downwelling on the right, so the field is not symmetrical.
    { fx0: 0.654, fy0: 0.25, fw: 0.069, fh: 0.3, fx: 0, fy: 1 },
  ];

/* ------------------------------------------------------------------ builder */

/**
 * @param focus When set, only that category is placed and it is given the whole
 *   stage — the mobile tab layout. When null, every category is placed at once,
 *   which is the desktop composition and the only thing that has ever existed.
 */
export function buildLayout(aspect: number, focus: Category | null = null): Layout {
  const mode = modeFor(aspect);
  const spec = focus ? FOCUS_SPEC : MODES[mode];
  const world = worldFor(aspect);
  const cast: [Category, SceneObject[]][] = focus
    ? [[focus, byCategory.get(focus)!]]
    : [...byCategory];
  const scale = scaleFor(spec, world, cast);
  const seabedY = world.h * 0.905;
  const vScale = world.h / NOMINAL_H;

  const placements = new Map<string, Placement>();
  for (const [category, objects] of cast) {
    const cell = cellsFor(objects, scale);
    const points = packBand(spec.bands[category], world, objects.length, cell.w, cell.h);
    objects.forEach((obj, i) => {
      placements.set(obj.id, {
        x: points[i].x,
        y: points[i].y,
        hw: obj.baseHw * scale,
        hh: obj.baseHh * scale,
        r: obj.baseR * scale,
      });
    });
  }

  return {
    mode,
    objects: focus ? sceneObjects.filter((o) => o.category === focus) : sceneObjects,
    focus,
    scale,
    world,
    seabedY,
    diverStart: { x: spec.diver.x * world.w, y: spec.diver.y * world.h },
    placements,
    boulders: BOULDER_SPEC.map((b) => ({
      x: b.fx * world.w,
      y: seabedY,
      rx: b.frx * world.w,
      ry: b.ry * vScale,
      tilt: b.tilt,
    })),
    kelp: KELP_SPEC.map((k) => ({
      x: k.fx * world.w,
      h: k.fh * world.h,
      phase: k.phase,
      lean: k.lean,
    })),
    pinnacle: {
      x: 0.616 * world.w,
      baseY: seabedY + 10 * vScale,
      topY: 0.548 * world.h,
      baseW: Math.max(46, 0.051 * world.w),
      topW: Math.max(14, 0.0125 * world.w),
    },
    currents: CURRENT_SPEC.map((c) => ({
      x: c.fx0 * world.w,
      y: c.fy0 * world.h,
      w: c.fw * world.w,
      h: c.fh * world.h,
      fx: c.fx,
      fy: c.fy,
    })),
  };
}
