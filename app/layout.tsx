import type { Metadata } from "next";
import { IBM_Plex_Mono, JetBrains_Mono } from "next/font/google";
import { site } from "../config/site";
import "./globals.css";
import Navbar from "../components/Navbar";
import CursorEffect from "../components/CursorEffect";
import PageLoader from "../components/PageLoader";

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-display",
  weight: ["500", "600", "700"],
  subsets: ["latin", "latin-ext"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-reading",
  weight: ["400", "500", "600"],
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: site.title,
  description: site.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${ibmPlexMono.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PageLoader />
        <CursorEffect />
        <Navbar />
        <div className="app-reveal">{children}</div>
      </body>
    </html>
  );
}
