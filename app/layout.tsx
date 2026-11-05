import type { Metadata } from 'next';
import './globals.css';
import { TRPCProvider } from './providers';

export const metadata: Metadata = {
  title: 'PerBlinkist - Personal Audiobook Summaries',
  description: 'Self-hosted, minimalist audiobook summary library powered by open metadata APIs and tRPC',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased selection:bg-zinc-800 selection:text-zinc-100 font-sans">
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
