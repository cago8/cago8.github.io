# Çağrı Bilginer — Portfolio

Personal portfolio for a Computer Engineering graduate of Koç University
applying to game development roles. Next.js (App Router) + TypeScript, no CSS
framework, deployed as a fully static export to GitHub Pages at
[cagribilginer.github.io](https://cagribilginer.github.io/).

## The idea — Dive Physics Playground

The site is a small 2D physics toy that you actually play. A flat-vector diver
swims on real rigid-body physics (Matter.js); every piece of the portfolio —
each experience entry, each project, each skill group — is a real physics body
in the water. You bump into things, they scatter, they knock each other around,
and they drift back to their clusters. Clicking one opens its content.

Two surfaces, deliberately opposed:

- **the water** — deep navy, where the playground and the page chrome live
- **paper** — warm sand, where every block of readable text lives

Nothing readable is ever drawn on the moving water. Panels and list cards are
opaque sand with near-black ink (14.6:1).

### Feel

- Zero gravity. This is neutral buoyancy, not a platformer.
- Hold the pointer to kick toward it; release and you coast on momentum with
  gentle drag. Arrow keys / WASD do the same.
- Objects are light relative to the diver, so a cluster genuinely scatters.
- Every object is tethered to its settled position by a soft spring. A solid
  shove peaks around 110 world units from home — roughly one body-width — and
  eases back over a couple of seconds.
- A restoring torque keeps objects upright, so labels stay readable however
  hard they were hit.
- Three current zones nudge whatever drifts through them.

## Accessibility

The playground is one of two equal views, not a gate in front of the content.

- **List view** — a persistent toggle in the masthead, on every screen size.
  Same cards, plain document order. Its markup is server-rendered and always
  present in the HTML, so crawlers and no-JS visitors get everything either
  way. Small screens default to it.
- **Keyboard** — every object has a real `<button>` pinned to its *settled*
  position, so tab order stays logical however far physics pushed things. The
  layer is pointer-transparent, so the mouse still talks to the canvas. A
  focusable swim surface takes arrow/WASD input without scrolling the page.
- **Panels** — focus moves in, is trapped while open, Escape closes and returns
  focus to the object you came from.
- **`prefers-reduced-motion`** — no engine, no drift, no currents, no bubbles.
  Objects render at their anchors as a static, clickable diagram, and
  matter-js is never downloaded at all.

## Performance

- matter-js is dynamically imported: ~25 kB gzip, loaded only in playground
  mode, never in list view or under reduced motion.
- The simulation runs only while the stage is on screen, the tab is visible and
  no panel is open.
- Hand-written CSS, ~4.5 kB gzip. No Tailwind, no animation library, no 3D.

## Layout of the code

```
content/             all copy — profile, experience, skills, projects, sections
config/site.ts       identity, links, SEO strings
components/content/  the cards, shared by List view and the panels
components/playground/
  palette.ts         colours + the measured contrast table
  scene.ts           what exists and where it is anchored (declarative)
  world.ts           Matter.js world, forces, tuning constants
  render.ts          canvas renderer — pure, takes a frame of state
  Playground.tsx     canvas, input, keyboard proxies, reduced-motion path
  Panel.tsx          the content dialog
```

`scene.ts` is deliberately declarative: because every object has a known
settled position independent of physics, the keyboard and reduced-motion paths
fall out of it for free.

## Development

```bash
npm install
npm run dev              # http://localhost:3000
npm run build            # static export to out/
npm run check            # tsc + eslint
npm run optimize-images  # re-encode anything new in public/assets to WebP
```

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the
static export and publishes `out/` to GitHub Pages.
