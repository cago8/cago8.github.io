import type { Metadata } from 'next';
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import { site } from '../config/site';
import './globals.css';

/**
 * Space Grotesk for display and UI: a sharp geometric grotesque with cut
 * terminals — it reads as technical/game without being a novelty face, and it
 * holds up at 5rem for the name. IBM Plex Sans carries all body copy: large
 * x-height, open apertures, drawn for long-form UI reading. IBM Plex Mono
 * handles dates, labels and chips. All three ship latin-ext, which the Turkish
 * ç, ğ, ı, ş in this content require.
 */
const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  weight: ['500', '600', '700'],
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
});

const plexSans = IBM_Plex_Sans({
  variable: '--font-plex-sans',
  weight: ['400', '500', '600'],
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  weight: ['400', '500'],
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: site.title,
  description: site.description,
  keywords: [
    'game development',
    'Unity',
    'C#',
    'Computer Engineering',
    'Koç University',
    'Çağrı Bilginer',
  ],
  authors: [{ name: site.name, url: site.url }],
  icons: { icon: '/myicon.ico' },
  openGraph: {
    type: 'website',
    url: site.url,
    title: site.title,
    description: site.description,
    siteName: site.name,
  },
  twitter: {
    card: 'summary',
    title: site.title,
    description: site.description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${plexSans.variable} ${plexMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
