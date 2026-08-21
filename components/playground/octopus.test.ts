import { describe, expect, it } from 'vitest';
import { buildLayout, type Layout } from './layout';
import { armJoints, badgeEdge, bodyTone, octopusFrame, type OctopusFrame } from './octopus';
import type { BodyFrame } from './render';
import { sceneObjects } from './scene';

/**
 * The octopus is a timeline rather than a state machine, so its whole
 * behaviour is observable by sampling `octopusFrame` across a stretch of
 * scene time. These tests walk four minutes of it at 60fps and assert what a
 * visitor would see: something arrives from off-screen, tucks itself against
 * the edge of a badge, and takes on that badge's colouring until it is gone.
 */
const ASPECTS = [0.5, 0.75, 1.3, 1.78, 2.6];
const STEP = 1 / 60;
const SPAN = 240;

interface Visit {
  start: number;
  frames: OctopusFrame[];
}

/** The badges where the layout settles them, standing in for live physics. */
function settled(layout: Layout): BodyFrame[] {
  return sceneObjects.map((obj) => {
    const p = layout.placements.get(obj.id)!;
    return { obj, x: p.x, y: p.y, angle: 0 };
  });
}

/** Every contiguous run of frames where the octopus is on stage. */
function visits(layout: Layout, seed: number, bodies = settled(layout)): Visit[] {
  const found: Visit[] = [];
  let open: Visit | null = null;
  for (let i = 0; i * STEP < SPAN; i++) {
    const t = i * STEP;
    const frame = octopusFrame(t, seed, layout, bodies);
    if (frame) {
      if (!open) {
        open = { start: t, frames: [] };
        found.push(open);
      }
      open.frames.push(frame);
    } else {
      open = null;
    }
  }
  // The sampling window almost certainly cuts the last visit in half; a
  // half-visit is a fact about the window, not about the octopus.
  if (open) found.pop();
  return found;
}

function offscreen(frame: OctopusFrame, layout: Layout) {
  return (
    frame.x < 0 || frame.x > layout.world.w || frame.y < 0 || frame.y > layout.world.h
  );
}

/** How far outside its badge's silhouette a resting octopus sits. */
function standoff(rest: OctopusFrame, layout: Layout) {
  const p = layout.placements.get(rest.target.obj.id)!;
  const dx = rest.x - p.x;
  const dy = rest.y - p.y;
  const edge = badgeEdge(rest.target.obj.shape, p, Math.atan2(dy, dx));
  return Math.hypot(dx, dy) - edge;
}

/**
 * How far an arm turns between its first segment and its last — the arm's own
 * curl, which is what a viewer reads, rather than how much of the badge's rim
 * it happens to span.
 */
function armBend(joints: Float64Array) {
  const dir = (k: number) =>
    Math.atan2(joints[k * 2 + 3] - joints[k * 2 + 1], joints[k * 2 + 2] - joints[k * 2]);
  let total = 0;
  for (let k = 1; k < 4; k++) {
    let turn = dir(k) - dir(k - 1);
    turn -= Math.round(turn / (Math.PI * 2)) * Math.PI * 2;
    total += turn;
  }
  return Math.abs(total);
}

/** The last frame of each visit — settled, camouflaged, holding on. */
function resting(found: Visit[]) {
  return found.map((v) => v.frames[v.frames.length - 1]);
}

