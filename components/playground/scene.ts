/**
 * Identity of everything in the playground: what exists, what it is called,
 * what shape it takes and how big it is at design scale.
 *
 * Position lives in `layout.ts`, not here. The scene is a fixed cast; the
 * layout decides where that cast stands for a given screen shape. Keeping the
 * two apart is what makes one object table serve an ultrawide monitor and a
 * phone, and it is why the reduced-motion and keyboard fallbacks still work:
 * every object has a known settled position independent of physics.
 */
import { experience } from '../../content/experience';
import { projects } from '../../content/projects';
import { skills } from '../../content/skills';
import type { Category } from './palette';

export type SceneShape = 'medallion' | 'hex' | 'gauge' | 'cartridge' | 'buoy';

export interface SceneObject {
  /** Stable id — used for React keys, DOM ids and body lookup. */
  id: string;
  category: Category;
  shape: SceneShape;
  /** Index into the source content array; -1 for the singletons. */
  index: number;
  /** Drawn on the object. Kept short so it never wraps past two lines. */
  label: string;
  /** Small mono line above the label (dates, status). */
  sublabel?: string;
  /** Full name for the keyboard proxy button and screen readers. */
  a11yLabel: string;
  /** Heading shown at the top of the object's content panel. */
  title: string;
  /**
   * Half-width / half-height / circumradius at design scale. The layout scales
   * these down on narrow screens, so nothing but `layout.ts` should read them
   * directly — everyone else uses the resolved `Placement`.
   */
  baseHw: number;
  baseHh: number;
  baseR: number;
}

const HEX_R = 96;
const GAUGE_R = 58;

export const sceneObjects: SceneObject[] = [
  {
    id: 'profile',
    category: 'profile',
    shape: 'medallion',
    index: -1,
    label: 'Profile',
    a11yLabel: 'Profile — about Çağrı Bilginer',
    title: 'Profile',
    baseHw: 80,
    baseHh: 80,
    baseR: 80,
  },
  ...experience.map((item, i) => ({
    id: `experience-${i}`,
    category: 'experience' as Category,
    shape: 'hex' as SceneShape,
    index: i,
    label: item.short,
    sublabel: item.year.replace(/\s–\s/, '–').replace(/\s\d{4}/g, (m) => m.trim().slice(2)),
    a11yLabel: `${item.role} at ${item.company}, ${item.year}`,
    title: item.role,
    baseHw: HEX_R,
    baseHh: (Math.sqrt(3) / 2) * HEX_R,
    baseR: HEX_R,
  })),
  ...skills.map((group, i) => ({
    id: `skills-${i}`,
    category: 'skills' as Category,
    shape: 'gauge' as SceneShape,
    index: i,
    label: group.short,
    a11yLabel: `${group.title} — ${group.items.length} skills`,
    title: group.title,
    baseHw: GAUGE_R,
    baseHh: GAUGE_R,
    baseR: GAUGE_R,
  })),
  ...projects.map((project, i) => ({
    id: `projects-${i}`,
    category: 'projects' as Category,
    shape: 'cartridge' as SceneShape,
    index: i,
    label: project.short ?? project.title,
    sublabel: project.status,
    a11yLabel: `${project.title} — project`,
    title: project.title,
    baseHw: 93,
    baseHh: 64,
    baseR: 93,
  })),
  {
    id: 'contact',
    category: 'contact',
    shape: 'buoy',
    index: -1,
    label: 'Contact',
    a11yLabel: 'Contact — email, links and a message form',
    title: 'Contact',
    baseHw: 85,
    baseHh: 63,
    baseR: 85,
  },
];

/** Category order — drives the legend, the tab order and the band tables. */
export const CATEGORY_ORDER = ['profile', 'experience', 'skills', 'projects', 'contact'] as const;
