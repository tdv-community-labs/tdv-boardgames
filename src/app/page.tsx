'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Trophy, Users, Star, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import GlobalChat from '@/components/GlobalChat';
import RecentFeed from '@/components/RecentFeed';

const GAMES = [
  {
    id: "connect4",
    name: "Dördünü Birləşdir",
    icon: "🔴",
    description: "Rəngli daşları salın və 4 daşı yan-yana, alt-alta və ya diaqonal birləşdirin.",
    color: "from-red-500/20 to-red-900/40",
    borderColor: "border-red-500/30",
    textColor: "text-red-400",
    badge: "YENİ"
  },
  {
    id: "chess",
    name: "Şahmat",
    icon: "♟",
    description: "Qədim strategiya oyunu. Kralı qoruyun, rəqibi mat edin.",
    color: "from-emerald-500/20 to-emerald-900/40",
    borderColor: "border-emerald-500/30",
    textColor: "text-emerald-400",
    badge: "Populyar"
  },
  {
    id: "checkers",
    name: "Dama",
    icon: "⛀",
    description: "Sürətli və taktiki. Rəqibin bütün daşlarını vurun.",
    color: "from-blue-500/20 to-blue-900/40",
    borderColor: "border-blue-500/30",
    textColor: "text-blue-400"
  },
  {
    id: "go",
    name: "Qo (Go)",
    icon: "⚪",
    description: "Ərazi nəzarəti sənəti. Sonsuz ehtimallar, dərin fəlsəfə.",
    color: "from-amber-500/20 to-amber-900/40",
    borderColor: "border-amber-500/30",
    textColor: "text-amber-400",
    badge: "Yeni"
  },
  {
    id: "othello",
    name: "Othello",
    icon: "⚫",
    description: "Bir dəqiqədə öyrənin, bir ömür boyu ustalaşın.",
    color: "from-fuchsia-500/20 to-fuchsia-900/40",
    borderColor: "border-fuchsia-500/30",
    textColor: "text-fuchsia-400",
    badge: "Yeni"
  }
];

