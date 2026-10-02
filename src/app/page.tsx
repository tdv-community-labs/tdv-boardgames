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
    players: "0",
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
    players: "124",
    badge: "Populyar"
  },
  {
    id: "checkers",
    name: "Dama",
    icon: "⛀",
    description: "Sürətli və taktiki. Rəqibin bütün daşlarını vurun.",
    color: "from-blue-500/20 to-blue-900/40",
    borderColor: "border-blue-500/30",
    textColor: "text-blue-400",
    players: "89"
  },
  {
    id: "go",
    name: "Qo (Go)",
    icon: "⚪",
    description: "Ərazi nəzarəti sənəti. Sonsuz ehtimallar, dərin fəlsəfə.",
    color: "from-amber-500/20 to-amber-900/40",
    borderColor: "border-amber-500/30",
    textColor: "text-amber-400",
    players: "45",
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
    players: "12",
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
          className={`group relative p-8 rounded-3xl border bg-gradient-to-br \${game.color} \${game.borderColor} overflow-hidden cursor-pointer h-full`}
        >
          {/* Hover glow effect */}
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-5 transition-opacity duration-500" />
          
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className={`w-14 h-14 rounded-2xl bg-zinc-950/50 backdrop-blur border \${game.borderColor} flex items-center justify-center text-3xl shadow-xl`}>
                  {game.icon}
                </div>
                {game.badge && (
                  <span className={`px-3 py-1 rounded-full bg-zinc-950/50 backdrop-blur border \${game.borderColor} \${game.textColor} text-[10px] font-black uppercase tracking-widest`}>
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
                <Users className="w-4 h-4" />
                <span>{game.players} Oyunçu onlayndır</span>
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


      {/* Live Tournament Board */}
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-16 w-full bg-zinc-900/50 border border-purple-500/20 rounded-[2rem] p-8 backdrop-blur-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="flex flex-col md:flex-row gap-8 items-center relative z-10">
          
          <div className="flex-1 w-full">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-white flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_#ef4444]"></span>
                CANLI TURNİR <span className="text-purple-400">#TDV26</span>
              </h2>
              <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full text-xs font-bold text-purple-400">
                128 İŞTİRAKÇI
              </span>
            </div>

            <div className="space-y-4">
              {[
                { name: "Ali R.", game: "Şahmat", status: "Mat", time: "2 dəq əvvəl", color: "emerald" },
                { name: "Zaur K.", game: "Dama", status: "Kritik gediş", time: "İndi", color: "blue" },
                { name: "Nigar M.", game: "Connect4", status: "Qələbə", time: "5 dəq əvvəl", color: "red" },
              ].map((m, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-zinc-800 hover:border-zinc-700 transition cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl bg-${m.color}-500/20 border border-${m.color}-500/50 flex items-center justify-center text-xl`}>
                      {m.game === 'Şahmat' ? '♚' : m.game === 'Dama' ? '⛃' : '🔴'}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{m.name} <span className="text-zinc-500 font-normal">oynayır</span> {m.game}</h4>
                      <p className={`text-xs font-semibold text-${m.color}-400`}>{m.status}</p>
                    </div>
                  </div>
                  <span className="text-xs text-zinc-600 font-mono">{m.time}</span>
                </div>
              ))}
            </div>
            
            <button className="w-full mt-6 py-4 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 font-bold border border-purple-500/30 transition shadow-[0_0_20px_rgba(168,85,247,0.1)] hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]">
              MÜBARİZƏYƏ QOŞUL
            </button>
          </div>

          <div className="flex-1 w-full flex flex-col items-center justify-center bg-black/30 rounded-[2rem] border border-zinc-800 p-6 min-h-[350px]">
            <h3 className="text-sm font-bold text-zinc-400 mb-6 uppercase tracking-widest text-center">Birlik Aktivliyi (Radar)</h3>
            <div className="relative w-64 h-64">
              {/* Simple CSS Radar Chart using SVG */}
              <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                {/* Grid Lines */}
                <polygon points="50,10 90,38 75,85 25,85 10,38" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                <polygon points="50,25 80,45 68,75 32,75 20,45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                <polygon points="50,40 70,53 60,65 40,65 30,53" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                
                {/* Axis */}
                <line x1="50" y1="50" x2="50" y2="10" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5"/>
                <line x1="50" y1="50" x2="90" y2="38" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5"/>
                <line x1="50" y1="50" x2="75" y2="85" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5"/>
                <line x1="50" y1="50" x2="25" y2="85" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5"/>
                <line x1="50" y1="50" x2="10" y2="38" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5"/>
                
                {/* Data Polygon */}
                <polygon points="50,20 85,40 60,80 35,70 15,45" fill="rgba(168, 85, 247, 0.4)" stroke="#a855f7" strokeWidth="1.5" />
                
                {/* Points */}
                <circle cx="50" cy="20" r="2" fill="#fff" />
                <circle cx="85" cy="40" r="2" fill="#fff" />
                <circle cx="60" cy="80" r="2" fill="#fff" />
                <circle cx="35" cy="70" r="2" fill="#fff" />
                <circle cx="15" cy="45" r="2" fill="#fff" />
                
                {/* Labels */}
                <text x="50" y="5" fill="#a1a1aa" fontSize="4" textAnchor="middle" fontWeight="bold">Şahmat</text>
                <text x="95" y="38" fill="#a1a1aa" fontSize="4" textAnchor="start" fontWeight="bold">Dama</text>
                <text x="80" y="90" fill="#a1a1aa" fontSize="4" textAnchor="start" fontWeight="bold">C4</text>
                <text x="20" y="90" fill="#a1a1aa" fontSize="4" textAnchor="end" fontWeight="bold">Qo</text>
                <text x="5" y="38" fill="#a1a1aa" fontSize="4" textAnchor="end" fontWeight="bold">Othello</text>
              </svg>
            </div>
          </div>
          
        </div>
      </motion.div>

    </div>
  );
}

