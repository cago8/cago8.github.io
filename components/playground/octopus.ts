/**
 * The octopus: a background creature on its own clock, and the only thing in
 * the scene that hides from you. Every so often it swims in from an edge as an
 * unmissable purple, plants itself against a badge, goes completely still, and
 * bleeds its colour away into that badge and the water around it until there
 * is nothing left to see — using the badge as a rock to disappear against.
 *
 * Like the reef fields in `render.ts` it is a timeline, not a state machine —
 * a pure function of scene time. That is what keeps it free of per-frame
 * allocation, immune to resizes, and impossible to desync from the physics
 * loop. The one thing it does not get from the clock is which show to run:
 * that comes from a seed the Playground rolls once per mount, so the sequence
 * is different for every visitor rather than identical on every page load.
 */
import type { Layout, Placement } from './layout';
import type { SceneShape } from './scene';
import { categoryAccent, mixRgb, palette, rgbOf, toneOf, waterAt, type Rgb } from './palette';
// Type-only, so this never becomes a runtime cycle with the renderer.
import type { BodyFrame } from './render';

/**
 * One appearance per slot, starting somewhere in the first `JITTER` seconds of
 * it. Two consecutive starts therefore land 10–15s apart without anyone having
 * to walk the timeline to find out where cycle N began.
 */
const SLOT = 12.5;
const JITTER = 2.5;

const SWIM = 4;
const SETTLE = 1.1;
/**
 * Camouflage runs in two stages rather than one. The colour goes first, at a
 * near-steady alpha, and only once it has arrived does the shape fade. Running
 * the two together is what made a deliberate change of colour read as nothing
 * but a fade: by the time the purple was halfway gone so was the octopus, and
 * a viewer only ever saw it dimming.
 */
const CAMO = 2.2;
const CAMO_SHIFT = 0.65;
const HOLD = 2.6;
/** Kept under `SLOT - JITTER`, so one visit always ends before the next opens. */
const ACTIVE = SWIM + SETTLE + CAMO + HOLD;

/** Cap on the body's half-span; it also shrinks to suit the badge it picks. */
const SIZE = 30;
/** How far outside the world it starts, in world units. */
const OFFSCREEN = 190;
/** Plainly there while it is crossing the scene, gone by the end of the visit. */
const SWIM_ALPHA = 0.85;
/**
 * What it eases back to while the colour is still working — enough to read as
 * something settling down, not enough to swallow the change of colour.
 */
const HELD_ALPHA = 0.72;
const HIDDEN_ALPHA = 0.05;
/**
 * What it swims in as. Deliberately not one of `palette`'s tokens: nothing
 * else in the scene is this colour, which is the point — it is the one thing
 * meant to be caught. It is never drawn behind text and has no CSS
 * counterpart, so it carries no contrast pairing and belongs to the creature.
 */
const PURPLE: Rgb = [164, 92, 232];
/**
 * How far outside the badge's edge the octopus holds station, in body
 * half-spans. The mantle reaches 0.56 half-spans back past the centre, so
 * anything under that overlaps the silhouette: at 0.22 the body is plainly
 * moulded onto the edge and the arm roots sit right on the surface. Holding
 * further out than the mantle is long is what made it read as floating.
 */
const TUCK = 0.22;

export interface OctopusFrame {
  x: number;
  y: number;
  /** Half-span of the body; also the clearance it keeps from badges. */
  s: number;
  /** Facing, ±1, with `angle` the heading to rotate to inside that mirror. */
  flip: number;
  angle: number;
  alpha: number;
  /** 1 = its own colouring, 0 = exactly the water's. */
  reveal: number;
  /** 1 = swimming, arms swept back; 0 = settled, arms holding the badge. */
  trail: number;
  phase: number;
  /** The badge it is hiding against, and whose tone it camouflages into. */
  target: BodyFrame;
  /**
   * That badge's centre in the octopus's own frame, and how far its edge sits
   * from that centre at the point of contact. The gripping arms steer by these
   * — treating the badge as a circle through the contact point, which near the
   * spot an arm is lying on is as true for a hexagon as for a dial.
   */
  bx: number;
  by: number;
  br: number;
}

/** Joints per arm. Four is enough for the bend to read as a curve. */
const SEGMENTS = 4;
/** How far each joint lags the one above it, in radians of the wave. */
const PHASE_LAG = 0.75;
/**
 * Per-arm wave parameters. Eight arms on one clock look like a machine, so
 * each gets its own amplitude, rate and offset. Frozen at module scope: these
 * never change, and the draw path should not be allocating anything.
 */
