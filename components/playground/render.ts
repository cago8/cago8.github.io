/**
 * Canvas renderer for the playground. Everything is drawn as explicit vector
 * paths — no images, no gradients standing in for shading. Depth comes from a
 * flat long-shadow offset behind each silhouette, which is the one lighting
 * trick this style allows.
 *
 * The renderer is pure: it takes a frame of state and paints it. It never
 * touches the physics engine, so reduced-motion mode can call it exactly once
 * with settled positions and get a static diagram.
 */
import type { Layout } from './layout';
import { palette, categoryAccent } from './palette';
import type { SceneObject } from './scene';

export interface BodyFrame {
  obj: SceneObject;
  x: number;
  y: number;
  angle: number;
  /** Click-feedback wobble, 0 → 1 across its life. 0 (or absent) is at rest. */
  shake?: number;
}

export interface Particle {
  x: number;
  y: number;
  r: number;
  life: number;
  vx: number;
  vy: number;
}

/** A hit, fading out. Weak ones say so; strong ones are already opening a panel. */
export interface Flash {
  id: string;
  x: number;
  y: number;
  strong: boolean;
  /** Seconds since the impact. */
  age: number;
}

export interface RenderState {
  /** Seconds since mount. Frozen at 0 when motion is off. */
  t: number;
  layout: Layout;
  bodies: BodyFrame[];
  diver: { x: number; y: number; angle: number; kick: number; speed: number };
  bubbles: Particle[];
  flashes: Flash[];
  stamina: number;
  boosting: boolean;
  /** Touch joystick, in CSS pixels — drawn in screen space, not world space. */
  joystick: { x: number; y: number; dx: number; dy: number } | null;
  hoveredId: string | null;
  focusedId: string | null;
  openId: string | null;
  motion: boolean;
  fonts: { sans: string; mono: string };
}

/* ------------------------------------------------------------------ utils */

/** Deterministic noise so the bubble field and rock edges never re-roll. */
function hash(n: number) {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Flat-top hexagon centred on the origin. */
function hexPath(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** Cartridge outline: rounded rect with the top-right corner cut away. */
function cartridgePath(ctx: CanvasRenderingContext2D, hw: number, hh: number) {
  const r = 10;
  const cut = 24;
  ctx.beginPath();
  ctx.moveTo(-hw + r, -hh);
  ctx.lineTo(hw - cut, -hh);
  ctx.lineTo(hw, -hh + cut);
  ctx.lineTo(hw, hh - r);
  ctx.arcTo(hw, hh, hw - r, hh, r);
  ctx.lineTo(-hw + r, hh);
  ctx.arcTo(-hw, hh, -hw, hh - r, r);
  ctx.lineTo(-hw, -hh + r);
  ctx.arcTo(-hw, -hh, -hw + r, -hh, r);
  ctx.closePath();
}

/**
 * Shrink-to-fit text with at most two lines. Returns the lines and the font
 * size actually used, so callers can lay out around it.
 */
function fitLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  family: string,
  weight: string,
  maxSize: number,
  minSize: number,
  maxWidth: number,
): { lines: string[]; size: number } {
  const words = text.split(' ');
  for (let size = maxSize; size >= minSize; size -= 1) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) return { lines: [text], size };
    if (words.length > 1) {
      // Try every split point; keep the most balanced pair that fits.
      for (let i = 1; i < words.length; i++) {
        const a = words.slice(0, i).join(' ');
        const b = words.slice(i).join(' ');
        if (
          ctx.measureText(a).width <= maxWidth &&
          ctx.measureText(b).width <= maxWidth
        ) {
          return { lines: [a, b], size };
        }
      }
    }
  }
  return { lines: [text], size: minSize };
}

/* ------------------------------------------------------------- background */

function drawWater(ctx: CanvasRenderingContext2D, L: Layout) {
  const g = ctx.createLinearGradient(0, 0, 0, L.world.h);
  g.addColorStop(0, palette.waterTop);
  g.addColorStop(0.42, palette.waterMid);
  g.addColorStop(1, palette.waterDeep);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, L.world.w, L.world.h);
}

