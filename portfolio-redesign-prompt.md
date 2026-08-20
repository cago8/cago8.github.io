# Portfolio Website Redesign — Full Brief

I want a complete, ground-up redesign of my personal portfolio website. Discard any previous redesign attempt in this repo entirely — treat this as starting completely over. Read the current code only to extract real content (text, links, project/experience details); do not preserve any of its current structure, styling, or visual direction.

## CRITICAL LESSON FROM PAST ATTEMPTS — READ THIS FIRST

Multiple previous attempts at interactive/illustrated scenes (a 3D gym, an underwater dive map) failed for the same reason: the written plan was good, the accessibility and content logic were good, but the actual visual execution looked like an unfinished wireframe prototype — flat geometric CSS shapes standing in for light/atmosphere, plain icon-in-a-circle badges standing in for illustrated landmarks, blurry placeholder blobs standing in for terrain, and a generally empty, sparse scene. Meanwhile the plain content panels (just text, images, and layout — no illustration) always came out clean and professional.

The lesson: don't attempt a fully custom illustrated scene unless every element in it can actually reach real illustration quality. Be honest with yourself about execution risk before committing to a direction. A well-executed simple design beats an ambitious scene that comes out looking like a prototype.

## WHO I AM

Çağrı Bilginer, Computer Engineering graduate of Koç University (İstanbul, Sarıyer), applying primarily to game development roles. Background: Java, Python, C/C#, Unity, Flutter, React, some embedded/hardware work. Real hobbies/credentials: scuba diving (SSI Divemaster, board member of Koç University's underwater sports club), basketball, ultimate frisbee (team captain, Koç Ramses, 2023–2024 season), photography.

## CONTENT TO PRESERVE (pull accurately from the repo, don't invent or drop anything)