const ARMS = [
  { amp: 0.3, speed: 1.0, phase: 0 },
  { amp: 0.22, speed: 1.21, phase: 1.9 },
  { amp: 0.35, speed: 0.88, phase: 3.4 },
  { amp: 0.26, speed: 1.12, phase: 0.7 },
  { amp: 0.31, speed: 0.94, phase: 4.6 },
  { amp: 0.2, speed: 1.28, phase: 2.5 },
  { amp: 0.34, speed: 1.05, phase: 5.5 },
  { amp: 0.24, speed: 0.83, phase: 1.2 },
] as const;
/**
 * Which arms take hold once it settles, `null` for the five that do not. An
 * octopus on a rock grips with the arms that reach it and lets the rest hang,
 * so three of the eight take hold, split two one way round the badge and one
 * the other — they lie along the edge from both sides of the contact point
 * instead of stacking on one.
 *
 * `reach` is the arm's length in body half-spans and `curl` how hard its tip
 * hooks under the badge. Both differ across the three, because three arms
 * curling to matching depth reads as a clamp rather than as something holding
 * on. What has to stay the arm's own is the curl: a badge's rim is nearly
 * straight at this scale, so an arm that only followed it would come out as a
 * long straight whisker however far round it went.
 */
const GRIP = [
  null,
  null,
  { round: -1, reach: 2.15, curl: 1.2 },
  { round: -1, reach: 1.7, curl: 0.78 },
  { round: 1, reach: 1.95, curl: 1 },
  null,
  null,
  null,
] as const;
/** How hard a gripping joint is pulled onto the badge's curve, once settled. */
const GRIP_PULL = 0.82;

/** The same deterministic-noise trick the reef fields use, on its own
 *  constants so the two streams never fall into step. */
function rand(n: number) {
  const s = Math.sin(n * 78.233) * 27183.845;
  return s - Math.floor(s);
}

/** Which edge it comes in from, and where along that edge. */
function entryPoint(seed: number, L: Layout) {
  const along = (0.12 + rand(seed + 0.77) * 0.76);
  switch (Math.floor(rand(seed + 0.51) * 4) % 4) {
    case 0:
      return { x: along * L.world.w, y: -OFFSCREEN };
    case 1:
      return { x: L.world.w + OFFSCREEN, y: along * L.world.h };
    case 2:
      return { x: along * L.world.w, y: L.world.h + OFFSCREEN };
    default:
      return { x: -OFFSCREEN, y: along * L.world.h };
  }
}

/**
 * How far out the badge's own outline sits in direction `a`. The octopus is
 * meant to be touching that outline, so an ellipse through the half-extents is
 * not close enough: at the corner of a project card it falls some fifteen
 * pixels inside the drawn edge, which is exactly the gap that reads as
 * floating. Each silhouette gets the boundary the renderer actually draws.
 */
