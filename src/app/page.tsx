'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Play, Trophy, Users, Star, ArrowRight } from 'lucide-react';

const GAMES = [
  {
    id: 'chess',
    name: 'Şahmat',
    icon: '♟️',
    description: 'Qədim strategiya oyunu. Kralı qoruyun, rəqibi mat edin.',
    color: 'from-emerald-500/20 to-emerald-900/40',
    borderColor: 'border-emerald-500/30',
    textColor: 'text-emerald-400',
    players: '124',
    badge: 'Populyar'
  },
  {
    id: 'checkers',
    name: 'Dama',
    icon: '⚪',
    description: 'Sürətli və taktiki. Rəqibin bütün daşlarını vurun.',
    color: 'from-blue-500/20 to-blue-900/40',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-400',
    players: '89'
  },
  {
    id: 'go',
    name: 'Qo (Go)',
    icon: '⚫',
    description: 'Ərazi nəzarəti sənəti. Sonsuz ehtimallar, dərin fəlsəfə.',
    color: 'from-amber-500/20 to-amber-900/40',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-400',
    players: '45',
    badge: 'Yeni'
  },
  {
    id: 'othello',
    name: 'Othello',
    icon: '☯️',
    description: 'Bir dəqiqədə öyrənin, bir ömür boyu ustalaşın.',
    color: 'from-fuchsia-500/20 to-fuchsia-900/40',
    borderColor: 'border-fuchsia-500/30',
    textColor: 'text-fuchsia-400',
    players: '12',
    badge: 'Tezliklə'
  }
];

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
          TDV tələbələri üçün xüsusi olaraq dizayn edilmiş real-vaxt onlayn stolüstü oyunlar arenası. 
          Lichess tərzində sürətli eşləşdirmə, Elo reytinq sistemi və post-matç Stockfish analizi.
        </p>
        
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 bg-white text-black px-8 py-4 rounded-xl font-bold hover:scale-105 transition active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.2)]">
            <Play className="w-5 h-5 fill-current" />
            Sürətli Oyun (Blitz)
          </button>
          <button className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 text-white px-8 py-4 rounded-xl font-bold hover:bg-zinc-800 transition active:scale-95">
            <Trophy className="w-5 h-5" />
            Reytinq Cədvəli
          </button>
        </div>
      </motion.div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {GAMES.map((game, i) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className={\`group relative p-8 rounded-3xl border bg-gradient-to-br \${game.color} \${game.borderColor} overflow-hidden cursor-pointer\`}
          >
            {/* Hover glow effect */}
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-5 transition-opacity duration-500" />
            
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className={\`w-14 h-14 rounded-2xl bg-zinc-950/50 backdrop-blur border \${game.borderColor} flex items-center justify-center text-3xl shadow-xl\`}>
                    {game.icon}
                  </div>
                  {game.badge && (
                    <span className={\`px-3 py-1 rounded-full bg-zinc-950/50 backdrop-blur border \${game.borderColor} \${game.textColor} text-[10px] font-black uppercase tracking-widest\`}>
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
                <div className={\`w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-colors\`}>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

    </div>
  );
}