describe.each(ASPECTS)('octopus at aspect %s', (aspect) => {
  const layout = buildLayout(aspect);
  const found = visits(layout, 0.37);

  it('appears again and again for as long as the scene runs', () => {
    // 240s of scene time at one appearance every 10–15s.
    expect(found.length).toBeGreaterThanOrEqual(16);
  });

  it('leaves a randomised 10–15s gap between appearances', () => {
    for (let i = 1; i < found.length; i++) {
      const gap = found[i].start - found[i - 1].start;
      expect(gap).toBeGreaterThanOrEqual(10 - STEP);
      expect(gap).toBeLessThanOrEqual(15 + STEP);
    }
    const gaps = found.slice(1).map((v, i) => v.start - found[i].start);
    // Randomised, not a metronome.
    expect(new Set(gaps.map((g) => g.toFixed(2))).size).toBeGreaterThan(found.length / 2);
  });

  it('swims in from off-screen every time', () => {
    for (const visit of found) {
      expect(offscreen(visit.frames[0], layout), `visit at ${visit.start}`).toBe(true);
    }
  });

  it('enters from every edge over time', () => {
    const sides = new Set(
      found.map((visit) => {
        const f = visit.frames[0];
        if (f.y < 0) return 'top';
        if (f.y > layout.world.h) return 'bottom';
        return f.x < 0 ? 'left' : 'right';
      }),
    );
    expect(sides).toEqual(new Set(['top', 'right', 'bottom', 'left']));
  });

  it('is plainly in the water, and unmissable, partway through the swim', () => {
    for (const visit of found) {
      const mid = visit.frames[Math.floor(visit.frames.length * 0.35)];
      expect(offscreen(mid, layout), `visit at ${visit.start}`).toBe(false);
      // Nearly solid and still fully its own colour: the swim is the half of
      // the visit a visitor is supposed to catch.
      expect(mid.alpha).toBeGreaterThan(0.8);
      expect(mid.reveal).toBe(1);
    }
  });

  it('camouflages before the visit ends', () => {
    for (const visit of found) {
      const last = visit.frames[visit.frames.length - 1];
      expect(last.alpha, `visit at ${visit.start}`).toBeLessThanOrEqual(0.06);
      expect(last.reveal).toBeLessThanOrEqual(0.01);
    }
  });

  it('finishes changing colour before it starts to fade', () => {
    for (const visit of found) {
      // Both used to run on one timeline, which meant the octopus was already
      // half gone by the time it was half recoloured — and a change of colour
      // nobody can see is indistinguishable from no change of colour.
      const shifting = visit.frames.filter((f) => f.reveal > 0.01);
      for (const f of shifting) {
        expect(f.alpha, `visit at ${visit.start}`).toBeGreaterThan(0.7);
      }
      // And it is a stage of its own, not an instant before the fade.
      expect(shifting.length * STEP).toBeGreaterThan(1);
    }
  });

  it('moves through colours that are plainly not one another', () => {
    for (const visit of found) {
      const at = (reveal: number) => {
        const f = visit.frames.reduce((best, f) =>
          Math.abs(f.reveal - reveal) < Math.abs(best.reveal - reveal) ? f : best,
        );
        return bodyTone(f, layout);
      };
      const purple = at(1);
      const hiding = at(0);
      const half = at(0.5);
      const apart = (a: readonly number[], b: readonly number[]) =>
        Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      // Far enough apart that the shift cannot read as the same colour dimming.
      expect(apart(purple, hiding), `visit at ${visit.start}`).toBeGreaterThan(120);
      // And it passes through somewhere that is neither of them, rather than
      // sitting on one and cutting to the other.
      expect(apart(half, purple)).toBeGreaterThan(50);
      expect(apart(half, hiding)).toBeGreaterThan(50);
    }
  });

  it('stays hidden for a few seconds once camouflaged', () => {
    for (const visit of found) {
      const hidden = visit.frames.filter((f) => f.alpha <= 0.06);
      expect(hidden.length * STEP, `visit at ${visit.start}`).toBeGreaterThanOrEqual(2.5);
    }
  });

  it('holds against a badge, close enough that the mantle overlaps it', () => {
    for (const visit of found) {
      const rest = visit.frames[visit.frames.length - 1];
      const gap = standoff(rest, layout);
      // The mantle reaches 0.56 half-spans back past the centre, so a standoff
      // under that is a body physically lapping over the outline rather than
      // hovering near it — which is what the pose has to read as.
      expect(gap, `visit at ${visit.start} on ${rest.target.obj.id}`).toBeGreaterThan(0);
      expect(gap).toBeLessThan(rest.s * 0.5);
    }
  });

  it('turns its back on the badge, so the arms are what reaches it', () => {
    for (const rest of resting(found)) {
      // The badge sits behind the octopus in its own frame — negative x is the
      // side the arms leave from, and it is square on rather than side-along.
      expect(rest.bx, `on ${rest.target.obj.id}`).toBeLessThan(0);
      expect(Math.abs(rest.by)).toBeLessThan(0.001);
      // And the arm roots, at 0.2 half-spans back, are all but touching it.
      expect(-rest.bx - rest.s * 0.2 - rest.br).toBeLessThan(rest.s * 0.1);
    }
  });

  it('curls its gripping arms round the badge and hooks the tips under it', () => {
    for (const rest of resting(found)) {
      for (const i of [2, 3, 4]) {
        const j = armJoints(rest, i);
        const off = (k: number) =>
          (Math.hypot(j[k * 2] - rest.bx, j[k * 2 + 1] - rest.by) - rest.br) / rest.s;
        // The length of the arm rides outside the outline, where a visitor can
        // see it — badges draw over the octopus, and an arm laid on the edge
        // would be swallowed by the one thing it is meant to be holding.
        for (let k = 1; k <= 3; k++) {
          expect(off(k), `arm ${i} joint ${k}`).toBeGreaterThan(0);
          expect(off(k)).toBeLessThan(0.7);
        }
        // The tip alone crosses under it, which is what reads as a hand
        // closing over an edge rather than resting against it.
        expect(off(4), `arm ${i} tip`).toBeLessThan(0);
        // It curls doing it: better than a right angle of turn between the
        // first segment and the last, and a good arc of the badge covered.
        expect(armBend(j), `arm ${i} bend`).toBeGreaterThan(1.9);
        const where = (k: number) => Math.atan2(j[k * 2 + 1] - rest.by, j[k * 2] - rest.bx);
        let swept = where(4) - where(0);
        swept -= Math.round(swept / (Math.PI * 2)) * Math.PI * 2;
        expect(Math.abs(swept), `arm ${i} sweep`).toBeGreaterThan(0.3);
      }
    }
  });

  it('curls the three to different depths, so they are not a clamp', () => {
    for (const rest of resting(found)) {
      const tip = (i: number) => {
        const j = armJoints(rest, i);
        return Math.hypot(j[8] - rest.bx, j[9] - rest.by) - rest.br;
      };
      // The one that only just hooks under, against the two that go deeper.
      expect(tip(3) - tip(2), `on ${rest.target.obj.id}`).toBeGreaterThan(rest.s * 0.05);
      expect(tip(3) - tip(4)).toBeGreaterThan(rest.s * 0.05);
    }
  });

  it('leaves the other five hanging slack, so the eye can tell them apart', () => {
    for (const rest of resting(found)) {
      for (const i of [0, 1, 5, 6, 7]) {
        const j = armJoints(rest, i);
        // Well off the line to the badge from the first segment on, so they
        // read as trailing rather than as five more arms reaching for it.
        const toBadge = Math.atan2(rest.by - j[1], rest.bx - j[0]);
        let away = Math.atan2(j[3] - j[1], j[2] - j[0]) - toBadge;
        away -= Math.round(away / (Math.PI * 2)) * Math.PI * 2;
        expect(Math.abs(away), `arm ${i} on ${rest.target.obj.id}`).toBeGreaterThan(1);
        // They droop rather than curl: nothing like the turn of an arm that
        // has taken hold, and no tip hooked under the badge.
        expect(armBend(j), `arm ${i} bend`).toBeLessThan(1.9);
        // A trailing tip may graze the outline; what it must not do is hook
        // under it the way the three holding on do.
        expect(Math.hypot(j[8] - rest.bx, j[9] - rest.by) - rest.br, `arm ${i} tip`)
          .toBeGreaterThan(-rest.s * 0.1);
      }
    }
  });

  it('never covers the middle of the badge, where the label is', () => {
    for (const visit of found) {
      const rest = visit.frames[visit.frames.length - 1];
      const p = layout.placements.get(rest.target.obj.id)!;
      expect(
        Math.hypot(rest.x - p.x, rest.y - p.y),
        `visit at ${visit.start} on ${rest.target.obj.id}`,
      ).toBeGreaterThan(Math.min(p.hw, p.hh));
    }
  });

  it('stays small enough to hide behind whatever it picked', () => {
    for (const visit of found) {
      const rest = visit.frames[visit.frames.length - 1];
      const p = layout.placements.get(rest.target.obj.id)!;
      expect(rest.s).toBeLessThanOrEqual(Math.min(p.hw, p.hh) * 0.62);
    }
  });

  it('picks a different badge from one visit to the next', () => {
    const targets = found.map((v) => v.frames[0].target.obj.id);
    expect(new Set(targets).size).toBeGreaterThan(3);
  });

  it('holds still against a badge that is not moving', () => {
    for (const visit of found) {
      const settledFrames = visit.frames.filter((f) => f.trail === 0);
      const first = settledFrames[0];
      for (const f of settledFrames) {
        expect(Math.hypot(f.x - first.x, f.y - first.y)).toBeLessThan(0.001);
        expect(f.angle).toBeCloseTo(first.angle, 6);
      }
    }
  });
});

