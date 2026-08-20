# Playground v2 — collide-to-open, full-screen stage, dark List View

Date: 2026-08-20
Status: approved and implemented (2026-08-20)

## 1. Goals

1. The diver opens panels by **hitting** objects, not by clicking them.
2. Keyboard: arrows/WASD to swim, Space to boost. Touch: virtual joystick.
3. The stage fills the viewport under a sticky header — no cramped 76vh box.
4. List View becomes dark cards with high-contrast white text and stronger type.
5. No image is ever cropped, in either view.

Non-goals: new content, new sections, routing changes, a build-tooling change.

---

## 2. Full-screen layout & object positioning

### 2.1 Page shell

```
┌──────────────────────────────────────────────┐
│ ÇB  Game dev · CE      [Play|List] 🔊 Résumé │  sticky, 56–64px
├──────────────────────────────────────────────┤
│                                              │
│              stage: 100dvh − header          │  play view
│                                              │
└──────────────────────────────────────────────┘
```

- `.masthead` becomes `position: sticky; top: 0; z-index: 50`, height `--head-h`
  (`clamp(52px, 7vh, 64px)`), solid `--deep` with a hairline bottom border.
- Play view: `.playground { height: calc(100dvh - var(--head-h)); padding: 0 }`,
  `.stage { position: relative; height: 100%; width: 100%; border-radius: 0;
  border: 0 }`. `dvh` with an `svh` fallback declared first, so iOS URL-bar
  collapse does not resize the world mid-swim.
- The hero block (name, tagline, statement, facts) **moves out of the shell and
  into the top of `ListView`**. It is server-rendered and always in the HTML, so
  the `<h1>`, tagline and facts stay crawlable even while the play view is up.
  The play view carries its own `sr-only` `<h1>` so exactly one `<h1>` is ever
  exposed to the accessibility tree.
- The legend + "Reset scene" row moves from below the stage to a floating strip
  inside the stage, bottom-centre, on the same translucent plate as the hint.

### 2.2 Fluid world

`WORLD` stops being the constant `1600×1000` and becomes a value derived from
the stage's aspect ratio, computed by a new pure module `playground/layout.ts`.

```ts
export interface Layout {
  world: { w: number; h: number };
  anchors: Record<string, { x: number; y: number }>;  // by scene object id
  decor: { boulders: Boulder[]; kelp: Kelp[]; pinnacle: Pinnacle; currents: CurrentZone[] };
  seabedY: number;
  diverStart: { x: number; y: number };
  sizeScale: number;   // object radius multiplier (portrait shrinks them)
}

export function buildLayout(aspect: number): Layout;
```

- **Height is fixed at `H = 1000` world units. Width is `W = clamp(1000 * aspect,
  760, 2600)`.** The canvas transform therefore collapses to a single uniform
  `scale = cssHeight / 1000` with zero offset — no letterboxing, no cropping, and
  object sizes stay visually constant across screens.
- Objects are placed by packing each category into a **normalized band** (a
  rect in 0–1 space) and laying its members out on a grid inside that band.
  Three band tables, chosen by aspect:

  | mode | aspect | arrangement |
  |---|---|---|
  | `wide` | ≥ 1.45 | today's spread: profile far left, experience top-centre, skills lower-left in two offset rows, projects lower-right 3×2, contact far right |
  | `standard` | 0.95 – 1.45 | same reading order, columns pulled in, project grid 2×3 |
  | `portrait` | < 0.95 | vertical stack of full-width bands in section order; `sizeScale = 0.82` so a 6-wide row still fits |

- Decor x-positions become fractions of `W` so boulders/kelp/currents spread
  with the world instead of clustering at the left on an ultrawide.
- `sceneObjects` keeps identity, category, labels and shape; it loses `anchor`,
  which now comes from the layout. `hw/hh/r` are multiplied by `sizeScale`.

### 2.3 Resize behaviour

`Playground` recomputes the layout on `ResizeObserver`, debounced 120 ms, and
hands it to `world.applyLayout(layout)`, which:

1. moves the four boundary bodies to the new bounds,
2. rewrites each spring's `pointA` to the new anchor,
3. clamps any body (and the diver) that now sits outside the world.

Bodies are **not** teleported — they spring to their new homes over ~1 s, which
reads as the reef re-settling. Under reduced motion the positions snap.

---

## 3. Interaction flow: movement → collision → panel

### 3.1 The rule

Any diver↔object contact opens that object's panel, subject to a speed check
and four suppressors.

