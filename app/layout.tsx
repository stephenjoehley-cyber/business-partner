import type { Metadata } from 'next';
import { Inter, IBM_Plex_Mono, Fraunces } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['500'],
});

// Two static weight instances only, not the full variable range — Asset
// 021's editorial typography is deliberately rare (page titles, Morning
// Brief headlines), so its payload should stay proportionate to that.
// 500 for supporting editorial statements, 600 for titles/headlines.
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-editorial',
});

export const metadata: Metadata = {
  title: 'Business Partner',
  description: 'Business Partner shows you what\u2019s already been considered and brings forward only what genuinely needs you today.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${plexMono.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  );
}
