'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Gamepad2, Trophy, User, LogIn } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  
  return (
    <nav className="fixed top-0 left-0 w-full z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-2xl flex items-center justify-between px-6 py-3 shadow-2xl">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-900 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <span className="font-black text-xl tracking-tight text-white hidden sm:block">
            TDV <span className="text-zinc-500">Arena</span>
          </span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-2 sm:gap-6">
          <Link href="/" className={`text-sm font-bold flex items-center gap-2 transition-colors ${pathname === '/' ? 'text-white' : 'text-zinc-400 hover:text-white'}`}>
            <Gamepad2 className="w-4 h-4" />
            <span className="hidden sm:block">Oyunlar</span>
          </Link>
          <Link href="/leaderboard" className={`text-sm font-bold flex items-center gap-2 transition-colors ${pathname === '/leaderboard' ? 'text-amber-400' : 'text-zinc-400 hover:text-amber-400'}`}>
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:block">Reytinq</span>
          </Link>
        </div>

        {/* Auth */}
        <div className="flex items-center">
          <Link href="/login" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all active:scale-95">
            <LogIn className="w-4 h-4" />
            <span>Giriş</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
