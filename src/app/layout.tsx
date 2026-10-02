import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const jbMono = JetBrains_Mono({ subsets: ["latin"], variable: '--font-jb-mono' });

export const viewport = { themeColor: '#f59e0b' };
export const metadata: Metadata = {
  title: "TDV Arena | Şahmat & Dama Klubu", manifest: "/manifest.json", 
  description: "TDV Community Labs tərəfindən yaradılmış onlayn stolüstü oyunlar arenası.",
};

import { Toaster } from 'react-hot-toast';
import DailyQuests from '@/components/DailyQuests';
import PageTransition from '@/components/PageTransition';
import GlobalUXEngine from '@/components/GlobalUXEngine';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="az" className="dark">
      <body className={`${inter.variable} ${jbMono.variable} font-sans bg-zinc-950 text-white min-h-screen selection:bg-purple-500/30`}>
        <GlobalUXEngine />
        {/* Synthwave Ambient Background */}
        <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-zinc-950 flex items-center justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.15),transparent_70%)]"></div>
          <div className="absolute bottom-0 w-full h-[50vh] bg-gradient-to-t from-purple-900/10 to-transparent"></div>
        </div>
        
        <Navbar />
        <DailyQuests />

        <main className="pt-24 min-h-screen">
          <PageTransition>{children}</PageTransition>
        <Toaster position="top-center" toastOptions={{ style: { background: '#18181b', color: '#fff', border: '1px solid #27272a' } }} />
        </main>
      </body>
    </html>
  );
}



