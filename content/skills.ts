export interface SkillGroup {
  title: string;
  /** Compact name drawn on the object in the playground. */
  short: string;
  items: string[];
}

export const skills: SkillGroup[] = [
  {
    title: 'Game development',
    short: 'Game dev',
    items: ['Unity', 'C#', 'Game systems', 'OOP architecture'],
  },
  {
    title: 'Programming languages',
    short: 'Languages',
    items: ['Java', 'Python', 'C', 'C#', 'Swift', 'Dart', 'JavaScript'],
  },
  {
    title: 'Frontend & mobile',
    short: 'Frontend',
    items: ['Flutter', 'React', '.NET / XAML'],
  },
  {
    title: 'Databases & data',
    short: 'Data',
    items: ['SQL', 'Redis', 'Qdrant'],
  },
  {
    title: 'DevOps & tooling',
    short: 'DevOps',
    items: ['Docker', 'Railway', 'Git', 'GitHub'],
  },
  {
    title: 'Embedded & hardware',
    short: 'Embedded',
    items: ['STM32', 'Embedded C', 'Dashboard / HMI'],
  },
  {
    title: 'AI & assistants',
    short: 'AI',
    items: ['Claude', 'Cursor', 'ML exploration'],
  },
  {
    title: 'Design',
    short: 'Design',
    items: ['Photoshop'],
  },
];
