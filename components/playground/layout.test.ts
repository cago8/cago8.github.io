import { describe, expect, it } from 'vitest';
import { PORTRAIT_CLEAR_Y, buildLayout, modeFor, type Placement } from './layout';
import { CATEGORY_ORDER, sceneObjects } from './scene';

/**
 * Layout bugs are invisible until someone's screen finds them, so the geometry
 * is asserted rather than eyeballed. These aspects cover phones, tablets held
 * upright, resized windows, laptops, ultrawides, and both sides of every mode
 * boundary.
 */
const ASPECTS = [0.42, 0.5, 0.62, 0.75, 0.94, 0.95, 1.1, 1.3, 1.49, 1.5, 1.78, 2.1, 2.6, 3.2];

function overlaps(a: Placement, b: Placement) {
  return Math.abs(a.x - b.x) < a.hw + b.hw && Math.abs(a.y - b.y) < a.hh + b.hh;
}

describe.each(ASPECTS)('layout at aspect %s', (aspect) => {
  const layout = buildLayout(aspect);
  const placements = [...layout.placements.entries()];

  it('fills the stage exactly — the canvas never letterboxes', () => {
    expect(layout.world.w / layout.world.h).toBeCloseTo(aspect, 5);
  });

  it('places every scene object exactly once', () => {
    expect(layout.placements.size).toBe(sceneObjects.length);
    for (const obj of sceneObjects) expect(layout.placements.has(obj.id)).toBe(true);
  });

  it('keeps every object inside the water', () => {
    for (const [id, p] of placements) {
      expect(p.x - p.hw, `${id} left`).toBeGreaterThanOrEqual(0);
      expect(p.x + p.hw, `${id} right`).toBeLessThanOrEqual(layout.world.w);
      expect(p.y - p.hh, `${id} top`).toBeGreaterThanOrEqual(0);
      expect(p.y + p.hh, `${id} bottom`).toBeLessThanOrEqual(layout.seabedY);
    }
  });

  it('never overlaps two objects', () => {
    for (let i = 0; i < placements.length; i++) {
      for (let j = i + 1; j < placements.length; j++) {
        const [idA, a] = placements[i];
        const [idB, b] = placements[j];
        expect(overlaps(a, b), `${idA} overlaps ${idB}`).toBe(false);
      }
    }
  });

  it('spawns the diver in open water', () => {
    const diver: Placement = {
      x: layout.diverStart.x,
      y: layout.diverStart.y,
      hw: 30,
      hh: 30,
      r: 30,
    };
    for (const [id, p] of placements) {
      expect(overlaps(diver, p), `diver spawns inside ${id}`).toBe(false);
    }
    expect(layout.diverStart.y).toBeLessThan(layout.seabedY);
  });

  it("leaves the lower band clear on portrait — the diver's own lane", () => {
    if (modeFor(aspect) !== 'portrait') return;
    const limit = layout.world.h * PORTRAIT_CLEAR_Y;
    for (const [id, p] of placements) {
      expect(p.y + p.hh, `${id} sits in the diver's lane`).toBeLessThanOrEqual(limit);
    }
  });

  it('lists exactly the objects it placed', () => {
    expect(layout.objects.map((o) => o.id).sort()).toEqual([...layout.placements.keys()].sort());
  });
});

/**
 * The mobile tab layout. Every invariant the full composition has to hold still
 * holds when the scene is narrowed to one category — plus the new one that
 * makes the tabs mean anything: nothing from another category is in the water.
 */
describe.each(CATEGORY_ORDER)('focused layout: %s', (category) => {
  // Phone-shaped, which is the only shape this layout is ever built at.
  describe.each([0.42, 0.5, 0.62, 1.6])('at aspect %s', (aspect) => {
    const layout = buildLayout(aspect, category);
    const placements = [...layout.placements.entries()];

    it('places that category and nothing else', () => {
      const expected = sceneObjects.filter((o) => o.category === category);
      expect(layout.focus).toBe(category);
      expect(layout.objects).toEqual(expected);
      expect(layout.placements.size).toBe(expected.length);
      for (const obj of expected) expect(layout.placements.has(obj.id)).toBe(true);
    });

    it('keeps every object inside the water', () => {
      for (const [id, p] of placements) {
        expect(p.x - p.hw, `${id} left`).toBeGreaterThanOrEqual(0);
        expect(p.x + p.hw, `${id} right`).toBeLessThanOrEqual(layout.world.w);
        expect(p.y - p.hh, `${id} top`).toBeGreaterThanOrEqual(0);
        expect(p.y + p.hh, `${id} bottom`).toBeLessThanOrEqual(layout.seabedY);
      }
    });

    it('never overlaps two objects', () => {
      for (let i = 0; i < placements.length; i++) {
        for (let j = i + 1; j < placements.length; j++) {
          const [idA, a] = placements[i];
          const [idB, b] = placements[j];
          expect(overlaps(a, b), `${idA} overlaps ${idB}`).toBe(false);
        }
      }
    });

    it("spawns the diver in open water, below every object's band", () => {
      const diver: Placement = {
        x: layout.diverStart.x,
        y: layout.diverStart.y,
        hw: 30,
        hh: 30,
        r: 30,
      };
      for (const [id, p] of placements) {
        expect(overlaps(diver, p), `diver spawns inside ${id}`).toBe(false);
        expect(p.y + p.hh, `${id} sits in the diver's lane`).toBeLessThanOrEqual(
          layout.world.h * PORTRAIT_CLEAR_Y,
        );
      }
      expect(layout.diverStart.y).toBeLessThan(layout.seabedY);
    });

    it('draws the objects no smaller than the crowded full composition does', () => {
      // The whole point of the tab bar: one category alone gets the room that
      // five categories had to share, so it must never come out smaller.
      expect(layout.scale).toBeGreaterThanOrEqual(buildLayout(aspect).scale);
    });
  });
});

describe('mode selection', () => {
  it('switches at the documented boundaries', () => {
    expect(modeFor(0.94)).toBe('portrait');
    expect(modeFor(0.95)).toBe('standard');
    expect(modeFor(1.49)).toBe('standard');
    expect(modeFor(1.5)).toBe('wide');
  });
});
