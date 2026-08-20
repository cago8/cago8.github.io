'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { playBonk, playOpen } from './audio';
import { buildLayout, type Layout } from './layout';
import { categoryAccent, palette } from './palette';
import { Panel } from './Panel';
import { renderScene, type BodyFrame, type Flash, type RenderState } from './render';
import { CATEGORY_ORDER, sceneObjects, type SceneObject } from './scene';
import type { Impact, WorldHandle } from './world';

/** Canvas ⇄ world transform. The world is built to the stage's own aspect
 *  ratio, so this is a plain uniform scale with nothing left over. */
interface View {
  scale: number;
  offsetX: number;
  offsetY: number;
  cssW: number;
  cssH: number;
}

const CATEGORY_LABELS = {
  profile: 'Profile',
  experience: 'Experience',
  skills: 'Skills',
  projects: 'Projects',
  contact: 'Contact',
} as const;

/** Held keys → swim direction. */
const KEY_VECTORS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  w: [0, -1],
  s: [0, 1],
  a: [-1, 0],
  d: [1, 0],
};

export function Playground() {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<WorldHandle | null>(null);
  const layoutRef = useRef<Layout | null>(null);
  const viewRef = useRef<View>({ scale: 1, offsetX: 0, offsetY: 0, cssW: 0, cssH: 0 });
  const rafRef = useRef(0);
  const clockRef = useRef({ t: 0, last: 0 });
  const inputRef = useRef({
    kickTarget: null as { x: number; y: number } | null,
    keyVec: { x: 0, y: 0 },
    boost: false,
  });
  const keysRef = useRef(new Set<string>());
  const pressRef = useRef<{ id: string; x: number; y: number; dragging: boolean } | null>(null);
  const joystickRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    dx: number;
    dy: number;
  } | null>(null);
  const boostPointerRef = useRef<number | null>(null);
  const flashesRef = useRef<(Flash & { born: number })[]>([]);
  const fontsRef = useRef({ sans: 'sans-serif', mono: 'monospace' });
  const uiRef = useRef({ hovered: null as string | null, focused: null as string | null, open: null as string | null });
  /** Set once the engine is live; re-evaluates whether the loop should run. */
  const evaluateRef = useRef<(() => void) | null>(null);
  /** Kept in a ref so the physics callback never sees a stale React closure. */
  const impactRef = useRef<(impact: Impact) => void>(() => {});

  const [motion, setMotion] = useState(true);
  const [ready, setReady] = useState(false);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  /** Set by the first movement input; fades the controls hint out of the way. */
  const [engaged, setEngaged] = useState(false);

  const openObject = useMemo(
    () => sceneObjects.find((o) => o.id === openId) ?? null,
    [openId],
  );

  // Floating labels above the multi-object clusters — Profile and Contact are
  // single objects and already self-explanatory, so only the groups get one.
  const clusterLabels = useMemo(() => {
    if (!layout) return [];
    const categories: (typeof CATEGORY_ORDER)[number][] = ['experience', 'skills', 'projects'];
    return categories.map((category) => {
      let top = Infinity;
      let left = Infinity;
      let right = -Infinity;
      for (const obj of sceneObjects) {
        if (obj.category !== category) continue;
        const place = layout.placements.get(obj.id)!;
        top = Math.min(top, place.y - place.hh);
        left = Math.min(left, place.x - place.hw);
        right = Math.max(right, place.x + place.hw);
      }
      return { category, x: (left + right) / 2, y: top };
    });
  }, [layout]);

  uiRef.current = { hovered, focused, open: openId };

  /* ------------------------------------------------------------- drawing */

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const currentLayout = layoutRef.current;
    if (!canvas || !ctx || !currentLayout) return;
    const view = viewRef.current;
    if (view.cssW === 0) return;

    const world = worldRef.current;
    const bodies: BodyFrame[] = sceneObjects.map((obj) => {
      const body = world?.bodies.get(obj.id);
      const place = currentLayout.placements.get(obj.id)!;
      return body
        ? { obj, x: body.position.x, y: body.position.y, angle: body.angle }
        : { obj, x: place.x, y: place.y, angle: 0 };
    });

    const now = clockRef.current.t;
    flashesRef.current = flashesRef.current.filter((flash) => now - flash.born < 0.8);

    const joystick = joystickRef.current;
    const state: RenderState = {
      t: now,
      layout: currentLayout,
      bodies,
      diver: world
        ? {
            x: world.diver.position.x,
            y: world.diver.position.y,
            angle: world.diver.angle,
            kick: inputRef.current.kickTarget || keysRef.current.size || joystick ? 1 : 0,
            speed: Math.hypot(world.diver.velocity.x, world.diver.velocity.y),
          }
        : { ...currentLayout.diverStart, angle: 0, kick: 0, speed: 0 },
      bubbles: world?.bubbles ?? [],
      flashes: flashesRef.current.map((flash) => ({ ...flash, age: now - flash.born })),
      stamina: world?.status.stamina ?? 1,
      boosting: world?.status.boosting ?? false,
      joystick: joystick ? { x: joystick.x, y: joystick.y, dx: joystick.dx, dy: joystick.dy } : null,
      hoveredId: uiRef.current.hovered,
      focusedId: uiRef.current.focused,
      openId: uiRef.current.open,
      motion,
      fonts: fontsRef.current,
    };
    renderScene(ctx, state, view);
  }, [motion]);

  /* ------------------------------------------------- sizing + font pickup */

  useEffect(() => {
    const rootStyle = getComputedStyle(document.documentElement);
    const sans = rootStyle.getPropertyValue('--font-plex-sans').trim();
    const mono = rootStyle.getPropertyValue('--font-plex-mono').trim();
    fontsRef.current = {
      sans: sans ? `${sans}, sans-serif` : 'sans-serif',
      mono: mono ? `${mono}, monospace` : 'monospace',
    };
    // Canvas text does not wait for webfonts; redraw once they land.
    document.fonts?.ready.then(() => draw());
  }, [draw]);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    let timer = 0;

    const measure = () => {
      const rect = stage.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const next = buildLayout(rect.width / rect.height);
      layoutRef.current = next;
      worldRef.current?.applyLayout(next);
      setLayout(next);

      const scale = Math.min(rect.width / next.world.w, rect.height / next.world.h);
      viewRef.current = {
        scale,
        offsetX: (rect.width - next.world.w * scale) / 2,
        offsetY: (rect.height - next.world.h * scale) / 2,
        cssW: rect.width,
        cssH: rect.height,
      };
      const ctx = canvas.getContext('2d');
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    measure();
    // Debounced: on iOS the URL bar collapsing fires a burst of resizes, and
    // rebuilding the layout on each one would churn the whole scene mid-swim.
    const observer = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(measure, 120);
    });
    observer.observe(stage);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [draw]);

  /* --------------------------------------------------- reduced motion pref */

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setMotion(!query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  /* ------------------------------------------------------ engine lifecycle */

  const hasLayout = layout !== null;

  useEffect(() => {
    if (!hasLayout) return;

    if (!motion) {
      // No physics at all under reduced motion: the scene is a static diagram
      // drawn from settled positions, and matter-js is never downloaded.
      worldRef.current?.destroy();
      worldRef.current = null;
      setReady(true);
      draw();
      return;
    }

    let cancelled = false;
    let stopVisibility: (() => void) | undefined;

    (async () => {
      const Matter = (await import('matter-js')).default;
      const { createWorld } = await import('./world');
      if (cancelled || !layoutRef.current) return;
      const world = createWorld(Matter, layoutRef.current, (impact) => impactRef.current(impact));
      worldRef.current = world;
      setReady(true);

      let running = false;
      const frame = (now: number) => {
        const clock = clockRef.current;
        const dt = clock.last ? Math.min(40, Math.max(8, now - clock.last)) : 16.666;
        clock.last = now;
        clock.t += dt / 1000;
        world.step(dt, clock.t, inputRef.current);
        draw();
        rafRef.current = requestAnimationFrame(frame);
      };
      const start = () => {
        if (running) return;
        running = true;
        clockRef.current.last = 0;
        rafRef.current = requestAnimationFrame(frame);
      };
      const stop = () => {
        running = false;
        cancelAnimationFrame(rafRef.current);
      };

      // Scope the simulation: it runs only while the stage is on screen, the
      // tab is visible, and no panel is covering it.
      let onScreen = true;
      const evaluate = () => {
        if (onScreen && !document.hidden && !uiRef.current.open) start();
        else stop();
      };
      const io = new IntersectionObserver(
        ([entry]) => {
          onScreen = entry.isIntersecting;
          evaluate();
        },
        { threshold: 0.05 },
      );
      if (stageRef.current) io.observe(stageRef.current);
      document.addEventListener('visibilitychange', evaluate);
      evaluateRef.current = evaluate;
      evaluate();

      stopVisibility = () => {
        io.disconnect();
        document.removeEventListener('visibilitychange', evaluate);
        stop();
      };
    })();

    return () => {
      cancelled = true;
      stopVisibility?.();
      cancelAnimationFrame(rafRef.current);
      worldRef.current?.destroy();
      worldRef.current = null;
      evaluateRef.current = null;
    };
  }, [motion, hasLayout, draw]);

  /* ---------------------------------------------------------------- panels */

  const open = useCallback((id: string) => {
    setOpenId(id);
  }, []);

  // Focus returns to the stage itself, not the object's node — refocusing the
  // node would leave it showing its focus ring, reading as still "selected"
  // after the panel is gone.
  const closePanel = useCallback(() => {
    setOpenId(null);
    requestAnimationFrame(() => stageRef.current?.focus());
  }, []);

  // Pause/resume around the panel, and repaint when highlight state changes.
  useEffect(() => {
    worldRef.current?.setPaused(openId !== null);
    evaluateRef.current?.();
    draw();
  }, [hovered, focused, openId, draw]);

  /* --------------------------------------------------------------- impacts */

  impactRef.current = (impact) => {
    flashesRef.current.push({ ...impact, age: 0, born: clockRef.current.t });
    const object = sceneObjects.find((o) => o.id === impact.id);
    if (impact.strong) {
      playOpen();
      open(impact.id);
    } else {
      playBonk();
      setAnnouncement(`Too gentle to open ${object?.title ?? 'that'} — swim faster.`);
    }
  };

  /* ---------------------------------------------------------------- input */

  const toWorld = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const view = viewRef.current;
    return {
      x: (clientX - rect.left - view.offsetX) / view.scale,
      y: (clientY - rect.top - view.offsetY) / view.scale,
    };
  }, []);

  /** Geometric hit test against settled positions — the reduced-motion path,
   *  where no physics engine exists to query. */
  const pick = useCallback((x: number, y: number): SceneObject | null => {
    if (worldRef.current) return worldRef.current.pick(x, y);
    const current = layoutRef.current;
    if (!current) return null;
    for (let i = sceneObjects.length - 1; i >= 0; i--) {
      const obj = sceneObjects[i];
      const place = current.placements.get(obj.id)!;
      const dx = x - place.x;
      const dy = y - place.y;
      if (obj.shape === 'gauge' || obj.shape === 'medallion') {
        if (dx * dx + dy * dy <= place.r * place.r) return obj;
      } else if (Math.abs(dx) <= place.hw && Math.abs(dy) <= place.hh) {
        return obj;
      }
    }
    return null;
  }, []);

  const applyKeyVector = useCallback(() => {
    let x = 0;
    let y = 0;
    for (const held of keysRef.current) {
      const [dx, dy] = KEY_VECTORS[held];
      x += dx;
      y += dy;
    }
    const len = Math.hypot(x, y) || 1;
    inputRef.current.keyVec = { x: x / len, y: y / len };
  }, []);

  const resetScene = useCallback(() => {
    worldRef.current?.settle();
    flashesRef.current = [];
    draw();
  }, [draw]);

  /*
   * Keys are taken at the window, not on a focusable stage element. Requiring
   * a visitor to first click an invisible target before the arrow keys do
   * anything is the most common way a canvas game reads as broken.
   */
  useEffect(() => {
    if (!motion) return;

    const isTypingTarget = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        el.isContentEditable ||
        el.closest('[role="dialog"]') !== null
      );
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      if (uiRef.current.open) return;

      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

      if (key in KEY_VECTORS) {
        event.preventDefault();
        keysRef.current.add(key);
        applyKeyVector();
        setEngaged(true);
        return;
      }
      if (key === ' ' || key === 'Shift') {
        // Space on a focused object belongs to that button: it opens the panel.
        const el = event.target as HTMLElement | null;
        if (key === ' ' && el && el.closest('button, a, [role="button"]')) return;
        event.preventDefault();
        inputRef.current.boost = true;
        return;
      }
      if (key === 'r') resetScene();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (key in KEY_VECTORS) {
        keysRef.current.delete(key);
        applyKeyVector();
      }
      if (key === ' ' || key === 'Shift') inputRef.current.boost = false;
    };

    const release = () => {
      keysRef.current.clear();
      inputRef.current.boost = false;
      applyKeyVector();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', release);
      release();
    };
  }, [motion, applyKeyVector, resetScene]);

  /* -------------------------------------------------------------- pointer */

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    const p = toWorld(event.clientX, event.clientY);
    const hit = pick(p.x, p.y);

    if (event.pointerType === 'touch' && joystickRef.current && !hit) {
      // Second finger while steering: boost.
      boostPointerRef.current = event.pointerId;
      inputRef.current.boost = true;
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);

    if (hit) {
      pressRef.current = { id: hit.id, x: event.clientX, y: event.clientY, dragging: false };
      return;
    }
    if (!motion) return;

    setEngaged(true);
    if (event.pointerType === 'touch') {
      const rect = event.currentTarget.getBoundingClientRect();
      joystickRef.current = {
        pointerId: event.pointerId,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        dx: 0,
        dy: 0,
      };
    } else {
      inputRef.current.kickTarget = p;
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const p = toWorld(event.clientX, event.clientY);
    const press = pressRef.current;

    const joystick = joystickRef.current;
    if (joystick && joystick.pointerId === event.pointerId) {
      const rect = event.currentTarget.getBoundingClientRect();
      const dx = event.clientX - rect.left - joystick.x;
      const dy = event.clientY - rect.top - joystick.y;
      const len = Math.hypot(dx, dy) || 1;
      const clamped = Math.min(1, len / 48);
      joystick.dx = (dx / len) * clamped;
      joystick.dy = (dy / len) * clamped;
      inputRef.current.keyVec = { x: dx / len, y: dy / len };
      return;
    }

    if (press) {
      const moved = Math.hypot(event.clientX - press.x, event.clientY - press.y);
      if (!press.dragging && moved > 6 && motion) {
        press.dragging = true;
        worldRef.current?.beginDrag(press.id, p.x, p.y);
      }
      if (press.dragging) worldRef.current?.moveDrag(p.x, p.y);
      return;
    }

    if (inputRef.current.kickTarget) inputRef.current.kickTarget = p;

    const hit = pick(p.x, p.y);
    const id = hit?.id ?? null;
    if (id !== uiRef.current.hovered) setHovered(id);
  };

  const endPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (boostPointerRef.current === event.pointerId) {
      boostPointerRef.current = null;
      inputRef.current.boost = false;
      return;
    }
    const joystick = joystickRef.current;
    if (joystick && joystick.pointerId === event.pointerId) {
      joystickRef.current = null;
      inputRef.current.keyVec = { x: 0, y: 0 };
    }

    const press = pressRef.current;
    pressRef.current = null;
    inputRef.current.kickTarget = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!press) return;
    if (press.dragging) {
      worldRef.current?.endDrag();
    } else if (!motion) {
      // Without physics there is nothing to collide with, so the click has to
      // keep working — this is the only way a reduced-motion visitor can read
      // an object.
      open(press.id);
    }
  };

  /* ----------------------------------------------------------------- view */

  const view = viewRef.current;
  const cursor = hovered ? 'grab' : motion ? 'crosshair' : 'pointer';

  return (
    <div className="playground">
      <div className="stage" ref={stageRef} tabIndex={-1}>
        <canvas
          ref={canvasRef}
          className="stage-canvas"
          style={{ cursor }}
          aria-hidden="true"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onPointerLeave={() => setHovered(null)}
        />

        <h1 className="sr-only">Çağrı Bilginer — game development portfolio</h1>
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>

        {/*
          Keyboard + assistive-tech layer. One real button per object, pinned to
          the object's settled position so tab order stays logical however far
          the physics has pushed things. It is pointer-transparent, so the mouse
          still talks to the canvas. Space/Enter do not open the panel from
          here — those keys are reserved for swim controls — so opening a
          panel always requires swimming into the object.
        */}
        <ul className="stage-nodes">
          {layout &&
            sceneObjects.map((obj) => {
              const place = layout.placements.get(obj.id)!;
              return (
                <li key={obj.id}>
                  <button
                    type="button"
                    id={`node-${obj.id}`}
                    className="stage-node"
                    style={{
                      left: view.offsetX + place.x * view.scale,
                      top: view.offsetY + place.y * view.scale,
                      width: place.hw * 2 * view.scale,
                      height: place.hh * 2 * view.scale,
                    }}
                    onFocus={() => setFocused(obj.id)}
                    onBlur={() => setFocused((id) => (id === obj.id ? null : id))}
                    onClick={() => open(obj.id)}
                    onKeyDown={(event) => {
                      // Space/Enter must not toggle the panel — reserved for
                      // swim controls (boost) and to avoid the box appearing
                      // to open/close itself when focus lands here.
                      if (event.key === ' ' || event.key === 'Enter') event.preventDefault();
                    }}
                  >
                    {obj.a11yLabel}
                  </button>
                </li>
              );
            })}
        </ul>

        {/* Section headers above each multi-object cluster, for orientation. */}
        <ul className="stage-section-labels">
          {layout &&
            clusterLabels.map((c) => (
              <li
                key={c.category}
                className="stage-section-label"
                data-category={c.category}
                style={{
                  left: view.offsetX + c.x * view.scale,
                  top: view.offsetY + c.y * view.scale,
                }}
              >
                {CATEGORY_LABELS[c.category]}
              </li>
            ))}
        </ul>

        <div className="stage-hud">
          <ul className="stage-legend">
            {CATEGORY_ORDER.map((category) => {
              const first = sceneObjects.find((o) => o.category === category);
              const count = sceneObjects.filter((o) => o.category === category).length;
              return (
                <li key={category}>
                  <button
                    type="button"
                    onClick={() => document.getElementById(`node-${first?.id}`)?.focus()}
                  >
                    <span
                      className="swatch"
                      style={{ background: categoryAccent[category], borderColor: palette.plate }}
                      aria-hidden="true"
                    />
                    {CATEGORY_LABELS[category]}
                    <span className="count">{count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {motion && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={resetScene}>
              Reset
            </button>
          )}
        </div>

        {/* Onboarding, not chrome: it steps aside once the visitor is moving. */}
        <p className={`stage-hint${engaged ? ' stage-hint--faded' : ''}`}>
          {motion
            ? 'Swim into anything to open it — arrows or WASD, Space to boost'
            : 'Reduced motion is on — the scene is static. Click or tab to any object to read it.'}
          {!ready && <span className="stage-hint-load"> · loading</span>}
        </p>
      </div>

      {openObject && <Panel object={openObject} onClose={closePanel} />}
    </div>
  );
}
