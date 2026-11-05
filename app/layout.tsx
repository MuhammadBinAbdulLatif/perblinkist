import type { Metadata } from 'next';
import './globals.css';
import { TRPCProvider } from './providers';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

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
    <html lang="en" className={cn("dark", "font-sans", geist.variable)}>
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased selection:bg-zinc-800 selection:text-zinc-100 font-sans">
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
