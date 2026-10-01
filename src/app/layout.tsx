import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const jbMono = JetBrains_Mono({ subsets: ["latin"], variable: '--font-jb-mono' });

export const metadata: Metadata = {
  title: "TDV Arena | Şahmat & Dama Klubu",
  description: "TDV Community Labs tərəfindən yaradılmış onlayn stolüstü oyunlar arenası.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="az" className="dark">
      <body className={`${inter.variable} ${jbMono.variable} font-sans bg-zinc-950 text-white min-h-screen selection:bg-purple-500/30`}>
        {/* Synthwave Ambient Background */}
        <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-zinc-950 flex items-center justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.15),transparent_70%)]"></div>
          <div className="absolute bottom-0 w-full h-[50vh] bg-gradient-to-t from-purple-900/10 to-transparent"></div>
        </div>
        
        {/* Navbar Header */}
        <header className="fixed top-0 left-0 right-0 h-16 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl z-50 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <a href="/" className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold hover:scale-105 transition-transform">
              T
            </a>
            <div>
              <h1 className="text-sm font-black tracking-tight text-white leading-tight">TDV ARENA</h1>
              <span className="text-[10px] text-purple-400 font-bold tracking-widest uppercase block">Stolüstü Oyunlar</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a href="/leaderboard" className="hidden sm:block text-xs font-bold text-zinc-400 hover:text-white transition">Reytinq</a>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Server
            </div>
            <a href="/login" className="text-xs font-bold px-4 py-2 bg-white text-black rounded-lg hover:bg-zinc-200 transition">
              Giriş
            </a>
          </div>
        </header>

        <main className="pt-16 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