it('rides its badge when the badge is dragged away', () => {
  const layout = buildLayout(1.78);
  const bodies = settled(layout);
  const t = 6.5; // Settled, mid-camouflage.
  const before = octopusFrame(t, 0.37, layout, bodies)!;
  expect(before).not.toBeNull();

  const moved = bodies.map((b) =>
    b.obj.id === before.target.obj.id ? { ...b, x: b.x + 120, y: b.y - 45 } : b,
  );
  const after = octopusFrame(t, 0.37, layout, moved)!;

  expect(after.target.obj.id).toBe(before.target.obj.id);
  expect(after.x - before.x).toBeCloseTo(120, 6);
  expect(after.y - before.y).toBeCloseTo(-45, 6);
});

it('swings around a badge that is spun, staying on the same side of it', () => {
  const layout = buildLayout(1.78);
  const bodies = settled(layout);
  const t = 6.5;
  const before = octopusFrame(t, 0.37, layout, bodies)!;
  const p = layout.placements.get(before.target.obj.id)!;

  const spun = bodies.map((b) =>
    b.obj.id === before.target.obj.id ? { ...b, angle: Math.PI / 2 } : b,
  );
  const after = octopusFrame(t, 0.37, layout, spun)!;

  const bearing = (f: OctopusFrame) => Math.atan2(f.y - p.y, f.x - p.x);
  let turned = bearing(after) - bearing(before);
  turned -= Math.round(turned / (Math.PI * 2)) * Math.PI * 2;
  expect(turned).toBeCloseTo(Math.PI / 2, 6);
  // Same distance out: it is holding on, not being flung off.
  expect(Math.hypot(after.x - p.x, after.y - p.y)).toBeCloseTo(
    Math.hypot(before.x - p.x, before.y - p.y),
    6,
  );
});