function TiltCard({ game, index }: { game: typeof GAMES[0], index: number }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const rotateYValue = ((mouseX / width) - 0.5) * 15; // Max 15 deg
    const rotateXValue = ((mouseY / height) - 0.5) * -15; 
    
    setRotateX(rotateXValue);
    setRotateY(rotateYValue);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <Link href={`/${game.id}`} passHref legacyBehavior>
      <motion.a
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.1 }}
        style={{ perspective: 1000 }}
        className="block"
      >
        <motion.div
          animate={{ rotateX, rotateY }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className={`group relative p-8 rounded-3xl border bg-gradient-to-br ${game.color} ${game.borderColor} overflow-hidden cursor-pointer h-full`}
        >
          {/* Hover glow effect */}
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-5 transition-opacity duration-500" />
          
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className={`w-14 h-14 rounded-2xl bg-zinc-950/50 backdrop-blur border ${game.borderColor} flex items-center justify-center text-3xl shadow-xl`}>
                  {game.icon}
                </div>
                {game.badge && (
                  <span className={`px-3 py-1 rounded-full bg-zinc-950/50 backdrop-blur border ${game.borderColor} ${game.textColor} text-[10px] font-black uppercase tracking-widest`}>
                    {game.badge}
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-black text-white mb-3">{game.name}</h3>
              <p className="text-sm text-zinc-300 font-medium leading-relaxed max-w-[80%]">
                {game.description}
              </p>
            </div>
            
            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Onlayn PvP & Bot Arenası</span>
              </div>
              <div className={`w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-colors`}>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </motion.div>
      </motion.a>
    </Link>
  );
}

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto p-6 md:p-12 relative z-10">
      
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center text-center mb-16 mt-8"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
          <Star className="w-4 h-4 text-yellow-500" />
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-300">TDV İntellektual Liqası (Beta)</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-500 mb-6">
          Zəka Mübarizəsi <br />Başlayır.
        </h1>
        <p className="text-zinc-400 max-w-2xl text-sm md:text-base leading-relaxed mb-10 font-medium">
          TDV Tələbələri üçün xüsusi olaraq dizayn edilmiş real-vaxt onlayn stolüstü oyunlar arenası. 
          Sürətli eşləşdirmə, rəqabətli reytinq sistemi və güclü süni zəka (Stockfish) analizləri.
        </p>
        
        <div className="flex items-center gap-4">
          <Link href="/chess">
            <button className="flex items-center gap-2 bg-white text-black px-8 py-4 rounded-xl font-bold hover:scale-105 transition active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.2)]">
              <Play className="w-5 h-5 fill-current" />
              Şahmat (Blitz)
            </button>
          </Link>
          <button className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 text-white px-8 py-4 rounded-xl font-bold hover:bg-zinc-800 transition active:scale-95 cursor-not-allowed opacity-50">
            <Trophy className="w-5 h-5" />
            Reytinq Cədvəli
          </button>
        </div>
      </motion.div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {GAMES.map((game, i) => (
          <TiltCard key={game.id} game={game} index={i} />
        ))}
      </div>


      
      {/* Cyberpunk Command Center */}
      <div className="mt-20 w-full relative z-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent flex-1 opacity-50" />
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 uppercase tracking-[0.2em] flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_15px_#06b6d4]"></span>
            Qlobal Baza
          </h2>
          <div className="h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent flex-1 opacity-50" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Global Chat Console */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1 bg-zinc-950/80 border border-cyan-900/50 rounded-[2rem] overflow-hidden backdrop-blur-2xl relative shadow-[0_0_30px_rgba(6,182,212,0.1)]"
          >
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
            <div className="p-4 bg-cyan-950/30 border-b border-cyan-900/50 flex justify-between items-center">
              <span className="text-xs font-black text-cyan-500 uppercase tracking-widest flex items-center gap-2">
                📡 Ümumi Kanal
              </span>
              <span className="text-[9px] text-cyan-700 font-mono">SYS.COMM.ONLINE</span>
            </div>
            <div className="p-4 h-[400px]">
              <GlobalChat />
            </div>
          </motion.div>

          {/* Live Matches Feed (RecentFeed) */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-1 bg-zinc-950/80 border border-emerald-900/50 rounded-[2rem] overflow-hidden backdrop-blur-2xl relative shadow-[0_0_30px_rgba(16,185,129,0.1)]"
          >
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>
            <div className="p-4 bg-emerald-950/30 border-b border-emerald-900/50 flex justify-between items-center">
              <span className="text-xs font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                ⚔️ Canlı Nəticələr
              </span>
              <span className="text-[9px] text-emerald-700 font-mono">LIVE.FEED.SECURE</span>
            </div>
            <div className="p-4 h-[400px] overflow-hidden">
              <RecentFeed />
            </div>
          </motion.div>

          {/* Holographic Radar (Tournaments) */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="lg:col-span-1 bg-zinc-950/80 border border-purple-900/50 rounded-[2rem] overflow-hidden backdrop-blur-2xl relative shadow-[0_0_30px_rgba(168,85,247,0.1)] flex flex-col"
          >
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></div>
            <div className="p-4 bg-purple-950/30 border-b border-purple-900/50 flex justify-between items-center">
              <span className="text-xs font-black text-purple-500 uppercase tracking-widest flex items-center gap-2">
                🎯 Turnir Radarı
              </span>
              <span className="text-[9px] text-purple-700 font-mono">SCAN.TDV26.ACTV</span>
            </div>
            
            <div className="flex-1 p-6 flex flex-col items-center justify-center relative">
              <div className="absolute inset-0 bg-purple-600/5 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="relative w-48 h-48 mb-6">
                {/* SVG Stationary 6-Bucaq Radar Chart (Sabit Hexagon) */}
                <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible drop-shadow-[0_0_15px_rgba(168,85,247,0.6)]">
                  {/* Outer Hexagon Grid (Sabit 6-Bucaq) */}
                  <polygon points="50,8 86,29 86,71 50,92 14,71 14,29" fill="none" stroke="rgba(168,85,247,0.25)" strokeWidth="0.8" />
                  {/* Inner Hexagon Grid */}
                  <polygon points="50,28 69,39 69,61 50,72 31,61 31,39" fill="none" stroke="rgba(168,85,247,0.35)" strokeWidth="0.6" strokeDasharray="1.5,1.5" />
                  
                  {/* 6 Radial Axes */}
                  <line x1="50" y1="50" x2="50" y2="8" stroke="rgba(168,85,247,0.3)" strokeWidth="0.5"/>
                  <line x1="50" y1="50" x2="86" y2="29" stroke="rgba(168,85,247,0.3)" strokeWidth="0.5"/>
                  <line x1="50" y1="50" x2="86" y2="71" stroke="rgba(168,85,247,0.3)" strokeWidth="0.5"/>
                  <line x1="50" y1="50" x2="50" y2="92" stroke="rgba(168,85,247,0.3)" strokeWidth="0.5"/>
                  <line x1="50" y1="50" x2="14" y2="71" stroke="rgba(168,85,247,0.3)" strokeWidth="0.5"/>
                  <line x1="50" y1="50" x2="14" y2="29" stroke="rgba(168,85,247,0.3)" strokeWidth="0.5"/>
                  
                  {/* Active Radar Data 6-Bucaq (Sabit Poliqon) */}
                  <polygon points="50,18 80,34 76,66 50,82 22,64 24,36" fill="rgba(168, 85, 247, 0.25)" stroke="#c084fc" strokeWidth="1.6" className="animate-pulse" />
                  
                  {/* 6 Vertices */}
                  <circle cx="50" cy="18" r="2.2" fill="#fff" className="drop-shadow-[0_0_6px_#c084fc]" />
                  <circle cx="80" cy="34" r="2.2" fill="#fff" className="drop-shadow-[0_0_6px_#c084fc]" />
                  <circle cx="76" cy="66" r="2.2" fill="#fff" className="drop-shadow-[0_0_6px_#c084fc]" />
                  <circle cx="50" cy="82" r="2.2" fill="#fff" className="drop-shadow-[0_0_6px_#c084fc]" />
                  <circle cx="22" cy="64" r="2.2" fill="#fff" className="drop-shadow-[0_0_6px_#c084fc]" />
                  <circle cx="24" cy="36" r="2.2" fill="#fff" className="drop-shadow-[0_0_6px_#c084fc]" />
                </svg>

                {/* Sweeping Radar Scanner Line */}
                <div className="absolute inset-0 rounded-full border border-purple-500/20 pointer-events-none" style={{ background: 'conic-gradient(from 0deg, transparent 70%, rgba(168,85,247,0.4) 100%)', animation: 'spin 2.5s linear infinite' }}></div>
              </div>

              <div className="text-center w-full">
                <h3 className="text-lg font-black text-white mb-1">MƏRKƏZİ TURNİR ARENASI</h3>
                <p className="text-xs text-purple-400 font-bold mb-4">ÖZ TURNİRİNİ YARAT VƏ YA QOŞUL</p>
                <Link 
                  href="/tournaments"
                  className="w-full py-3 rounded-xl bg-purple-600/30 hover:bg-purple-600/60 text-purple-200 font-black text-xs uppercase tracking-wider border border-purple-500/40 transition shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>MÜBARİZƏYƏ QOŞUL</span>
                </Link>
              </div>
            </div>
          </motion.div>

        </div>
      </div>

    </div>
  );
}
