import type { Metadata } from 'next';
import { Space_Mono } from 'next/font/google';
import '@/styles/globals.css';
import { SITE_URL } from '@/lib/siteUrl';

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-space-mono',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'OMNIVOID LABS - Experimental Sound & Visual Art Platform',
  description: 'Explore the intersection of sound science, technology, and consciousness through immersive audio-visual experiences. Discover research papers, live transmissions, and experimental art at OMNIVOID LABS.',
  keywords: ['experimental music', 'sound art', 'visual art', 'audio-visual', 'technology', 'consciousness', 'research', 'live transmissions', 'electronic music', 'ambient', 'drone', 'glitch', 'noise', 'digital art', 'interactive media'],
  authors: [{ name: 'OMNIVOID LABS' }],
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/`,
    title: 'OMNIVOID LABS - Experimental Sound & Visual Art Platform',
    description: 'Explore the intersection of sound science, technology, and consciousness through immersive audio-visual experiences. Discover research papers, live transmissions, and experimental art.',
    images: [{ url: '/share-image.png', width: 1200, height: 630, alt: 'OMNIVOID LABS' }],
    siteName: 'OMNIVOID LABS',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OMNIVOID LABS - Experimental Sound & Visual Art Platform',
    description: 'Explore the intersection of sound science, technology, and consciousness through immersive audio-visual experiences.',
    images: ['/share-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180' },
    ],
  },
  manifest: '/site.webmanifest',
  appleWebApp: {
    title: 'Omnivoid',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-title" content="Omnivoid" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#99ccff" />
        <meta name="msapplication-TileColor" content="#111111" />
      </head>
      <body className={`${spaceMono.variable} font-mono`}>
        {children}
      </body>
    </html>
  );
}