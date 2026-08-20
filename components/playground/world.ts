/**
 * Matter.js world for the playground.
 *
 * Design notes that matter for the feel:
 *  - Gravity is zero. This is neutral buoyancy, not a platformer; everything
 *    drifts and is brought home by soft anchor springs instead of falling.
 *  - Objects are deliberately light relative to the diver, so bumping into a
 *    cluster actually scatters it — that is where the toy-like fun lives.
 *  - Every object gets a restoring torque toward angle 0. Bodies tumble on
 *    impact but always settle back upright, so labels stay readable.
 *  - Panels are opened by ramming, so this file — not the React layer — owns
 *    the impact policy, because it is the only place that can see collision
 *    normals and relative speeds.
 *
 * Matter.js is imported dynamically by the caller, so its ~30 kB never lands
 * in the initial bundle.
 */
import type MatterNamespace from 'matter-js';
import type { Layout } from './layout';
import type { Particle } from './render';
import { sceneObjects, type SceneObject } from './scene';

type Matter = typeof MatterNamespace;
type Body = MatterNamespace.Body;

export interface Input {
  /** World-space point the diver is kicking toward, or null. */
  kickTarget: { x: number; y: number } | null;
  /** Currently held arrow/WASD directions, as a unit-ish vector. */
  keyVec: { x: number; y: number };
  /** Space/Shift held: burns stamina for a burst of speed. */
  boost: boolean;
}

/** What a diver↔object contact turned out to be. */
export interface Impact {
  id: string;
  speed: number;
  /** Hard enough to open the panel. A drift is not. */
  strong: boolean;
  /** Contact point in world space — the renderer flashes a ring there. */
  x: number;
  y: number;
}

export interface WorldHandle {
  bodies: Map<string, Body>;
  diver: Body;
  bubbles: Particle[];
  /** Mutable read-out for the renderer; avoids allocating every frame. */
  status: { stamina: number; boosting: boolean };
  step(dt: number, t: number, input: Input): void;
  pick(x: number, y: number): SceneObject | null;
  beginDrag(id: string, x: number, y: number): void;
  moveDrag(x: number, y: number): void;
  endDrag(): void;
  /** Re-home everything after a resize changed the world's shape. */
  applyLayout(next: Layout): void;
  /** Snap everything to its anchor and stop it — used to settle the scene. */
  settle(): void;
  /** Suspends impact opening while a panel is up. */
  setPaused(paused: boolean): void;
  destroy(): void;
}

const WALL = 220;

/* ------------------------------------------------------------ impact policy */

/**
 * Minimum closing speed, in world units per step, that counts as a deliberate
 * hit. Reference speeds under the current force constants: idle drift ≈ 0.5, a
 * released kick ≈ 6–9, terminal 11, boosted terminal 16. Anything that changes
 * kick force, `frictionAir` or the speed caps invalidates this number.
 */
const OPEN_SPEED = 4.2;
/** No second panel for this long after one opens. */
const OPEN_COOLDOWN_MS = 600;
/** How far the diver must get from an object before it can open again. */
const DISARM_MARGIN = 36;
/** The diver spawns among the objects; ignore contacts while it settles. */
const START_GRACE_MS = 500;