export function badgeEdge(shape: SceneShape, place: Placement, a: number) {
  switch (shape) {
    case 'medallion':
    case 'gauge':
      return place.r;
    case 'hex': {
      // Flat-top regular hexagon: fold the direction onto one edge's normal
      // and the boundary is that edge, at the apothem, leaning away by `off`.
      const off = ((((a % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3)) - Math.PI / 6);
      return (place.r * Math.sqrt(3)) / 2 / Math.cos(off);
    }
    default: {
      // Cartridges and buoys are boxes; their corner rounding is a few pixels
      // on a shape tens across, and erring outwards there is harmless.
      const c = Math.abs(Math.cos(a));
      const s = Math.abs(Math.sin(a));
      return Math.min(c > 1e-6 ? place.hw / c : Infinity, s > 1e-6 ? place.hh / s : Infinity);
    }
  }
}

/**
 * Where against the badge it hides, expressed in the badge's own frame so that
 * dragging or spinning the badge carries the octopus with it. The side it
 * picks is the one facing where it came in from — it tucks into the near edge
 * rather than swimming around the badge to reach the far one, which also keeps
 * its heading roughly constant from approach to rest.
 */
function anchorOffset(
  seed: number,
  size: number,
  from: { x: number; y: number },
  shape: SceneShape,
  place: Placement,
  L: Layout,
) {
  let a = Math.atan2(from.y - place.y, from.x - place.x);
  // A wander of up to ±40° along the silhouette, so it does not always tuck
  // into the same spot on the same approach.
  a += (rand(seed + 7.3) - 0.5) * 1.4;

  const reach = badgeEdge(shape, place, a) + size * TUCK;
  // A badge pinned against a wall has no room on the side facing it; hide on
  // the opposite side rather than half off the edge of the world.
  const x = place.x + Math.cos(a) * reach;
  const y = place.y + Math.sin(a) * reach;
  const margin = size * 1.6;
  const cramped =
    x < margin || x > L.world.w - margin || y < margin || y > L.world.h - margin;

  // Every one of these silhouettes is symmetric through its centre, so the
  // flip leaves `edge` and `reach` alone.
  return { a: cramped ? a + Math.PI : a, reach, edge: reach - size * TUCK };
}

/**
 * Reused by `armJoints`. Eight arms rebuilt every frame would otherwise mean
 * eight throwaway arrays per frame, forever, for a creature nobody is meant to
 * notice.
 */
const jointBuf = new Float64Array((SEGMENTS + 1) * 2);

/**
 * One arm as a bone chain, in the octopus's own frame: `SEGMENTS + 1` joints
 * as flat x,y pairs, root first.
 *
 * Each joint's rotation is applied on top of the one above it and then the
 * segment steps off the previous joint's end, so a bend near the root carries
 * the whole rest of the arm with it — the arm curves rather than swinging as
 * one rigid piece. Every joint runs the same sine one `PHASE_LAG` further
 * behind, which is what sends a travelling wave down the length instead of
 * flexing it all at once, and the amplitude grows towards the tip so the end
 * whips while the root barely moves.
 *
 * Returns the shared buffer — read it or copy it before the next call.
 */
export function armJoints(f: OctopusFrame, index: number): Float64Array {
  const arm = ARMS[index];
  const s = f.s;
  const fan = (index / 7) * 2 - 1;
  const grip = GRIP[index];
  // 0 while swimming, 1 once it has taken hold.
  const hold = 1 - f.trail;
  // Big strokes under way. Once it takes hold the three on the badge go nearly
  // still — locked on — while the five with nothing to hold drift twice as
  // loosely, which is most of what tells the two groups apart at a glance.
  const swing = f.trail * 1.1 + hold * (grip ? 0.22 : 0.9);
  // Outer arms run longer under way, the way the fringe of a real fan does; a
  // gripping arm reaches out a little further than that as it takes hold.
  const streamed = s * (1.5 + Math.abs(fan) * 0.45 - f.trail * 0.15);
  const planted = grip ? s * grip.reach : streamed;
  const segLen = (streamed + (planted - streamed) * hold) / SEGMENTS;

  let x = -s * 0.2;
  let y = fan * s * 0.24;
  // Under way the arms stream back along the body in a narrow fan. Once it
  // takes hold the three grippers keep pointing back — which now means
  // straight at the badge, the body having turned its back on it to plant
  // them — while the other five swing out past square, so they trail off the
  // sides instead of burrowing behind the badge or joining one flat fan.
  const side = fan >= 0 ? 1 : -1;
  const along = Math.PI - fan * 0.62;
  const onto = grip
    ? Math.PI - fan * 1.12
    : Math.PI - side * (1.15 + Math.abs(fan) * 0.8);
  let a = along + (onto - along) * hold;
  jointBuf[0] = x;
  jointBuf[1] = y;

  for (let k = 0; k < SEGMENTS; k++) {
    const grow = 0.3 + (k / (SEGMENTS - 1)) * 0.7;
    a +=
      arm.amp * grow * swing * Math.sin(f.phase * arm.speed - k * PHASE_LAG + arm.phase) +
      // A standing curl on top of the wave. The arms with nothing to hold get
      // much the more of it, so they hang in a lazy droop rather than sticking
      // out straight beside the three that are working.
      fan * (grip ? 0.12 : 0.42) * hold * grow;

    if (grip && hold > 0) {
      // Feel for the badge's surface: aim this segment along the arc through
      // wherever the joint has landed, leaning in or out by however far off
      // the surface that is. Steering per joint rather than once at the root
      // is what makes the arm lie along the curve instead of at a tangent to
      // it — the further round it gets, the further round it aims.
      const rx = x - f.bx;
      const ry = y - f.by;
      // The line it is aiming for rides clear of the outline and then crosses
      // it near the tip. Badges draw over the octopus, so this is what decides
      // how much of the arm a visitor sees: keeping the length of it outside
      // leaves the curl visible, and letting the last joint cross under is
      // what reads as a hand closing over the edge rather than resting on it.
      // How deep each arm crosses is its own, so the three do not clamp.
      const down = k / (SEGMENTS - 1);
      const lie = f.br + s * (0.4 - grip.curl * 1.05 * down * down * down);
      const off = Math.max(-1, Math.min(1, (Math.hypot(rx, ry) - lie) / segLen));
      // The lean off the tangent is allowed to grow down the arm, so the last
      // joint can turn nearly square in and put its tip under the outline.
      const want = Math.atan2(ry, rx) + grip.round * (Math.PI / 2 + off * (0.9 + 0.7 * down));
      let d = want - a;
      d -= Math.round(d / (Math.PI * 2)) * Math.PI * 2;
      a += d * GRIP_PULL * hold;
    }

    x += Math.cos(a) * segLen;
    y += Math.sin(a) * segLen;
    jointBuf[k * 2 + 2] = x;
    jointBuf[k * 2 + 3] = y;
  }
  return jointBuf;
}

/** Mirrors a world heading into the half-turn the sprite is actually drawn for. */
function mirrored(heading: number, flip: number) {
  return Math.atan2(Math.sin(heading), flip * Math.cos(heading));
}

/**
 * Where the octopus is at scene time `t`, or null while nothing is on stage.
 * `bodies` are the badges at their live positions — the anchor is resolved
 * against them every frame, so a badge that gets dragged or spun takes the
 * octopus hiding against it along for the ride.
 */
export function octopusFrame(
  t: number,
  seed: number,
  L: Layout,
  bodies: readonly BodyFrame[],
): OctopusFrame | null {
  const cycle = Math.floor(t / SLOT);
  const cycleSeed = seed + cycle * 1.618;
  const local = t - (cycle * SLOT + rand(cycleSeed) * JITTER);
  if (local < 0 || local >= ACTIVE || bodies.length === 0) return null;

  const target = bodies[Math.floor(rand(cycleSeed + 3.9) * bodies.length) % bodies.length];
  const place = L.placements.get(target.obj.id);
  if (!place) return null;

  // Sized against what it is hiding behind: a gauge on a phone is a smaller
  // rock than a hexagon on a desktop, and the octopus has to fit either.
  const s = Math.min(
    SIZE * (0.85 + rand(cycleSeed + 2.2) * 0.3),
    // The cap is applied last, so the per-visit variation can never push it
    // back up past what the badge can actually cover.
    Math.min(place.hw, place.hh) * 0.62,
  );
  const from = entryPoint(cycleSeed, L);
  // The offset is fixed in the badge's frame; the badge's own rotation and
  // live centre turn it back into a world position.
  const { a, reach, edge } = anchorOffset(cycleSeed, s, from, target.obj.shape, place, L);
  const held = a + target.angle;
  const to = {
    x: target.x + Math.cos(held) * reach,
    y: target.y + Math.sin(held) * reach,
  };

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy) || 1;
  const eased = 1 - Math.pow(1 - Math.min(1, local / SWIM), 3);
  // A weave across the line of travel, unwound by the time it arrives, so it
  // does not cross the scene on a ruler.
  const sway = Math.sin(local * 2.1) * s * 0.8 * (1 - eased);
  const x = from.x + dx * eased - (dy / dist) * sway;
  const y = from.y + dy * eased + (dx / dist) * sway;

  // Head-first while it travels, then swinging its back to the badge as it
  // arrives so that the arms — which trail off the back of the body — are what
  // lands on the silhouette, the way an octopus flares and plants itself on a
  // rock. Since it came in at this side of the badge that is close to a half
  // turn, so the settle is smoothed rather than run off straight.
  const heading = Math.atan2(dy, dx);
  const flip = Math.cos(heading) >= 0 ? 1 : -1;
  const ease = clamp01((local - SWIM) / SETTLE);
  const settle = ease * ease * (3 - 2 * ease);
  let turn = mirrored(held, flip) - mirrored(heading, flip);
  turn -= Math.round(turn / (Math.PI * 2)) * Math.PI * 2;
  const angle = mirrored(heading, flip) + turn * settle;

  // The badge in the octopus's own drawing frame: undo the translate, the
  // mirror and the rotation, in that order.
  const c = Math.cos(angle);
  const sn = Math.sin(angle);
  const mx = flip * (target.x - x);
  const my = target.y - y;

  // The colour goes over the first part of the camouflage and the shape over
  // what is left of it, so each is given the stage on its own.
  const camo = clamp01((local - SWIM - SETTLE) / CAMO);
  const shift = smoothstep(clamp01(camo / CAMO_SHIFT));
  const fade = smoothstep(clamp01((camo - CAMO_SHIFT) / (1 - CAMO_SHIFT)));
  const steady = SWIM_ALPHA + (HELD_ALPHA - SWIM_ALPHA) * shift;

  return {
    x,
    y,
    s,
    flip,
    angle,
    target,
    alpha: steady + (HIDDEN_ALPHA - steady) * fade,
    reveal: 1 - shift,
    trail: 1 - settle,
    // The wave winds down as it takes hold and then stops dead: something
    // camouflaging goes still, and arms left rippling would give away the
    // whole trick. `settle` is a smoothstep, so integrating what is left of it
    // gives the phase the arms had actually reached when they stopped, which
    // is what freezes them mid-stroke rather than snapping them to zero.
    phase: (Math.min(local, SWIM) + SETTLE * (ease - ease ** 3 + ease ** 4 / 2)) * 2.4,
    bx: mx * c + my * sn,
    by: -mx * sn + my * c,
    br: edge,
  };
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

function smoothstep(v: number) {
  return v * v * (3 - 2 * v);
}

/**
 * Where it ends up: half the badge it is holding — the plate every badge is
 * filled with, carrying a good deal of the outline colour that rings it — and
 * half the water it is hanging in, so it dissolves into the two at once
 * instead of picking one and standing out against the other.
 */
function hidingTone(f: OctopusFrame, L: Layout): Rgb {
  const badge = mixRgb(
    rgbOf(palette.plate),
    rgbOf(categoryAccent[f.target.obj.category]),
    0.3,
  );
  return mixRgb(badge, waterAt(f.y / L.world.h), 0.5);
}

/**
 * The body's colour at this instant. Exported so that a change of colour can
 * be checked as a change of colour, rather than inferred from the alpha it is
 * meant to be distinguishable from.
 */
export function bodyTone(f: OctopusFrame, L: Layout): Rgb {
  return mixRgb(hidingTone(f, L), PURPLE, f.reveal);
}

/**
 * Draws the octopus for scene time `t`, if it is on stage. The only thing that
 * moves once it has taken hold is the colour: it starts purple and ends as
 * half the badge it is gripping and half the water at its own depth, so
 * "camouflaged" is literally what is behind it rather than a guess at it, and
 * the alpha fade lands on a shape that had already all but gone.
 */
export function drawOctopus(
  ctx: CanvasRenderingContext2D,
  t: number,
  seed: number,
  L: Layout,
  bodies: readonly BodyFrame[],
) {
  const f = octopusFrame(t, seed, L, bodies);
  if (!f) return;

  const hiding = hidingTone(f, L);
  const body = bodyTone(f, L);
  const eye = mixRgb(hiding, rgbOf(palette.coral), f.reveal * 0.9);
  const pupil = mixRgb(hiding, rgbOf(palette.ink), f.reveal);
  const s = f.s;

  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.flip, 1);
  ctx.rotate(f.angle);
  ctx.globalAlpha = f.alpha;
  ctx.fillStyle = toneOf(body);

  // Eight jointed arms, roots first so the mantle covers them.
  ctx.strokeStyle = toneOf(body);
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const joints = armJoints(f, i);
    for (let k = 0; k < SEGMENTS; k++) {
      // Round caps let the segments overlap into one continuous taper.
      ctx.lineWidth = s * 0.26 * (1 - (k / SEGMENTS) * 0.82);
      ctx.beginPath();
      ctx.moveTo(joints[k * 2], joints[k * 2 + 1]);
      ctx.lineTo(joints[k * 2 + 2], joints[k * 2 + 3]);
      ctx.stroke();
    }
  }

  // The mantle: one sac, longer than it is deep, so the silhouette has a
  // direction. Two circles here would only ever read as a head.
  ctx.beginPath();
  ctx.ellipse(s * 0.3, 0, s * 0.86, s * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();

  for (const side of [-1, 1]) {
    // Eyes bulge off the sides of the head rather than sitting flat on it.
    ctx.fillStyle = toneOf(body);
    ctx.beginPath();
    ctx.ellipse(s * 0.34, side * s * 0.46, s * 0.24, s * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = toneOf(eye);
    ctx.beginPath();
    ctx.ellipse(s * 0.36, side * s * 0.5, s * 0.15, s * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    // Octopus pupils are horizontal bars, and it is the one detail that keeps
    // the silhouette from reading as a squid.
    ctx.fillStyle = toneOf(pupil);
    ctx.fillRect(s * 0.27, side * s * 0.5 - s * 0.025, s * 0.18, s * 0.05);
  }

  ctx.restore();
}