/** The surface: a bright band with a wave-cut underside and caustic streaks. */
function drawSurface(ctx: CanvasRenderingContext2D, t: number, L: Layout) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(L.world.w, 0);
  ctx.lineTo(L.world.w, 26);
  for (let x = L.world.w; x >= 0; x -= 20) {
    const y = 26 + Math.sin(x * 0.012 + t * 0.7) * 5 + Math.sin(x * 0.031 - t * 1.1) * 2.5;
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(190, 235, 245, 0.34)';
  ctx.fill();

  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(160, 225, 240, 0.12)';
  ctx.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const x = ((i * 137 + t * 9) % (L.world.w + 200)) - 100;
    const len = 40 + hash(i) * 90;
    ctx.lineWidth = 2 + hash(i + 9) * 2;
    ctx.beginPath();
    ctx.moveTo(x, 34 + hash(i + 3) * 10);
    ctx.lineTo(x + len, 34 + hash(i + 3) * 10);
    ctx.stroke();
  }
  ctx.restore();
}

/** Sun shafts. Kept extremely low alpha — atmosphere, not a light source. */
function drawShafts(ctx: CanvasRenderingContext2D, t: number, L: Layout) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const W = L.world.w;
  const shafts = [
    { x: 0.112 * W, w: 0.044 * W, lean: 0.081 * W },
    { x: 0.294 * W, w: 0.069 * W, lean: 0.119 * W },
    { x: 0.519 * W, w: 0.038 * W, lean: 0.094 * W },
    { x: 0.719 * W, w: 0.081 * W, lean: 0.138 * W },
    { x: 0.9 * W, w: 0.05 * W, lean: 0.1 * W },
  ];
  for (let i = 0; i < shafts.length; i++) {
    const s = shafts[i];
    const drift = Math.sin(t * 0.16 + i * 1.7) * 26;
    const g = ctx.createLinearGradient(0, 20, 0, L.world.h * 0.76);
    g.addColorStop(0, 'rgba(150, 225, 240, 0.10)');
    g.addColorStop(1, 'rgba(150, 225, 240, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(s.x + drift, 20);
    ctx.lineTo(s.x + s.w + drift, 20);
    ctx.lineTo(s.x + s.w + s.lean + drift * 1.6, L.world.h * 0.78);
    ctx.lineTo(s.x + s.lean * 0.6 + drift * 1.6, L.world.h * 0.78);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Three parallax layers of vector bubbles rising through the column. */
function drawBubbleField(ctx: CanvasRenderingContext2D, t: number, L: Layout) {
  const layers = [
    { count: 34, rMin: 2, rMax: 4, speed: 9, alpha: 0.16, seed: 11 },
    { count: 22, rMin: 4.5, rMax: 7.5, speed: 17, alpha: 0.22, seed: 57 },
    { count: 12, rMin: 8, rMax: 13, speed: 28, alpha: 0.3, seed: 131 },
  ];
  for (const layer of layers) {
    for (let i = 0; i < layer.count; i++) {
      const seed = layer.seed + i * 3;
      const baseX = hash(seed) * L.world.w;
      const span = L.world.h + 140;
      const y = span - (((hash(seed + 1) * span + t * layer.speed) % span) + 0) - 60;
      const x = baseX + Math.sin(t * 0.5 + hash(seed + 2) * 8) * 14;
      const r = layer.rMin + hash(seed + 3) * (layer.rMax - layer.rMin);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(210, 244, 250, ${layer.alpha * 0.4})`;
      ctx.fill();
      ctx.lineWidth = Math.max(1, r * 0.18);
      ctx.strokeStyle = `rgba(214, 246, 252, ${layer.alpha * 1.9})`;
      ctx.stroke();
      // A short highlight on the upper-left shoulder. Kept subtle: any more and
      // the bubble reads as a letter rather than a sphere.
      if (r > 4) {
        ctx.beginPath();
        ctx.arc(x, y, r * 0.55, Math.PI * 1.05, Math.PI * 1.38);
        ctx.lineWidth = Math.max(1, r * 0.16);
        ctx.strokeStyle = `rgba(240, 253, 255, ${layer.alpha * 1.6})`;
        ctx.stroke();
      }
    }
  }
}

/** Drift fields, shown as chevrons travelling along the flow direction. */
function drawCurrents(ctx: CanvasRenderingContext2D, t: number, motion: boolean, L: Layout) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let z = 0; z < L.currents.length; z++) {
    const c = L.currents[z];
    const horizontal = Math.abs(c.fx) > Math.abs(c.fy);
    const length = horizontal ? c.w : c.h;
    const across = horizontal ? c.h : c.w;
    const dir = horizontal ? c.fx : c.fy;

    // No zone tint: a flat fillRect leaves a hard-edged rectangle in the water.
    // The chevron field alone is enough to read as flow.
    const rows = Math.max(2, Math.round(across / 30));
    const perRow = Math.max(4, Math.round(length / 78));
    for (let r = 0; r < rows; r++) {
      const acrossPos = ((r + 0.5) / rows) * across;
      for (let i = 0; i < perRow; i++) {
        const travel = motion ? (t * 34 + hash(z * 7 + r) * length) : hash(z * 7 + r) * length;
        const along = ((i / perRow) * length + travel * dir + length * 2) % length;
        // Fade at both ends so chevrons do not pop at the zone boundary.
        const edge = Math.min(along, length - along) / (length * 0.22);
        const alpha = 0.2 * Math.min(1, edge);
        if (alpha <= 0.01) continue;
        const px = horizontal ? c.x + along : c.x + acrossPos;
        const py = horizontal ? c.y + acrossPos : c.y + along;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(horizontal ? (c.fx > 0 ? 0 : Math.PI) : c.fy > 0 ? Math.PI / 2 : -Math.PI / 2);
        ctx.strokeStyle = `rgba(140, 232, 222, ${alpha})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-6, -4.5);
        ctx.lineTo(0.5, 0);
        ctx.lineTo(-6, 4.5);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
  ctx.restore();
}

/* -------------------------------------------------------------- reef life */

/** One flat-vector tropical fish, facing +x, drawn at the origin. */
function drawFish(ctx: CanvasRenderingContext2D, s: number, bodyColor: string) {
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = palette.ink;

  // Tail, notched.
  ctx.beginPath();
  ctx.moveTo(-s * 0.58, 0);
  ctx.lineTo(-s * 1.05, -s * 0.46);
  ctx.lineTo(-s * 0.8, 0);
  ctx.lineTo(-s * 1.05, s * 0.46);
  ctx.closePath();
  ctx.fill();

  // Dorsal and pelvic fins.
  ctx.beginPath();
  ctx.moveTo(-s * 0.08, -s * 0.36);
  ctx.lineTo(s * 0.12, -s * 0.74);
  ctx.lineTo(s * 0.3, -s * 0.34);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-s * 0.02, s * 0.3);
  ctx.lineTo(s * 0.1, s * 0.58);
  ctx.lineTo(s * 0.26, s * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Body.
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.6, s * 0.4, 0, 0, Math.PI * 2);
  ctx.fillStyle = bodyColor;
  ctx.fill();

  // A pale flank stripe, the way a lot of reef fish break up their silhouette.
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.ellipse(-s * 0.04, 0, s * 0.13, s * 0.4, 0, 0, Math.PI * 2);
  ctx.fillStyle = palette.sand;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Eye.
  ctx.beginPath();
  ctx.arc(s * 0.4, -s * 0.05, s * 0.09, 0, Math.PI * 2);
  ctx.fillStyle = palette.ink;
  ctx.fill();
}

/**
 * Three loose schools of reef fish, drifting across the water column at
 * different depths and speeds. Positions come from the same deterministic
 * hash as the bubble field, so the reef never re-rolls between frames — and
 * freezes cleanly at t=0 for reduced motion, same as the kelp sway.
 */
function drawFishField(ctx: CanvasRenderingContext2D, t: number, motion: boolean, L: Layout) {
  const bodyColors = [palette.coral, categoryAccent.contact, categoryAccent.skills, palette.aqua];
  const schools = [
    { count: 3, size: 22, speed: 24, seed: 401, yMin: 0.2, yMax: 0.4 },
    { count: 4, size: 15, speed: 18, seed: 613, yMin: 0.38, yMax: 0.58 },
    { count: 3, size: 10, speed: 12, seed: 887, yMin: 0.56, yMax: 0.72 },
  ];

  for (const school of schools) {
    for (let i = 0; i < school.count; i++) {
      const seed = school.seed + i * 5;
      const dir = hash(seed) > 0.5 ? 1 : -1;
      const baseY = L.world.h * (school.yMin + hash(seed + 1) * (school.yMax - school.yMin));
      const span = L.world.w + 260;
      const travel = motion ? t * school.speed * dir : 0;
      const x = ((hash(seed + 2) * span + travel + span * 6) % span) - 130;
      const bob = motion ? Math.sin(t * 0.9 + hash(seed + 3) * 8) * 10 : 0;
      const wag = motion ? Math.sin(t * 6 + hash(seed + 4) * 6) * 0.12 : 0;

      ctx.save();
      ctx.translate(x, baseY + bob);
      ctx.scale(dir, 1);
      ctx.rotate(wag);
      drawFish(ctx, school.size, bodyColors[(school.seed + i) % bodyColors.length]);
      ctx.restore();
    }
  }
}

/* ----------------------------------------------------------------- seabed */

/**
 * Irregular closed hump sitting on the ground line. Drawn with quadratic
 * segments rather than straight ones — a nine-sided polygon reads as a
 * placeholder, a smooth asymmetric silhouette reads as rock.
 */
function boulderPath(
  ctx: CanvasRenderingContext2D,
  b: { x: number; y: number; rx: number; ry: number; tilt: number },
  seed: number,
  worldH: number,
) {
  const steps = 14;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = Math.PI + (Math.PI * i) / steps;
    const wob = 0.84 + hash(seed + i) * 0.3;
    pts.push({
      x: b.x + Math.cos(a + b.tilt) * b.rx * wob,
      y: b.y + Math.sin(a + b.tilt) * b.ry * wob,
    });
  }
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const mid = { x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 };
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mid.x, mid.y);
  }
  ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  ctx.lineTo(pts[pts.length - 1].x, worldH);
  ctx.lineTo(pts[0].x, worldH);
  ctx.closePath();
}