```
collisionStart(diver, object)
   │
   ├─ suppressed?  (panel open · dragging · <600ms since last open
   │                · object disarmed · <500ms since mount/reset)      → ignore
   │
   ├─ impact speed = |relative velocity · contact normal|
   │
   ├─ speed < 4.2  → WEAK: coral pulse ring on the object (600ms)
   │                        + world-space caption "Kick harder!"
   │                        + low "bonk" (90→60 Hz, 120 ms)
   │                        + polite live-region text
   │
   └─ speed ≥ 4.2  → OPEN: white flash ring expands from contact point
                            + two-tone chime (520→780 Hz, 180 ms)
                            + recoil impulse pushes the diver back along
                              the normal
                            + object marked DISARMED
                            + simulation pauses, panel opens (existing Panel)
```

Reference speeds: idle drift ≈ 0.5, a released kick ≈ 6–9, terminal 11,
boosted terminal 16. So a drift never opens and a deliberate kick always does.

**DISARMED** is the load-bearing detail. With "any contact opens", a diver
resting against an object would re-open the panel the instant the cooldown
expires. An object stays disarmed until the diver's centre is more than
`r + 36` world units away; the recoil impulse on open makes that happen by
itself in the common case.

Drag is exempt: while a pointer drag is in progress, no impact can open a
panel — otherwise flinging an object at a stationary diver would open it.

### 3.2 What the pointer does now

| gesture | result |
|---|---|
| press + drag on an object | shove it (unchanged) |
| press + hold on empty water | swim toward the pointer (unchanged) |
| **click on an object** | **shove nudge only — no longer opens** |
| click legend entry | focuses that object's proxy button |

### 3.3 Reduced motion

With no physics engine there is no collision, so under
`prefers-reduced-motion: reduce` **click-to-open stays enabled** and the hint
line says so. This is the one place the old behaviour survives, and it must,
or reduced-motion users lose access to the content in this view.

### 3.4 Wiring

`world.ts` gains `Events.on(engine, 'collisionStart')`, filtered to pairs
containing the diver, and exposes `onImpact(cb: (id: string, speed: number) => void)`.
All policy (thresholds, cooldown, disarm, suppressors) lives in `world.ts`
next to the physics it reads; `Playground` receives one of two verbs — `open`
or `weakHit` — and owns only React state and the sound call.

---

## 4. Keyboard & touch mapping

| input | action |
|---|---|
| `↑ ↓ ← →` / `W A S D` | swim (unit vector, diagonals normalized) |
| `Space` (hold) | boost — force ×2.4, terminal speed 11 → 16 |
| `Shift` (hold) | boost, alias for laptop users |
| `Tab` / `Shift+Tab` | step through object proxy buttons |
| `Enter` / `Space` on a focused object | open its panel directly |
| `Esc` | close the panel |
| `R` | reset scene |

- Keys are handled by a **window-level listener** mounted with the playground,
  not by the invisible focusable div alone — requiring a focus target before
  the arrows do anything is the single most common way this reads as broken.
  The handler ignores events whose target is an `input`, `textarea`, `select`,
  or a `[role=dialog]` descendant, and calls `preventDefault()` on arrows and
  Space so the page never scrolls.
- **Space conflict, resolved:** if focus is on an object proxy button, Space is
  left to the browser (it activates the button → opens the panel). Boost only
  consumes Space when focus is on the body or the swim surface.
