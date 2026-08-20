export interface ProjectLink {
  label: string;
  href: string;
}

export interface Project {
  title: string;
  /** Compact name drawn on the object in the playground; defaults to title. */
  short?: string;
  /** Short flag rendered above the title, e.g. "Next up". */
  status?: string;
  summary: string;
  technologies: string[];
  links: ProjectLink[];
  /** Omitted for projects with no build to show yet. */
  image?: string;
}

export const projects: Project[] = [
  {
    title: 'PocketPet',
    status: 'Next up',
    summary:
      'A virtual pet game in Unity and C#. This one is at concept stage — I have not started building it yet. It is simply what I am picking up next.',
    technologies: ['Unity', 'C#'],
    links: [],
  },
  {
    title: 'RokueQuest',
    summary:
      'Roguelike dungeon crawler in Java with procedural generation, turn-based combat, loot and permadeath — structured as a COMP302-style software engineering game project.',
    technologies: ['Java', 'Roguelike', 'OOP', 'Swing'],
    links: [
      {
        label: 'Code',
        href: 'https://github.com/cago8/RokueQuest-A-Roguelike-Adventure-with-Java',
      },
    ],
    image: '/assets/projects/project4.webp',
  },
  {
    title: 'KUMap',
    summary:
      'Cross-platform Flutter application for navigating Koç University’s campus: interactive maps, building and landmark context, and wayfinding tuned for daily student life — from lectures and labs to dorms and common hubs. Designed for clarity on small screens with smooth panning and zoom, and quick orientation on the Sarıyer campus. Published on Koç Hub.',
    technologies: ['Flutter', 'Campus maps', 'Navigation', 'Koç Hub'],
    links: [{ label: 'kumap.hub.ku.edu.tr', href: 'https://kumap.hub.ku.edu.tr' }],
    image: '/assets/projects/project1.webp',
  },
  {
    title: 'ACTIVE',
    summary:
      'Adaptive Context-aware Travel Intelligent Virtual Explorer: a Flutter app combining Google Maps navigation, AR moments and an AI travel companion for smarter trip exploration.',
    technologies: ['Flutter', 'Google Maps', 'AR', 'AI'],
    links: [],
    image: '/assets/projects/project2.webp',
  },
  {
    title: 'EPL Predictor ’26',
    short: 'EPL Predictor',
    summary:
      'Multi-stage ML pipeline for English Premier League outcomes: regress expected goals (xG) per match, then classify home–draw–away using those predictions. Built on archival and rolling-form data (2000–2025) plus live 2025–26 signals; ensemble models with XGBoost leading around 52% accuracy in evaluation. Insights exposed through a real-time React and Tailwind dashboard.',
    technologies: ['Python', 'XGBoost', 'Ensembles', 'React', 'Tailwind', 'Sports analytics'],
    links: [],
    image: '/assets/projects/project3.webp',
  },
  {
    title: 'PhotoCloud',
    summary:
      'Desktop Java social app inspired by Instagram: authentication, photo sharing, likes and comments, profiles, discovery, and a layered architecture behind a Swing UI.',
    technologies: ['Java', 'Swing', 'OOP', 'Desktop UI'],
    links: [{ label: 'Code', href: 'https://github.com/cago8/PhotoCloud' }],
    image: '/assets/projects/project5.webp',
  },
];
