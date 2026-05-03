export interface WorkItem {
  title: string;
  summary: string;
  technologies: string[];
  /** Omit when there is no public URL yet (card hides the link button). */
  link?: string;
  imageUrl: string;
}

export const workData: WorkItem[] = [
  {
    title: 'KUMap',
    summary:
      'Cross-platform Flutter application for navigating Koç University’s campus: interactive maps, building and landmark context, and wayfinding tuned for daily student life—from lectures and labs to dorms and common hubs. Designed for clarity on small screens with smooth panning/zoom and quick orientation on the Sarıyer campus. Published on Koç Hub; try it at https://kumap.hub.ku.edu.tr.',
    technologies: ['Flutter', 'Campus maps', 'Navigation', 'Koç Hub'],
    link: 'https://kumap.hub.ku.edu.tr',
    imageUrl: '/assets/projects/project1.png',
  },
  {
    title: 'ACTIVE',
    summary:
      'Adaptive Context-aware Travel Intelligent Virtual Explorer: a Flutter app combining Google Maps navigation, AR moments, and an AI companion for smarter trip exploration.',
    technologies: ['Flutter', 'Google Maps', 'AR', 'AI'],
    imageUrl: '/assets/projects/project2.png',
  },
  {
    title: 'EPL Predictor ’26',
    summary:
      'Multi-stage ML pipeline for English Premier League outcomes: regress expected goals (xG) per match, then classify home–draw–away using those predictions. Built on archival and rolling-form data (2000–2025) plus live 2025–26 signals; ensemble models with XGBoost leading around 52% accuracy in evaluation. Insights exposed through a real-time React and Tailwind dashboard.',
    technologies: ['Python', 'XGBoost', 'Ensembles', 'React', 'Tailwind', 'Sports analytics'],
    imageUrl: '/assets/projects/project3.png',
  },
  {
    title: 'RokueQuest',
    summary:
      'Roguelike dungeon crawler in Java with procedural generation, turn-based combat, loot, and permadeath—structured as a COMP302-style software engineering game project.',
    technologies: ['Java', 'Roguelike', 'OOP', 'Swing'],
    link: 'https://github.com/cago8/RokueQuest-A-Roguelike-Adventure-with-Java',
    imageUrl: '/assets/projects/project4.png',
  },
  {
    title: 'PhotoCloud',
    summary:
      'Desktop Java social app inspired by Instagram: authentication, photo sharing, likes and comments, profiles, discovery, and layered architecture with Swing UI.',
    technologies: ['Java', 'Swing', 'OOP', 'Desktop UI'],
    link: 'https://github.com/cago8/PhotoCloud',
    imageUrl: '/assets/projects/project5.png',
  },
];