- Boost has a **stamina meter**: 1.6 s of boost, refilling in 3 s, drawn as a
  thin coral arc under the diver. Without it, boost is just a permanently-held
  key and the speed threshold stops meaning anything. *(Cuttable if you'd
  rather boost be unlimited — say so and I'll drop the meter.)*
- **Touch:** press-and-hold on empty water spawns a virtual joystick at the
  touch point (96 px radius, 40 px thumb); the thumb offset becomes the swim
  vector. A second finger anywhere = boost. Drag on an object still shoves it.
  `touch-action: none` on the stage is already in place.
- Keyboard remains the guaranteed accessible path: Tab + Enter opens every
  panel without any physics, drag, or collision.

---

## 5. List View redesign

### 5.1 Palette

New tokens, replacing the sand-card surface in List View **and in the
playground panels** — matching the two is the point; if you want panels to
stay sand, say so, it is a one-token change.

| token | value | role |
|---|---|---|
| `--card` | `#0F2B3E` | card surface |
| `--card-raised` | `#143A52` | chips-on-card, nested blocks |
| `--card-line` | `rgba(255,255,255,0.10)` | hairline card edge |
| `--text` | `#F7FBFF` | primary text |
| `--text-muted` | `#B7D0DE` | body copy, secondary |
| `--chip` / `--chip-text` | `#1B4560` / `#DDEBF2` | technology chips |

Measured WCAG 2.1 ratios (computed, not estimated):

```
#F7FBFF on #0F2B3E  14.07  AAA   primary text on card
#B7D0DE on #0F2B3E   9.12  AAA   body copy on card
#46D4C8 on #0F2B3E   8.02  AAA   aqua meta/links
#FFC46B on #0F2B3E   9.31  AAA   sun accents
#FF6F4E on #0F2B3E   5.32  AA    coral flags (large/UI only)
#DDEBF2 on #1B4560   8.34  AAA   chip text
#F7FBFF on #143A52  11.50  AAA   text on raised
#0B1F30 on #46D4C8   9.19  AAA   ink on aqua buttons
```

Card-to-page contrast is only 1.20:1, so **cards must be separated by edge, not
fill**: 1px `--card-line` border plus `0 18px 40px -24px rgba(0,0,0,0.85)`.

### 5.2 Typography

| element | face | size | weight / tracking |
|---|---|---|---|
| section `h2` | Space Grotesk | `clamp(2rem, 5vw, 3.25rem)` | 700, `-0.02em` |
| section blurb | Plex Mono | `0.78rem` | uppercase, `0.08em`, aqua |
| card `h3` | Space Grotesk | `clamp(1.35rem, 2.4vw, 1.75rem)` | 600, `-0.01em` |
| body | Plex Sans | `1rem` / 1.65 | 400, `--text-muted` |
| lead body | Plex Sans | `1.06rem` / 1.6 | 500, `--text` |
| meta / dates | Plex Mono | `0.74rem` | uppercase, `0.1em` |
| chips | Plex Mono | `0.76rem` | 500 |

Rhythm: section gap `clamp(3rem, 7vw, 5rem)`; a full-bleed hairline under each
section heading; card padding `clamp(1.25rem, 2.6vw, 1.75rem)`; radius 18px.
Project cards lift 2px with an aqua border on hover/focus-within.

### 5.3 Structure

The hero moves in above the first section. Section order and the shared
`content/*` cards are unchanged — this is a skin, not a re-architecture.

---

## 6. Thumbnails — no cropping anywhere

Source ratios: 1.20, 1.79, 1.87, 1.18, 1.50, and the portrait photo at 0.73.
Nothing uniform is available, so the frame absorbs the difference:

| surface | rule |
|---|---|
| List View `.card-shot` | `aspect-ratio: 16/10; object-fit: contain; background: var(--deep)` — fixed frame keeps the grid rhythm, letterbox bands show the whole image |
| Panel `.card-shot` | `aspect-ratio: auto; width: 100%; height: auto; max-height: 46dvh; object-fit: contain` — one image with room, so it takes its natural ratio |
| `.profile-photo` | `aspect-ratio: 876/1200` (its true ratio), `object-fit: contain`; the `next/image` `width`/`height` props are corrected from 360×450 to 876×1200 |

`object-fit: cover` is removed from the stylesheet entirely, so the crop cannot
come back by accident. `sizes` attributes are updated to the new frame widths.

---

## 7. Files touched

| file | change |
|---|---|
| `components/playground/layout.ts` | **new** — `buildLayout(aspect)`, band tables, packing |
| `components/playground/audio.ts` | **new** — gesture-gated WebAudio, two synthesized sounds, persisted mute |
| `components/playground/scene.ts` | drops anchors/decor constants, keeps object identity |
| `components/playground/world.ts` | collision events, impact policy, boost, recoil, `applyLayout` |
| `components/playground/render.ts` | layout-driven decor, weak-hit pulse + caption, open flash, stamina arc, joystick |
| `components/playground/Playground.tsx` | full-height stage, window key handler, touch joystick, impact → panel, in-stage legend |
| `components/playground/Panel.tsx` | dark surface classes; body scroll containment |
| `components/Portfolio.tsx` | sticky header, sound toggle, hero moves to `ListView` |
| `components/ListView.tsx` | renders the hero block |
| `components/content/ProjectCard.tsx`, `ProfileCard.tsx` | corrected image dimensions and `sizes` |
| `app/globals.css` | dark card system, type scale, full-height stage, contain rules |

---

## 8. Execution risks

1. **Re-open loop** (highest). "Any contact opens" plus a resting diver is an
   infinite panel. Mitigated by disarm-until-separation + recoil impulse; must
   be verified by holding a direction into an object and closing the panel
   repeatedly.
2. **The fluid-world rewrite is the bulk of the diff.** Anchors, decor, bounds,
   proxy-button positions and pick coordinates all derive from it. Mitigation:
   `buildLayout` is a pure function and gets a test — see §9.
3. **Mobile viewport units.** `100dvh` resizes as the URL bar collapses, which
   would re-run the layout mid-swim. `svh` fallback + 120 ms debounce; verified
   on a real phone, not just devtools.
4. **Window-level key handler** can swallow keys the rest of the page needs
   (skip link, form fields in the Contact panel, the view switch). It is scoped
   to the playground being mounted and skips form/dialog targets.
5. **Audio.** Blocked before a gesture by browser policy, and unwanted by some
   visitors: the context is created lazily on the first pointer/key event, the
   mute state persists in `localStorage`, and the toggle sits in the header.
6. **Panel scrolling.** With a 100dvh stage there is no page scroll behind the
   panel; the panel keeps `max-height: 86dvh; overflow-y: auto` and
   `overscroll-behavior: contain`.
7. **Speed threshold is a feel value.** 4.2 is derived from the current force
   constants, and any change to `frictionAir` or kick force invalidates it. It
   lives as one named constant with the reference speeds in a comment.
8. **The documented contrast table in `globals.css`/`palette.ts` becomes wrong**
   the moment cards go dark. Both headers get the recomputed table in §5.1.
9. **Portrait layout can collide with the joystick.** The joystick is drawn in
   the lower-left; the portrait band table keeps the bottom 18% of the world
   free of objects.
10. **Discoverability.** Nobody knows they must ram things. The hint line
    changes to "Swim into anything to open it — arrows/WASD, Space to boost",
    and the intro state pulses the nearest object once.

## 9. As built — where the implementation departed from this spec

1. **No `--head-h`.** The shell is a flex column (`body` → `main` → `.playground`
   → `.stage`), so the stage takes the leftover viewport height with no
   hard-coded header height to drift out of sync. It also survives the masthead
   wrapping to two rows on a phone, which a fixed height would not.
2. **`[hidden] { display: none !important }` was required.** `.site-footer`
   sets `display: flex`, and a class beats the UA `[hidden]` rule — without
   this the footer showed through the play view.
3. **The hint now fades after the first movement input.** On a phone the banner
   sat on top of Profile and Contact. The portrait top band also moved down
   (`y0` 0.02 → 0.07) so the two never collide on first paint.
4. **Object detail scales with one transform.** `drawObject` applies
   `ctx.scale(layout.scale)` once and draws at design size, instead of every
   font size and tick length being multiplied at the call site.
5. **`.grid { align-items: start }`.** Cards take their own height; a long
   project summary no longer leaves the card beside it as a tall empty box.
6. **matter-js contact API.** The typings advertise `pair.activeContacts`,
   which does not exist at runtime in 0.20 — the live array is `pair.contacts`.
   Reading the stale one threw inside the collision handler and killed the
   whole simulation loop on first contact.

## 10. Verification

- `npm run check` (`tsc --noEmit && eslint .`) must pass.
- The repo has no test runner. `buildLayout` is worth one: add **vitest** plus
  `layout.test.ts` asserting, across aspects 0.5 / 0.75 / 1.0 / 1.6 / 2.4 —
  every object inside world bounds, no two objects' bounding boxes overlapping,
  the bottom 18% clear in portrait, and every scene object present exactly once.
  Geometry bugs are otherwise invisible until a visitor's screen finds them.
  *(Say the word if you'd rather not add a dev dependency.)*
Driven for real in headless Chrome over CDP (arrow/space key events, touch
events, clicks), not just typechecked:

| behaviour | result |
|---|---|
| Boosted ram into a project | opens its panel (`PocketPet`) |
| Gentle taps into the same object | no panel; live region reads "Too gentle to open PocketPet — kick harder." |
| Close, still holding the same direction | does not re-open; swimming on opens the *next* object |
| Space on a focused object | opens it (does not boost) |
| Enter on a focused object | opens it |
| Escape | closes, focus returns to the object that opened it |
| Reduced motion emulated | scene static, hint changes, click still opens |
| Sound on, ram, toggle | no errors; toggle flips `aria-pressed` and persists |
| Stage fill at 1440×860 | body 860, masthead 70, stage 790 — no dead band |
| Portrait 390×844 | 3×2 hexes, staggered gauges, 3×2 projects, joystick clear |

Harness note: dispatching Escape through CDP makes headless Chrome mark the
page `hidden`, which correctly pauses the simulation. Any scripted sequence
that presses Escape and then measures the scene is measuring a paused page.
