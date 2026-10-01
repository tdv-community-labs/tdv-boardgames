'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Star, Flame } from 'lucide-react';
import Link from 'next/link';

const PLAYERS = [
  { rank: 1, name: "Orxan_Usta", elo: 2450, winRate: "68%", trend: "up" },
  { rank: 2, name: "TDV_King", elo: 2310, winRate: "62%", trend: "up" },
  { rank: 3, name: "Azer_Chess", elo: 2180, winRate: "59%", trend: "down" },
  { rank: 4, name: "QaraAt", elo: 2100, winRate: "55%", trend: "up" },
  { rank: 5, name: "DamaMaster", elo: 2050, winRate: "58%", trend: "down" },
];

export default function LeaderboardPage() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 relative z-10">
      
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-12">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center text-white mb-6 shadow-xl shadow-amber-500/20">
          <Trophy className="w-8 h-8" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
          Qlobal Reytinq Cədvəli
        </h1>
        <p className="text-zinc-400 font-medium max-w-lg">
          Bütün TDV oyunçuları arasında ən yüksək xal (Elo) toplayan ustalar. 
          Gündəlik yenilənir.
        </p>
      </div>

      {/* Top 3 Podium */}
      <div className="flex items-end justify-center gap-4 mb-12 h-48">
        {/* Rank 2 */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="w-1/4 max-w-[140px] flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-zinc-800 border-2 border-zinc-500 flex items-center justify-center font-bold text-lg mb-2 relative">
            T
            <div className="absolute -bottom-2 w-6 h-6 rounded-full bg-zinc-500 text-white text-[10px] flex items-center justify-center font-black border-2 border-zinc-950">2</div>
          </div>
          <div className="text-sm font-bold text-white truncate w-full text-center">{PLAYERS[1].name}</div>
          <div className="text-xs text-zinc-400 mb-2">{PLAYERS[1].elo}</div>
          <div className="w-full h-24 bg-gradient-to-t from-zinc-800/80 to-zinc-800/40 rounded-t-xl border-t border-zinc-700/50" />
        </motion.div>

        {/* Rank 1 */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="w-1/4 max-w-[140px] flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center font-bold text-2xl text-amber-500 mb-2 relative">
            O
            <div className="absolute -bottom-3 w-8 h-8 rounded-full bg-amber-500 text-black text-[12px] flex items-center justify-center font-black border-2 border-zinc-950 shadow-lg shadow-amber-500/50">1</div>
          </div>
          <div className="text-sm font-bold text-amber-500 truncate w-full text-center">{PLAYERS[0].name}</div>
          <div className="text-xs text-amber-500/80 mb-2 font-black">{PLAYERS[0].elo}</div>
          <div className="w-full h-32 bg-gradient-to-t from-amber-500/20 to-amber-500/5 rounded-t-xl border-t border-amber-500/30" />
        </motion.div>

        {/* Rank 3 */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="w-1/4 max-w-[140px] flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-orange-900/40 border-2 border-orange-700 flex items-center justify-center font-bold text-lg text-orange-600 mb-2 relative">
            A
            <div className="absolute -bottom-2 w-6 h-6 rounded-full bg-orange-700 text-white text-[10px] flex items-center justify-center font-black border-2 border-zinc-950">3</div>
          </div>
          <div className="text-sm font-bold text-white truncate w-full text-center">{PLAYERS[2].name}</div>
          <div className="text-xs text-zinc-400 mb-2">{PLAYERS[2].elo}</div>
          <div className="w-full h-20 bg-gradient-to-t from-zinc-800/80 to-zinc-800/40 rounded-t-xl border-t border-zinc-700/50" />
        </motion.div>
      </div>

      {/* List */}
      <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-zinc-800 text-xs font-bold text-zinc-500 uppercase tracking-widest">
          <div className="col-span-2 md:col-span-1 text-center">Sıra</div>
          <div className="col-span-6 md:col-span-5">İstifadəçi</div>
          <div className="col-span-4 md:col-span-3 text-right">Qələbə %</div>
          <div className="hidden md:block col-span-3 text-right">Elo Xalı</div>
        </div>
        
        {PLAYERS.map((player, i) => (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            key={player.rank} 
            className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors items-center"
          >
            <div className="col-span-2 md:col-span-1 text-center font-black text-zinc-500">
              #{player.rank}
            </div>
            <div className="col-span-6 md:col-span-5 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                player.rank === 1 ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50' :
                player.rank === 2 ? 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/50' :
                player.rank === 3 ? 'bg-orange-700/20 text-orange-500 border border-orange-700/50' :
                'bg-zinc-800 text-zinc-400'
              }`}>
                {player.name.charAt(0)}
              </div>
              <span className="font-bold text-white text-sm truncate">{player.name}</span>
            </div>
            <div className="col-span-4 md:col-span-3 text-right text-sm text-zinc-300 font-medium">
              {player.winRate}
            </div>
            <div className="hidden md:block col-span-3 text-right font-mono font-bold text-amber-400">
              {player.elo}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
