// src/app/layout.tsx
import type { Metadata } from 'next';
import { JetBrains_Mono, Sora } from 'next/font/google';
import './globals.css';

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['300', '400', '500', '600', '700'],
});

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'Edex Exam',
  description: '3 bosqichli kompyuter savodxonligi imtihoni',
  icons: {
   
      icon: "/favicon.ico",

  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jetbrains.variable} ${sora.variable}`}>
      <link rel="manifest" href="/manifest.json" />
      <meta name="theme-color" content="#7dba28" />
      <body className="bg-bg text-text font-sans antialiased">{children}</body>
    </html>
  );
}
