import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PerBlinkist - Personal Audiobook Summaries',
  description: 'Self-hosted, modern audiobook summary library powered by open metadata APIs',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