- About/profile content
- Experience: Yapı Kredi Teknoloji (Software Engineer Intern, Çayırova/Kocaeli, Feb–Jun 2026), TEGSOFT (Test Engineer Intern, İstanbul/Sarıyer, Jul–Sep 2025), IBTECH International Information and Communication Technologies (Software Engineer Intern, Gebze/Kocaeli, Sep 2024–Feb 2025), Koç University Underwater Sports Club/KUSAS (Board Member, İstanbul/Sarıyer), Koç University Renewable Energy Community/KUREC (Team Member, STM32/Teknofest work, İstanbul/Sarıyer), Koç Ramses Ultimate Frisbee Team (Player, Team Captain 2023–2024, İstanbul/Sarıyer)
- Skills across all current categories
- Projects: PocketPet (concept stage ONLY — I have not started building it yet, never fabricate progress, features, or a timeline; frame it honestly as "next up," a Unity/C# virtual pet game, nothing more), RokueQuest (Java roguelike), KUMap (Flutter, published on Koç Hub — include the real link to kumap.hub.ku.edu.tr), ACTIVE (Flutter/Google Maps/AR, built around an AI travel companion), EPL Predictor '26 (Python/XGBoost/React), PhotoCloud (Java/Swing)
- Contact: cagribilginer60@gmail.com (correct/primary — update everywhere if an older address is present), GitHub, LinkedIn, Instagram, X, Reddit, résumé link — all currently in the repo

## CONTENT HONESTY RULES (non-negotiable)

- PocketPet: concept stage only, no fabricated progress/features/timeline
- Never invent facts, metrics, or details not present in the repo or this brief
- Keep all company names, dates, locations exactly accurate

## DESIGN DIRECTION — CHOSEN CONCEPT: "Dive Physics Playground"

I want the site to actually **be a small, genuinely fun 2D physics-based game**, not just a game-*themed* UI. Reference point for the feeling I want (not the visual style, not 3D): **bruno-simon.com** — specifically the sense of real physical momentum, collision, and toy-like interactivity that makes exploring the site itself enjoyable. I want that feeling of playful, physical interactivity, but executed in 2D so it can actually reach high polish (no Three.js, no 3D models, no drivable 3D world).

### Core mechanic — "Buoyancy Control"

The visitor controls a simple, flat-vector diver character using real 2D physics (e.g. Matter.js), inspired by neutral buoyancy in actual diving:

- **Controls:** click-and-hold with the mouse to "kick" toward the cursor; release and the character drifts with momentum and gentle drag, never stopping abruptly. Arrow keys as an alternate control scheme.
- **Physical feel:** soft acceleration/deceleration, a slight idle sway (like real buoyancy), no snappy/instant movement.
- **Current zones:** a few areas of the play space have a gentle current (shown with subtle directional particles/arrows) that nudge the character, adding a bit of unpredictability and fun.

### Content = physics objects

Every portfolio item (experience entries, projects, skills groupings) exists in the scene as a real physics body:

- Simple flat-vector shapes with clean, deliberate silhouettes (e.g. circular "tank" icons, hexagonal "card" plates) — geometric graphic design, not illustration, no gradients/shading standing in for realism.
- Objects respond to real collisions: the character bumps into them, they can bump into each other (this is where the "fun" comes from — a bit of unpredictable domino/physical interaction, like Bruno Simon's site).
- Objects are grouped by category but not perfectly static — they're loosely anchored (spring/anchor constraints) so they settle into readable clusters instead of drifting away or overlapping the whole screen.
- Clicking or dragging-and-releasing an object opens its content panel: real text, high-contrast, on a calm solid surface — never text over the busy/animated scene.

### Visual style

Flat-vector, 3–4 color palette, minimal or no shading (long-shadow / Alto's Odyssey / Downwell-style aesthetic — not attempted realism). Background: a simple vertical gradient (dark-to-light blue) with a few parallax layers of simple circular bubbles (vector, not textured). A ground line and a few minimal rock silhouettes so the scene never reads as empty. If any icons or small illustrated elements are used anywhere on the site, they must be executed with real visual care — clean silhouettes, deliberate shape language — never flat placeholder shapes standing in for detail.

### Accessibility fallback (mandatory, not optional)

- A persistent, always-visible "List View" toggle that fully bypasses the physics/game mode and shows the same content as a normal static list/card layout.
- Keyboard-only users: Tab cycles through objects in a logical order, Enter/Space opens them — this works independent of the physics simulation (objects have fixed logical positions for this purpose even if their visual position drifted).
- Touch/mobile: tap-and-drag equivalent of the mouse control; also fully usable via the List View toggle.
- `prefers-reduced-motion`: disable drift/momentum/currents entirely and show objects in their settled/anchored positions; the game becomes a static, clickable diagram rather than a moving scene.

## OTHER PATTERNS THAT ARE STILL OFF-LIMITS

- The generic modern-SaaS/AI-startup landing page look: centered name + tagline + social icon row + "Resume" button + scroll cue, glassy/translucent cards, blurred radial glows, generic rounded "friendly" sans-serif everywhere
- A walking pixel-art character visiting labeled folders (About Me / Portfolio / Contact Me) — a specific, recognizable concept from another developer's portfolio
- Any full 3D environment, 3D models, or Three.js-driven explorable world (the physics playground is 2D only)
- A first-person 3D room/bedroom you click around in, or a fake desktop-OS/window-manager interface with a game folder inside it
- Any pet/animal mascot or companion character
- A basketball-shooting mechanic (tried in an earlier attempt, off the table)
- Scroll-jacking or anything that hijacks normal scroll/input behavior beyond the physics play area itself
- Heavy pixel-font or decorative typography on body text or anything meant to be read quickly — headings and body copy need a clean, sharp, genuinely readable typeface with strong contrast
- Large dead/empty viewport space anywhere in the layout
- Low-contrast text-on-texture or text-on-busy-background combinations — every block of readable text needs a calm, high-contrast surface behind it, no exceptions

## PROCESS — DO THIS BEFORE WRITING ANY CODE

1. Inventory the current repo's real content so nothing gets lost or invented.
2. Propose a complete written design spec, including an honest assessment of execution risk: what specifically makes you confident the physics playground will feel fun and polished rather than janky or sparse? Describe the actual visual treatment of every object type (not just "geometric shapes" as a vague description).
3. Include the structure/flow, typography (name real typefaces, justify readability), full color palette with contrast ratios for every text-on-background pairing, and exactly how the physics interaction and content panels work together.
4. Explain in detail how this degrades for keyboard-only users, touch/mobile users, and `prefers-reduced-motion` — this is not optional given the physics-based core mechanic.
5. Wait for my explicit approval before writing implementation code.

## TECHNICAL CONSTRAINTS

- Lightweight and fast-loading (physics engine choice should be lightweight — e.g. Matter.js — and the simulation should be scoped/paused when off-screen or not interacted with)
- Fully responsive
- Accessible: strong contrast everywhere, full keyboard operability, no information trapped behind a gesture some users can't perform (see accessibility fallback above)
- Preserve existing SEO/meta tags and GitHub Pages deployment setup; update the site description to lead with game development
- Clean, organized, commented code