it('runs a different sequence for every visitor', () => {
  const layout = buildLayout(1.78);
  const a = visits(layout, 0.37).map((v) => v.frames[0].target.obj.id);
  const b = visits(layout, 812.4).map((v) => v.frames[0].target.obj.id);
  expect(a).not.toEqual(b);
});

/**
 * The arms are a bone chain rather than a rigid shape, which is only worth
 * having if the bend actually travels down it and the eight of them are not
 * marching in step.
 */
describe('arms', () => {
  const layout = buildLayout(1.78);
  const bodies = settled(layout);
  // Times below are seconds into a visit, not scene time — the first visit
  // does not begin at zero, and how far into the swim a sample lands is the
  // whole point of most of these.
  const start = visits(layout, 0.37)[0].start;

  const chain = (into: number, arm: number) => {
    const flat = armJoints(octopusFrame(start + into, 0.37, layout, bodies)!, arm);
    const points = [];
    for (let i = 0; i < flat.length; i += 2) points.push({ x: flat[i], y: flat[i + 1] });
    return points;
  };

  /**
   * How far each joint is rotated away from the segment above it. Differencing
   * consecutive segment directions isolates one joint's own contribution,
   * which is the thing the wave drives; absolute directions would just wrap.
   */
  const turns = (t: number, arm: number) => {
    const p = chain(t, arm);
    const dirs = p.slice(1).map((q, i) => Math.atan2(q.y - p[i].y, q.x - p[i].x));
    return dirs.slice(1).map((d, i) => {
      let turn = d - dirs[i];
      turn -= Math.round(turn / (Math.PI * 2)) * Math.PI * 2;
      return turn;
    });
  };

  const JOINTS = [0, 1, 2];

  it('is a connected chain — every segment starts where the last one ended', () => {
    const p = chain(2, 3);
    expect(p.length).toBe(5);
    const lengths = p.slice(1).map((q, i) => Math.hypot(q.x - p[i].x, q.y - p[i].y));
    // Equal-length bones, so the chain cannot be a set of floating pieces that
    // happen to line up.
    for (const len of lengths) expect(len).toBeCloseTo(lengths[0], 6);
    expect(lengths[0]).toBeGreaterThan(0);
  });

  it('bends further towards the tip than at the root', () => {
    const swings = JOINTS.map((k) => {
      const seen = [];
      for (let t = 0.6; t < 3.9; t += 1 / 120) seen.push(turns(t, 2)[k]);
      return Math.max(...seen) - Math.min(...seen);
    });
    for (let k = 1; k < swings.length; k++) {
      expect(swings[k], `joint ${k} vs ${k - 1}`).toBeGreaterThan(swings[k - 1]);
    }
  });

  it('sends the wave down the arm — each joint peaks after the one above it', () => {
    // Held inside the swim, where the amplitude is steady, so the only thing
    // separating the joints is the phase lag.
    const peakAt = JOINTS.map((k) => {
      let best = -Infinity;
      let at = 0;
      for (let t = 0.6; t < 3.9; t += 1 / 240) {
        const v = turns(t, 2)[k];
        if (v > best) {
          best = v;
          at = t;
        }
      }
      return at;
    });
    for (let k = 1; k < peakAt.length; k++) {
      expect(peakAt[k], `joint ${k} peaks after ${k - 1}`).toBeGreaterThan(peakAt[k - 1]);
    }
  });

  it('never moves two arms in lockstep', () => {
    const shapes = new Set<string>();
    for (let i = 0; i < 8; i++) shapes.add(turns(2.7, i).map((v) => v.toFixed(5)).join('|'));
    expect(shapes.size).toBe(8);
  });

  it('ripples while swimming and then stops dead once it has taken hold', () => {
    const spanOf = (arm: number, t0: number, t1: number) => {
      const seen = [];
      for (let t = t0; t < t1; t += 1 / 120) seen.push(turns(t, arm)[2]);
      return Math.max(...seen) - Math.min(...seen);
    };
    for (const arm of [2, 5]) {
      expect(spanOf(arm, 0.6, 3.5), `arm ${arm} swimming`).toBeGreaterThan(0.1);
      // Not merely quieter — motionless, for the whole of the camouflage and
      // the hold after it. Something hiding goes still.
      expect(spanOf(arm, 5.2, 9.4), `arm ${arm} holding on`).toBe(0);
    }
  });

  it('winds the wave down rather than cutting it off at the settle', () => {
    // The last frame that still moves and the first that does not have to
    // meet: a wave switched off mid-stroke would jump the pose instead.
    const at = (t: number) => turns(t, 2)[2];
    const ending = Math.abs(at(5.09) - at(5.1));
    const swimming = Math.abs(at(2.4) - at(2.41));
    expect(ending).toBeLessThan(swimming / 4);
  });
});
