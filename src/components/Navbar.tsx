'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {   Gamepad2, Trophy, User, LogIn, LogOut, Maximize, Minimize , Volume2, VolumeX , Download } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { ref, get, set, onValue, onDisconnect } from 'firebase/database';
import { getRank } from '@/utils/ranks';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [elo, setElo] = useState<number>(1200);
  const [avatar, setAvatar] = useState<string>('😎');
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMutedState, setIsMutedState] = useState(false);
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  
  useEffect(() => {
    const presenceRef = ref(db, 'presence');
    const unsubPresence = onValue(presenceRef, (snap) => {
      setOnlineCount(snap.size || 0);
    });
    return () => unsubPresence();
  }, []);

  useEffect(() => {
    if (user) {
      const myPresenceRef = ref(db, `presence/${user.uid}`);
      set(myPresenceRef, true);
      onDisconnect(myPresenceRef).remove();
    }
  }, [user]);
  
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }
  }, []);
  
  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          setDeferredPrompt(null);
        }
      });
    }
  };
  
  useEffect(() => { if (typeof window !== 'undefined') setIsMutedState(localStorage.getItem('tdv-muted') === 'true'); }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
        if (currentUser) {
          get(ref(db, `users/${currentUser.uid}`)).then(snap => {
            if (snap.exists()) {
              setElo(snap.val().elo || 1200);
              if (snap.val().avatar) setAvatar(snap.val().avatar);
            }
          });
        }
        setLoading(false);
    });

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      unsubscribe();
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleToggleMute = () => {
    const muted = localStorage.getItem('tdv-muted') === 'true';
    localStorage.setItem('tdv-muted', (!muted).toString());
    setIsMutedState(!muted);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => console.error(e));
    } else {
      document.exitFullscreen().catch(e => console.error(e));
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };
  
  return (
    <nav className="fixed top-0 left-0 w-full z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-2xl flex items-center justify-between px-6 py-3 shadow-2xl">
        
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

          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-zinc-950 border border-zinc-800 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-zinc-400">{onlineCount} onlayn</span>
          </div>
  
          </div>

        {/* Auth & Tools */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={toggleFullscreen} 
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors hidden sm:block" 
            title="Tam Ekran"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-950 border border-zinc-800 text-xs font-semibold text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Canlı (Firebase)
          </div>

          {loading ? (
            <div className="w-24 h-9 bg-zinc-800 animate-pulse rounded-xl" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <Link href="/profile" className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg transition-colors">
                <User className="w-4 h-4 text-purple-400" />
                {(() => { const r = getRank(elo); return <span className="text-sm font-bold text-white flex items-center gap-2" title={r.name}>{user.displayName || 'Oyunçu'} <span className="text-xs">{r.icon}</span></span>; })()}
                </Link>
                <button onClick={handleLogout} className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Çıxış et">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link href="/login" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all active:scale-95">
              <LogIn className="w-4 h-4" />
              <span>Giriş</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