export function createWorld(
  M: Matter,
  layout: Layout,
  onImpact: (impact: Impact) => void,
): WorldHandle {
  const { Bodies, Body, Composite, Constraint, Engine, Events, Query, Vector } = M;

  // Sleeping stays OFF on purpose. Matter ignores applyForce on a sleeping
  // body, so the idle buoyancy sway and the current fields would silently stop
  // once the scene settled and everything would go dead. With only ~22 bodies
  // the cost is negligible, and the loop is already paused whenever the stage
  // is off screen, the tab is hidden, or a panel is open.
  const engine = Engine.create({ enableSleeping: false });
  engine.gravity.x = 0;
  engine.gravity.y = 0;

  const world = engine.world;
  const bodies = new Map<string, Body>();
  const byBodyId = new Map<number, SceneObject>();
  const springs = new Map<string, MatterNamespace.Constraint>();
  const phases = new Map<string, number>();
  let current = layout;

  /* ---- boundaries: the swimmable box, with the seabed as the floor ---- */
  const bounds = [
    Bodies.rectangle(0, 0, 10, 10, { isStatic: true }),
    Bodies.rectangle(0, 0, 10, 10, { isStatic: true }),
    Bodies.rectangle(0, 0, 10, 10, { isStatic: true }),
    Bodies.rectangle(0, 0, 10, 10, { isStatic: true }),
  ];
  bounds.forEach((b) => {
    b.restitution = 0.5;
    b.friction = 0.02;
  });
  Composite.add(world, bounds);

  /** Position and size the four walls for the current world box. */
  function layoutBounds() {
    const { w, h } = current.world;
    const seabed = current.seabedY;
    const specs: [number, number, number, number][] = [
      [w / 2, -WALL / 2 + 30, w + WALL * 2, WALL],
      [w / 2, seabed + WALL / 2, w + WALL * 2, WALL],
      [-WALL / 2 + 20, h / 2, WALL, h + WALL * 2],
      [w + WALL / 2 - 20, h / 2, WALL, h + WALL * 2],
    ];
    specs.forEach(([x, y, bw, bh], i) => {
      const body = bounds[i];
      // Matter has no resize, so scale the wall from its current dimensions.
      const width = body.bounds.max.x - body.bounds.min.x;
      const height = body.bounds.max.y - body.bounds.min.y;
      Body.scale(body, bw / width, bh / height);
      Body.setPosition(body, { x, y });
    });
  }

  /* ---------------------------- content bodies ---------------------------- */
  for (const obj of sceneObjects) {
    const place = current.placements.get(obj.id)!;
    const options = {
      density: 0.0004,
      frictionAir: 0.024,
      friction: 0.02,
      restitution: 0.55,
      label: obj.id,
    };
    let body: Body;
    switch (obj.shape) {
      case 'hex':
        body = Bodies.polygon(place.x, place.y, 6, place.r, options);
        break;
      case 'gauge':
      case 'medallion':
        body = Bodies.circle(place.x, place.y, place.r, options);
        break;
      default:
        body = Bodies.rectangle(place.x, place.y, place.hw * 2, place.hh * 2, {
          ...options,
          chamfer: { radius: 12 },
        });
    }
    bodies.set(obj.id, body);
    byBodyId.set(body.id, obj);
    phases.set(obj.id, Math.random() * Math.PI * 2);

    // Soft tether to the settled position: loose enough to be shoved across
    // the screen, firm enough that the cluster always reassembles.
    const spring = Constraint.create({
      pointA: { x: place.x, y: place.y },
      bodyB: body,
      length: 0,
      // Tuned by measurement, not taste: a solid shove peaks around 110 world
      // units from home — roughly one body-width, clearly visible — and eases
      // back within a couple of seconds. Stiffer or more damped than this and
      // objects snap back instantly, which feels rigid rather than toy-like.
      stiffness: 0.0016,
      damping: 0.012,
      render: { visible: false },
    });
    springs.set(obj.id, spring);
    Composite.add(world, spring);
  }
  Composite.add(world, [...bodies.values()]);
  layoutBounds();

  /* --------------------------------- diver -------------------------------- */
  const diver = Bodies.circle(current.diverStart.x, current.diverStart.y, 20, {
    density: 0.0042,
    frictionAir: 0.042,
    friction: 0.01,
    restitution: 0.4,
    label: 'diver',
  });
  // Fixed inertia: collisions must not send the diver spinning; its angle is
  // driven by heading so the figure always faces where it is going.
  Body.setInertia(diver, Infinity);
  Composite.add(world, diver);

  /* ------------------------------ impact state ---------------------------- */
  let dragConstraint: MatterNamespace.Constraint | null = null;
  let paused = false;
  let elapsed = 0;
  let lastOpenAt = -Infinity;
  /** Objects the diver is still resting against after opening them. */
  const disarmed = new Set<string>();

  Events.on(engine, 'collisionStart', (event) => {
    for (const pair of event.pairs) {
      const other = pair.bodyA === diver ? pair.bodyB : pair.bodyB === diver ? pair.bodyA : null;
      if (!other) continue;
      const obj = byBodyId.get(other.id);
      if (!obj) continue;

      // Closing speed along the contact normal — the honest measure of how
      // hard the diver actually hit, rather than how fast it happened to be
      // travelling past.
      const rv = Vector.sub(diver.velocity, other.velocity);
      const speed = Math.abs(Vector.dot(rv, pair.collision.normal));
      // `pair.contacts` is the live array in matter-js 0.20 — the typings also
      // advertise `activeContacts`, which no longer exists at runtime.
      const contact = pair.contacts?.[0]?.vertex ?? pair.collision.supports?.[0] ?? diver.position;

      const suppressed =
        paused ||
        dragConstraint !== null ||
        elapsed < START_GRACE_MS ||
        disarmed.has(obj.id) ||
        elapsed - lastOpenAt < OPEN_COOLDOWN_MS;
      if (suppressed) continue;

      const strong = speed >= OPEN_SPEED;
      if (strong) {
        lastOpenAt = elapsed;
        disarmed.add(obj.id);
        // Recoil: shove the diver back out along the contact normal so it
        // separates on its own. Without this, a diver left resting against the
        // object would re-open the panel the moment the cooldown lapsed.
        const away = Vector.normalise(Vector.sub(diver.position, other.position));
        Body.setVelocity(diver, Vector.mult(away, 3.2));
      }
      onImpact({ id: obj.id, speed, strong, x: contact.x, y: contact.y });
    }
  });

  /* ------------------------------- particles ------------------------------ */
  const bubbles: Particle[] = [];
  const status = { stamina: 1, boosting: false };
  let bubbleClock = 0;
  let kickRamp = 0;

  function applyCurrents(body: Body, scale: number) {
    for (const c of current.currents) {
      if (
        body.position.x > c.x &&
        body.position.x < c.x + c.w &&
        body.position.y > c.y &&
        body.position.y < c.y + c.h
      ) {
        Body.applyForce(body, body.position, {
          x: c.fx * body.mass * 0.00007 * scale,
          y: c.fy * body.mass * 0.00007 * scale,
        });
      }
    }
  }

  function step(dt: number, t: number, input: Input) {
    const scale = dt / 16.666;
    elapsed += dt;

    /* Idle sway + currents + upright torque for every content body. */
    for (const [id, body] of bodies) {
      const phase = phases.get(id) ?? 0;
      const sway = body.mass * 0.0000165;
      Body.applyForce(body, body.position, {
        x: Math.sin(t * 0.53 + phase) * sway,
        y: Math.cos(t * 0.41 + phase * 1.7) * sway,
      });
      applyCurrents(body, scale);
      // Restoring torque: damp spin, then pull the angle back toward upright.
      Body.setAngularVelocity(body, body.angularVelocity * 0.965 - body.angle * 0.0055 * scale);
    }

    /* Re-arm objects the diver has swum clear of. */
    if (disarmed.size) {
      for (const id of [...disarmed]) {
        const body = bodies.get(id);
        const place = current.placements.get(id);
        if (!body || !place) continue;
        const reach = Math.max(place.hw, place.hh) + DISARM_MARGIN;
        if (Vector.magnitude(Vector.sub(diver.position, body.position)) > reach) {
          disarmed.delete(id);
        }
      }
    }

    /* Diver propulsion. */
    let kicking = false;
    const push = { x: input.keyVec.x, y: input.keyVec.y };
    if (input.kickTarget) {
      const d = Vector.sub(input.kickTarget, diver.position);
      const len = Vector.magnitude(d);
      if (len > 10) {
        push.x += d.x / len;
        push.y += d.y / len;
      }
    }
    const pushLen = Math.hypot(push.x, push.y);

    // Boost burns a 1.6 s reserve that refills over 3 s, so it stays a decision
    // rather than a key you simply hold down forever.
    const boosting = input.boost && pushLen > 0.01 && status.stamina > 0;
    status.boosting = boosting;
    status.stamina = boosting
      ? Math.max(0, status.stamina - dt / 1600)
      : Math.min(1, status.stamina + dt / 3000);

    if (pushLen > 0.01) {
      kicking = true;
      // Ramp in over ~0.25 s so a click is a nudge and a hold is a real kick.
      kickRamp = Math.min(1, kickRamp + scale * 0.09);
      const f = diver.mass * 0.00135 * kickRamp * (boosting ? 2.4 : 1);
      Body.applyForce(diver, diver.position, {
        x: (push.x / pushLen) * f,
        y: (push.y / pushLen) * f,
      });
    } else {
      kickRamp = Math.max(0, kickRamp - scale * 0.12);
      // Idle buoyancy bob, so a resting diver never looks frozen.
      Body.applyForce(diver, diver.position, {
        x: Math.sin(t * 0.6) * diver.mass * 0.000012,
        y: Math.cos(t * 0.85) * diver.mass * 0.0000175,
      });
    }
    applyCurrents(diver, scale);

    // Terminal speed, so momentum stays readable rather than rocketing.
    const cap = boosting ? 16 : 11;
    const speed = Vector.magnitude(diver.velocity);
    if (speed > cap) Body.setVelocity(diver, Vector.mult(diver.velocity, cap / speed));

    // Heading: ease toward the direction of travel.
    if (speed > 0.35) {
      const target = Math.atan2(diver.velocity.y, diver.velocity.x);
      let delta = target - diver.angle;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      Body.setAngle(diver, diver.angle + delta * Math.min(1, 0.14 * scale));
    }

    /* Exhaust bubbles, emitted from roughly where the regulator is. */
    bubbleClock += dt;
    const interval = kicking ? (boosting ? 40 : 70) : 420;
    if (bubbleClock > interval) {
      bubbleClock = 0;
      const off = 18;
      bubbles.push({
        x: diver.position.x + Math.cos(diver.angle) * off,
        y: diver.position.y + Math.sin(diver.angle) * off,
        r: 2 + Math.random() * 3.5,
        life: 1,
        vx: (Math.random() - 0.5) * 12,
        vy: -26 - Math.random() * 26,
      });
      if (bubbles.length > 90) bubbles.splice(0, bubbles.length - 90);
    }
    const dts = dt / 1000;
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.x += b.vx * dts;
      b.y += b.vy * dts;
      b.vy -= 8 * dts;
      b.r += 1.2 * dts;
      b.life -= dts / 2.1;
      if (b.life <= 0 || b.y < -20) bubbles.splice(i, 1);
    }

    Engine.update(engine, dt);
  }

  function pick(x: number, y: number): SceneObject | null {
    const hits = Query.point([...bodies.values()], { x, y });
    if (!hits.length) return null;
    return byBodyId.get(hits[hits.length - 1].id) ?? null;
  }

  return {
    bodies,
    diver,
    bubbles,
    status,
    step,
    pick,
    beginDrag(id, x, y) {
      const body = bodies.get(id);
      if (!body) return;
      dragConstraint = Constraint.create({
        pointA: { x, y },
        bodyB: body,
        pointB: { x: x - body.position.x, y: y - body.position.y },
        length: 0,
        stiffness: 0.08,
        damping: 0.25,
        render: { visible: false },
      });
      Composite.add(world, dragConstraint);
    },
    moveDrag(x, y) {
      if (dragConstraint) dragConstraint.pointA = { x, y };
    },
    endDrag() {
      if (dragConstraint) {
        Composite.remove(world, dragConstraint);
        dragConstraint = null;
      }
    },
    applyLayout(next) {
      const prev = current;
      current = next;
      layoutBounds();
      // Bodies keep their relative position in the water and then spring to
      // their new homes, so a resize reads as the reef re-settling rather than
      // as everything teleporting.
      const sx = next.world.w / prev.world.w;
      const sy = next.world.h / prev.world.h;
      for (const [id, body] of bodies) {
        const place = next.placements.get(id);
        if (!place) continue;
        const spring = springs.get(id);
        if (spring) spring.pointA = { x: place.x, y: place.y };
        Body.setPosition(body, {
          x: Math.min(Math.max(body.position.x * sx, place.hw), next.world.w - place.hw),
          y: Math.min(Math.max(body.position.y * sy, place.hh), next.seabedY - place.hh),
        });
      }
      Body.setPosition(diver, {
        x: Math.min(Math.max(diver.position.x * sx, 24), next.world.w - 24),
        y: Math.min(Math.max(diver.position.y * sy, 24), next.seabedY - 24),
      });
    },
    settle() {
      for (const obj of sceneObjects) {
        const body = bodies.get(obj.id);
        const place = current.placements.get(obj.id);
        if (!body || !place) continue;
        Body.setPosition(body, { x: place.x, y: place.y });
        Body.setVelocity(body, { x: 0, y: 0 });
        Body.setAngle(body, 0);
        Body.setAngularVelocity(body, 0);
      }
      Body.setPosition(diver, current.diverStart);
      Body.setVelocity(diver, { x: 0, y: 0 });
      Body.setAngle(diver, 0);
      bubbles.length = 0;
      disarmed.clear();
      status.stamina = 1;
      elapsed = 0;
      lastOpenAt = -Infinity;
    },
    setPaused(next) {
      paused = next;
    },
    destroy() {
      Events.off(engine, 'collisionStart');
      Composite.clear(world, false, true);
      Engine.clear(engine);
    },
  };
}
