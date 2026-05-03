export const site = {
  name: "Çağrı Bilginer",
  givenName: "Çağrı",
  familyName: "Bilginer",
  title: "Çağrı Bilginer — Portfolio",
  description:
    "Koç University student · Java, Flutter, and AI/ML · Open to software collaboration.",
  /** Used for FormSubmit and mailto. Update if this is not your Koç address. */
  email: "cbilginer21@ku.edu.tr",
  social: {
    github: "https://github.com/cago8",
    linkedin: "https://www.linkedin.com/in/cagribilginer",
    instagram: "https://www.instagram.com/cagri.bilginer",
    x: "https://twitter.com/cagri_bilginer",
    reddit: "https://www.reddit.com/user/cago_8",
  },
} as const;

export const formSubmitAjaxUrl = `https://formsubmit.co/ajax/${site.email}`;
