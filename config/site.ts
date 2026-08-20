/**
 * Single source of truth for identity, links and SEO strings.
 * Anything user-facing that appears in more than one place lives here.
 */
export const site = {
  name: 'Çağrı Bilginer',
  givenName: 'Çağrı',
  familyName: 'Bilginer',
  title: 'Çağrı Bilginer — Game Development Portfolio',
  description:
    'Game development (Unity, C#) — portfolio of Çağrı Bilginer, Computer Engineering graduate of Koç University. Explore it as a 2D physics playground, or as a plain list.',
  url: 'https://cago8.github.io',
  email: 'cagribilginer60@gmail.com',
  resume: '/assets/cv.pdf',
  location: 'İstanbul, Sarıyer',
  social: {
    github: 'https://github.com/cago8',
    linkedin: 'https://www.linkedin.com/in/cagribilginer',
    instagram: 'https://www.instagram.com/cagri.bilginer',
    x: 'https://twitter.com/cagri_bilginer',
    reddit: 'https://www.reddit.com/user/cago_8',
  },
} as const;

/** FormSubmit works from a fully static export — no server route required. */
export const formSubmitAjaxUrl = `https://formsubmit.co/ajax/${site.email}`;

export interface SocialLink {
  label: string;
  href: string;
  handle: string;
}

export const socialLinks: SocialLink[] = [
  { label: 'GitHub', href: site.social.github, handle: 'cago8' },
  { label: 'LinkedIn', href: site.social.linkedin, handle: 'cagribilginer' },
  { label: 'Instagram', href: site.social.instagram, handle: 'cagri.bilginer' },
  { label: 'X', href: site.social.x, handle: 'cagri_bilginer' },
  { label: 'Reddit', href: site.social.reddit, handle: 'cago_8' },
];
