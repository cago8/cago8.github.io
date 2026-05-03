export interface ExperienceItem {
  role: string;
  year: string;
  company: string;
  description: string[];
  technologies: string[];
}

export const experienceData: ExperienceItem[] = [
  {
    role: 'Software Engineer Intern',
    year: 'Feb 2026 – Jun 2026',
    company: 'Yapı Kredi Teknoloji — Istanbul, Turkey',
    description: [
      'Software engineering internship focused on building and maintaining technology solutions within the Yapı Kredi technology organization.',
      'Working with engineering teams on real product delivery, code quality, and iterative development practices.',
    ],
    technologies: ['Software engineering', 'Agile', 'Enterprise development'],
  },
  {
    role: 'Test Engineer Intern',
    year: 'July 2025 – Sep 2025',
    company: 'TEGSOFT Contact Center Softwares — Istanbul, Turkey',
    description: [
      'Designed and executed detailed functional test cases to ensure feature reliability and quality assurance for the contact center platform.',
      'Identified and tracked defects, collaborating with the development team to verify fixes.',
    ],
    technologies: ['QA', 'Functional testing', 'Defect tracking', 'Cross-team collaboration'],
  },
  {
    role: 'Software Engineer Intern',
    year: 'Sep 2024 – Feb 2025',
    company: 'IBTECH International Information and Communication Technologies — Gebze, Kocaeli, Turkey',
    description: [
      'Developed features for a banking application using Java, C#, XAML, and SQL.',
      'Assisted in testing and debugging software modules under senior developers’ guidance.',
      'Worked in an Agile environment, contributing to sprints and iterative development cycles.',
    ],
    technologies: ['Java', 'C#', 'XAML', 'SQL', 'Agile', 'Banking software'],
  },
  {
    role: 'Board Member',
    year: 'Jun 2024 – Present',
    company: 'Koç University Underwater Sports Club (KUSAS) — Koç University',
    description: [
      'As a board member, help organize scuba diving trips to coastal dive sites across Turkey for the university community.',
      'Plan meetings and events that introduce students to scuba diving and grow participation in underwater sports.',
    ],
    technologies: ['Event planning', 'Team leadership', 'Community building', 'Scuba diving'],
  },
  {
    role: 'Team Member',
    year: 'Dec 2023 – July 2024',
    company: 'Koç University Renewable Energy Community (KUREC) — Istanbul, Sarıyer, Turkey',
    description: [
      'Worked in a multidisciplinary team on Hydromobile systems for the Teknofest Efficiency Challenge.',
      'Built and debugged embedded software on STM32 and designed the in-vehicle gauge cluster / dashboard display for driver feedback.',
      'Focused on STM32 firmware and the instrument cluster display; motor driver, VCU, and other electrical hardware were handled by teammates.',
    ],
    technologies: ['STM32', 'Embedded C', 'HMI / dashboard', 'Teknofest'],
  },
  {
    role: 'Player · Team Captain (2023–2024)',
    year: 'Sep 2021 – Jun 2024',
    company: 'Koç Ramses Ultimate Frisbee Team — Koç University',
    description: [
      'Competed with the university ultimate frisbee team in trainings, tournaments, and inter-university play.',
      'Served as team captain for the 2023–2024 season, helping coordinate practices, strategy, and team culture.',
    ],
    technologies: ['Ultimate frisbee', 'Team captaincy', 'Sports leadership'],
  },
];