/** Smooth ridge line built from three sines — the far wall of the site. */
function ridgePath(
  ctx: CanvasRenderingContext2D,
  baseY: number,
  amp: number,
  seedPhase: number,
  L: Layout,
) {
  ctx.beginPath();
  ctx.moveTo(-10, L.world.h);
  ctx.lineTo(-10, baseY);
  for (let x = 0; x <= L.world.w + 20; x += 16) {
    const y =
      baseY +
      Math.sin(x * 0.0031 + seedPhase) * amp +
      Math.sin(x * 0.0079 + seedPhase * 2.3) * amp * 0.42 +
      Math.sin(x * 0.017 + seedPhase * 0.7) * amp * 0.16;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(L.world.w + 10, L.world.h);
  ctx.closePath();
}

function drawSeabed(ctx: CanvasRenderingContext2D, t: number, motion: boolean, L: Layout) {
  const rockFar = '#0d3a55';
  const rockMid = '#072b40';
  const rockGround = '#03151f';
  const rockBoulder = '#0a2c40';
  const rim = 'rgba(102, 226, 214, 0.42)';

  // Layer 1 — the far ridge. Lighter than the near rock, so the seabed reads
  // as receding depth instead of one flat black mass.
  const { pinnacle, kelp, boulders, seabedY } = L;
  ridgePath(ctx, L.world.h * 0.792, 46, 0.6, L);
  ctx.fillStyle = rockFar;
  ctx.globalAlpha = 0.5;
  ctx.fill();
  ctx.globalAlpha = 1;

  // The pinnacle belongs to the far layer, so it reads as distant rock rather
  // than a shard floating in front of the content.
  ctx.beginPath();
  ctx.moveTo(pinnacle.x - pinnacle.baseW, pinnacle.baseY);
  ctx.quadraticCurveTo(
    pinnacle.x - pinnacle.baseW * 0.72,
    (pinnacle.baseY + pinnacle.topY) * 0.5,
    pinnacle.x - pinnacle.topW,
    pinnacle.topY + 8,
  );
  ctx.quadraticCurveTo(pinnacle.x, pinnacle.topY - 6, pinnacle.x + pinnacle.topW, pinnacle.topY + 14);
  ctx.quadraticCurveTo(
    pinnacle.x + pinnacle.baseW * 0.78,
    (pinnacle.baseY + pinnacle.topY) * 0.5,
    pinnacle.x + pinnacle.baseW,
    pinnacle.baseY,
  );
  ctx.closePath();
  ctx.fillStyle = rockMid;
  ctx.fill();
  ctx.strokeStyle = 'rgba(102, 226, 214, 0.28)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Layer 2 — kelp, rooted behind the near rock so the bases are hidden.
  for (const k of kelp) {
    const sway = motion ? Math.sin(t * 0.8 + k.phase) * 26 : 0;
    const topX = k.x + k.lean * k.h + sway;
    const topY = seabedY - k.h;
    ctx.beginPath();
    ctx.moveTo(k.x - 7, seabedY + 6);
    ctx.quadraticCurveTo(k.x + sway * 0.3 - 10, topY + k.h * 0.42, topX, topY);
    ctx.quadraticCurveTo(k.x + sway * 0.3 + 10, topY + k.h * 0.42, k.x + 7, seabedY + 6);
    ctx.closePath();
    ctx.fillStyle = 'rgba(12, 80, 88, 0.9)';
    ctx.fill();
  }

  // Layer 3 — the near seabed: ground plane, then boulders on top of it, each
  // with a rim light along its upper edge so the silhouettes separate.
  for (let i = 0; i < boulders.length; i++) {
    boulderPath(ctx, boulders[i], i * 13 + 5, L.world.h);
    ctx.fillStyle = rockBoulder;
    ctx.fill();
    // Rim light, clipped to the boulder so only the upper edge catches it.
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = rim;
    ctx.lineWidth = 6;
    boulderPath(ctx, boulders[i], i * 13 + 5, L.world.h);
    ctx.stroke();
    ctx.restore();
  }

  // Ground plane last and darkest, so the boulder bases disappear into it and
  // the whole seabed keeps a legible near/far separation.
  ridgePath(ctx, seabedY + 22, 16, 2.1, L);
  ctx.fillStyle = rockGround;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(102, 226, 214, 0.22)';
  ctx.lineWidth = 4;
  ridgePath(ctx, seabedY + 22, 16, 2.1, L);
  ctx.stroke();
  ctx.restore();
}

/* ---------------------------------------------------------------- objects */

/**
 * The diver figure, drawn at the origin facing +x. One definition, used for
 * both the player character and the Profile node — the avatar and the person
 * are the same shape on purpose.
 */
function diverFigure(ctx: CanvasRenderingContext2D, kickPhase: number) {
  // Tank on the back.
  ctx.fillStyle = '#0A2E45';
  ctx.strokeStyle = palette.sand;
  ctx.lineWidth = 2;
  roundedRect(ctx, -20, -19, 26, 15, 7);
  ctx.fill();
  ctx.stroke();
  // Tank valve.
  ctx.fillStyle = palette.sand;
  roundedRect(ctx, -10, -23, 8, 5, 2);
  ctx.fill();

  // Fins — a dark foot pocket plus a tapered blade with a centre rail,
  // counter-phased so the kick reads as alternating strokes.
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(-24, side * 4);
    ctx.rotate(kickPhase * side * 0.55);

    ctx.fillStyle = palette.ink;
    roundedRect(ctx, -4, -6, 10, 12, 3);
    ctx.fill();

    ctx.fillStyle = palette.coral;
    ctx.beginPath();
    ctx.moveTo(4, -5);
    ctx.lineTo(-26, -11 + side * 2);
    ctx.lineTo(-30, side * 3);
    ctx.lineTo(4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = palette.plate;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(-25, side * 1);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Body: a tapered capsule, wider at the chest — the wetsuit.
  ctx.beginPath();
  ctx.moveTo(16, -11);
  ctx.quadraticCurveTo(26, 0, 16, 11);
  ctx.lineTo(-22, 7);
  ctx.quadraticCurveTo(-26, 0, -22, -7);
  ctx.closePath();
  ctx.fillStyle = palette.coral;
  ctx.fill();

  // Weight belt, cinched across the waist, with a small buckle.
  ctx.save();
  ctx.strokeStyle = palette.ink;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-8, -9);
  ctx.lineTo(-2, 9);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();
  ctx.fillStyle = palette.plate;
  roundedRect(ctx, -8, -3, 8, 6, 2);
  ctx.fill();

  // Arm, tucked forward, ending in a gloved hand.
  ctx.strokeStyle = palette.coral;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(6, 6);
  ctx.quadraticCurveTo(20, 10, 27, 3);
  ctx.stroke();
  ctx.fillStyle = palette.ink;
  ctx.beginPath();
  ctx.arc(27, 3, 4, 0, Math.PI * 2);
  ctx.fill();

  // Head, with dive mask, strap, and the regulator hose looping to the tank.
  ctx.beginPath();
  ctx.arc(22, -6, 11, 0, Math.PI * 2);
  ctx.fillStyle = palette.sand;
  ctx.fill();

  // Mask strap, arching from the mask over the crown to the nape.
  ctx.strokeStyle = palette.ink;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(19, -12);
  ctx.quadraticCurveTo(12, -19, 10, -8);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Mask lens.
  ctx.fillStyle = palette.plate;
  roundedRect(ctx, 18, -13, 14, 9, 3);
  ctx.fill();
  ctx.strokeStyle = palette.aqua;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1.5;
  roundedRect(ctx, 18, -13, 14, 9, 3);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Regulator hose from the mouth back to the tank.
  ctx.strokeStyle = palette.plate;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(20, 1);
  ctx.quadraticCurveTo(10, 6, 2, 2);
  ctx.stroke();

  // A couple of exhaled bubbles, rising past the mask.
  ctx.fillStyle = 'rgba(214, 246, 252, 0.75)';
  ctx.beginPath();
  ctx.arc(31, -8 + Math.sin(kickPhase) * 1.5, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(35, -13 + Math.sin(kickPhase) * 1.5, 1.3, 0, Math.PI * 2);
  ctx.fill();
}

/** Diver-down flag: red field with a white diagonal, on a short mast. */
function drawFlagGlyph(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  ctx.strokeStyle = palette.sand;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.95, cy - s * 0.72);
  ctx.lineTo(cx - s * 0.95, cy + s * 0.78);
  ctx.stroke();

  const fw = s * 1.7;
  const fh = s * 1.15;
  const fx = cx - s * 0.95;
  const fy = cy - s * 0.72;
  ctx.fillStyle = palette.coral;
  ctx.fillRect(fx, fy, fw, fh);
  ctx.save();
  ctx.beginPath();
  ctx.rect(fx, fy, fw, fh);
  ctx.clip();
  ctx.strokeStyle = palette.sand;
  ctx.lineWidth = s * 0.34;
  ctx.beginPath();
  ctx.moveTo(fx - s * 0.1, fy + fh + s * 0.1);
  ctx.lineTo(fx + fw + s * 0.1, fy - s * 0.1);
  ctx.stroke();
  ctx.restore();
}

function drawObject(ctx: CanvasRenderingContext2D, f: BodyFrame, state: RenderState) {
  const { obj } = f;
  const accent = categoryAccent[obj.category];
  const highlighted =
    state.hoveredId === obj.id || state.focusedId === obj.id || state.openId === obj.id;
  const sans = state.fonts.sans;
  const mono = state.fonts.mono;

  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(f.angle);
  // A short decaying wobble in the badge's own frame, so a clicked badge
  // answers the click before its panel has a chance to open.
  if (f.shake) {
    const swing = Math.sin(f.shake * Math.PI * 6) * (1 - f.shake);
    ctx.rotate(swing * 0.11);
    ctx.translate(swing * 6, 0);
  }
  // Everything below is drawn at design size; the layout's scale is applied
  // once here so label sizes, tick marks and connector pins shrink in step
  // with the silhouette instead of overflowing it on small screens.
  ctx.scale(state.layout.scale, state.layout.scale);

  const path = () => {
    switch (obj.shape) {
      case 'hex':
        hexPath(ctx, obj.baseR);
        break;
      case 'medallion':
      case 'gauge':
        ctx.beginPath();
        ctx.arc(0, 0, obj.baseR, 0, Math.PI * 2);
        break;
      case 'cartridge':
        cartridgePath(ctx, obj.baseHw, obj.baseHh);
        break;
      case 'buoy':
        roundedRect(ctx, -obj.baseHw, -obj.baseHh, obj.baseHw * 2, obj.baseHh * 2, 14);
        break;
    }
  };

  // Flat long shadow — the only depth cue in the whole scene.
  ctx.save();
  ctx.translate(6, 8);
  path();
  ctx.fillStyle = 'rgba(2, 12, 22, 0.42)';
  ctx.fill();
  ctx.restore();

  // Silhouette.
  path();
  ctx.fillStyle = palette.plate;
  ctx.fill();
  ctx.lineWidth = highlighted ? 4 : 2.5;
  ctx.strokeStyle = highlighted ? palette.coral : accent;
  ctx.stroke();

  // Keyboard focus gets its own dashed ring, distinct from mouse hover, and is
  // drawn at the object's live position rather than at the proxy button.
  if (state.focusedId === obj.id) {
    const k = (obj.baseR + 14) / obj.baseR;
    ctx.save();
    ctx.scale(k, k);
    path();
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 3 / k;
    ctx.strokeStyle = palette.coral;
    ctx.stroke();
    ctx.restore();
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (obj.shape === 'gauge') {
    // Valve nub, so the silhouette is a gauge and not a bare circle.
    ctx.fillStyle = palette.plate;
    ctx.strokeStyle = highlighted ? palette.coral : accent;
    ctx.lineWidth = 2.5;
    roundedRect(ctx, -8, -obj.baseR - 13, 16, 16, 4);
    ctx.fill();
    ctx.stroke();

    // Tick ring: every third tick is long. Real detail, cheap to draw.
    ctx.strokeStyle = accent;
    for (let i = 0; i < 36; i++) {
      const a = (Math.PI * 2 * i) / 36 - Math.PI / 2;
      const long = i % 3 === 0;
      const r0 = obj.baseR - (long ? 13 : 8);
      const r1 = obj.baseR - 4;
      ctx.globalAlpha = long ? 0.7 : 0.35;
      ctx.lineWidth = long ? 2.2 : 1.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Index mark at twelve o'clock.
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(0, -obj.baseR + 5);
    ctx.lineTo(-5, -obj.baseR + 15);
    ctx.lineTo(5, -obj.baseR + 15);
    ctx.closePath();
    ctx.fill();

    const { lines, size } = fitLines(ctx, obj.label, sans, '600', 19, 12, obj.baseR * 1.5);
    ctx.fillStyle = palette.sand;
    ctx.font = `600 ${size}px ${sans}`;
    lines.forEach((line, i) => {
      ctx.fillText(line, 0, (i - (lines.length - 1) / 2) * (size * 1.15) + 3);
    });
  }

  if (obj.shape === 'medallion') {
    ctx.save();
    ctx.translate(4, -obj.baseR * 0.22);
    ctx.rotate(-0.14);
    ctx.scale(1.28, 1.28);
    diverFigure(ctx, 0.25);
    ctx.restore();
    ctx.fillStyle = palette.sand;
    ctx.font = `600 22px ${sans}`;
    ctx.fillText(obj.label, 0, obj.baseR * 0.42);
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, obj.baseR - 11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  if (obj.shape === 'hex') {
    if (obj.sublabel) {
      ctx.fillStyle = accent;
      ctx.font = `500 15px ${mono}`;
      ctx.fillText(obj.sublabel, 0, -obj.baseHh * 0.44);
    }
    const { lines, size } = fitLines(ctx, obj.label, sans, '600', 24, 14, obj.baseR * 1.28);
    ctx.fillStyle = palette.sand;
    ctx.font = `600 ${size}px ${sans}`;
    lines.forEach((line, i) => {
      ctx.fillText(line, 0, (i - (lines.length - 1) / 2) * (size * 1.16) + 4);
    });
    // Ruled lines: the "entry / record" motif.
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    [26, 18, 10].forEach((w, i) => {
      ctx.beginPath();
      ctx.moveTo(-w, obj.baseHh * 0.5 + i * 7 - 4);
      ctx.lineTo(w, obj.baseHh * 0.5 + i * 7 - 4);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }

  if (obj.shape === 'cartridge') {
    // Connector pins along the bottom edge.
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.75;
    for (let i = -2; i <= 2; i++) {
      ctx.fillRect(i * 17 - 5, obj.baseHh - 11, 10, 7);
    }
    ctx.globalAlpha = 1;
    // Label window.
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 2;
    roundedRect(ctx, -obj.baseHw + 14, -obj.baseHh + 16, obj.baseHw * 2 - 28, obj.baseHh * 2 - 44, 7);
    ctx.stroke();
    ctx.globalAlpha = 1;

    let textY = 2;
    if (obj.sublabel) {
      ctx.font = `500 13px ${mono}`;
      const w = ctx.measureText(obj.sublabel).width + 16;
      ctx.fillStyle = palette.coral;
      roundedRect(ctx, -w / 2, -obj.baseHh + 22, w, 20, 10);
      ctx.fill();
      ctx.fillStyle = palette.ink;
      ctx.fillText(obj.sublabel, 0, -obj.baseHh + 33);
      textY = 14;
    }
    const { lines, size } = fitLines(ctx, obj.label, sans, '600', 23, 14, obj.baseHw * 1.72);
    ctx.fillStyle = palette.sand;
    ctx.font = `600 ${size}px ${sans}`;
    lines.forEach((line, i) => {
      ctx.fillText(line, 0, textY + (i - (lines.length - 1) / 2) * (size * 1.15));
    });
  }

  if (obj.shape === 'buoy') {
    drawFlagGlyph(ctx, 0, -obj.baseHh * 0.3, 22);
    ctx.fillStyle = palette.sand;
    ctx.font = `600 22px ${sans}`;
    ctx.fillText(obj.label, 0, obj.baseHh * 0.56);
  }

  ctx.restore();
}

/* ------------------------------------------------------------------ diver */

/**
 * Side-profile diver. Drawn along +x and rotated to the heading, so the whole
 * figure is one coherent silhouette rather than a stack of primitives.
 */
function drawDiver(ctx: CanvasRenderingContext2D, state: RenderState) {
  const d = state.diver;
  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.rotate(d.angle);
  // Keep the diver upright-ish when swimming leftwards.
  const flip = Math.abs(d.angle) > Math.PI / 2 ? -1 : 1;
  ctx.scale(1, flip);

  const kickPhase = Math.sin(state.t * (d.kick > 0 ? 13 : 4.5)) * (d.kick > 0 ? 1 : 0.35);
  diverFigure(ctx, kickPhase);

  ctx.restore();
}

function drawBubbles(ctx: CanvasRenderingContext2D, bubbles: Particle[]) {
  for (const b of bubbles) {
    const alpha = Math.max(0, Math.min(1, b.life)) * 0.55;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(214, 246, 252, ${alpha * 0.3})`;
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = `rgba(214, 246, 252, ${alpha})`;
    ctx.stroke();
  }
}

/* ------------------------------------------------------------------ impact */

/**
 * Hit feedback. A weak bump gets a coral ring and, because "nothing happened"
 * is the worst possible answer, an explicit instruction; a strong one gets a
 * white shockwave and is already opening its panel.
 */
function drawFlashes(ctx: CanvasRenderingContext2D, state: RenderState) {
  const s = state.layout.scale;
  for (const flash of state.flashes) {
    const life = flash.strong ? 0.45 : 0.7;
    const k = Math.min(1, flash.age / life);
    if (k >= 1) continue;
    const alpha = (1 - k) ** 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(flash.x, flash.y, (14 + k * 150) * s, 0, Math.PI * 2);
    ctx.lineWidth = (7 - k * 5) * s;
    ctx.strokeStyle = flash.strong
      ? `rgba(245, 239, 227, ${alpha})`
      : `rgba(255, 111, 78, ${alpha})`;
    ctx.stroke();
    ctx.restore();

    if (flash.strong) continue;

    // Caption on an opaque plate: text is never set on the raw water.
    const frame = state.bodies.find((b) => b.obj.id === flash.id);
    if (!frame) continue;
    const place = state.layout.placements.get(flash.id);
    const lift = (place ? place.hh : 60) + 34 * s;
    ctx.save();
    ctx.translate(frame.x, frame.y - lift);
    ctx.scale(s, s);
    ctx.globalAlpha = Math.min(1, alpha * 1.6);
    ctx.font = `500 19px ${state.fonts.mono}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = 'Swim faster!';
    const w = ctx.measureText(text).width + 26;
    roundedRect(ctx, -w / 2, -17, w, 34, 17);
    ctx.fillStyle = palette.coral;
    ctx.fill();
    ctx.fillStyle = palette.ink;
    ctx.fillText(text, 0, 1);
    ctx.restore();
  }
}

/** Boost reserve, as an arc under the diver. Hidden while it is full. */
function drawStamina(ctx: CanvasRenderingContext2D, state: RenderState) {
  if (state.stamina >= 0.999) return;
  const d = state.diver;
  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.lineCap = 'round';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(6, 27, 44, 0.75)';
  ctx.beginPath();
  ctx.arc(0, 0, 34, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  ctx.strokeStyle = state.boosting ? palette.coral : palette.aqua;
  ctx.beginPath();
  ctx.arc(0, 0, 34, Math.PI * 0.15, Math.PI * (0.15 + 0.7 * state.stamina));
  ctx.stroke();
  ctx.restore();
}

/** Touch joystick, drawn in screen space so it never scales with the world. */
function drawJoystick(ctx: CanvasRenderingContext2D, state: RenderState) {
  const j = state.joystick;
  if (!j) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(j.x, j.y);
  ctx.beginPath();
  ctx.arc(0, 0, 48, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(6, 27, 44, 0.45)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(70, 212, 200, 0.55)';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(j.dx * 48, j.dy * 48, 20, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(245, 239, 227, 0.85)';
  ctx.fill();
  ctx.restore();
}

/* ------------------------------------------------------------------- main */

export function renderScene(
  ctx: CanvasRenderingContext2D,
  state: RenderState,
  view: { scale: number; offsetX: number; offsetY: number; cssW: number; cssH: number },
) {
  const L = state.layout;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, view.cssW, view.cssH);
  ctx.fillStyle = palette.waterDeep;
  ctx.fillRect(0, 0, view.cssW, view.cssH);
  ctx.restore();

  ctx.save();
  ctx.translate(view.offsetX, view.offsetY);
  ctx.scale(view.scale, view.scale);
  ctx.beginPath();
  ctx.rect(0, 0, L.world.w, L.world.h);
  ctx.clip();

  const t = state.motion ? state.t : 0;

  drawWater(ctx, L);
  drawShafts(ctx, t, L);
  drawSurface(ctx, t, L);
  if (state.motion) drawBubbleField(ctx, t, L);
  drawCurrents(ctx, t, state.motion, L);
  drawSeabed(ctx, t, state.motion, L);
  drawFishField(ctx, t, state.motion, L);

  for (const f of state.bodies) drawObject(ctx, f, state);

  drawBubbles(ctx, state.bubbles);
  drawStamina(ctx, state);
  drawDiver(ctx, state);
  drawFlashes(ctx, state);

  ctx.restore();

  drawJoystick(ctx, state);
}
