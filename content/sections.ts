/**
 * The five content areas. Order drives the legend, the playground clusters,
 * the keyboard tab order and the section order in List View.
 */
export type SectionId = 'profile' | 'experience' | 'skills' | 'projects' | 'contact';

export interface SectionDef {
  id: SectionId;
  label: string;
  /** One line shown under the section heading in List View. */
  blurb: string;
}

export const sections: SectionDef[] = [
  {
    id: 'profile',
    label: 'Profile',
    blurb: 'Who I am and what I am aiming at.',
  },
  {
    id: 'experience',
    label: 'Experience',
    blurb: 'Internships, clubs and teams — six entries.',
  },
  {
    id: 'skills',
    label: 'Skills',
    blurb: 'Grouped by what I actually use them for.',
  },
  {
    id: 'projects',
    label: 'Projects',
    blurb: 'Shipped work, coursework, and what is next.',
  },
  {
    id: 'contact',
    label: 'Contact',
    blurb: 'Email, links and a message form.',
  },
];
