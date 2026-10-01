'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Shield, Flag, ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';

export default function CheckersArena() {
  const [status] = useState<string>('Tezliklə... (Hazırlanır)');
  
  const whitePlayer = { name: "Sən", elo: 1450 };
  const blackPlayer = { name: "Rəqib_Usta", elo: 1520 };

  // Create an empty 8x8 checkerboard array for UI dummy
  const board = Array(8).fill(null).map(() => Array(8).fill(null));
  
  // Fill initial checkers positions
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        if (row < 3) board[row][col] = 'b';
        if (row > 4) board[row][col] = 'w';
      }
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8 relative z-10 pt-24">
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-zinc-400 hover:text-white transition">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-bold uppercase tracking-widest">Geri Qayıt</span>
      </Link>
      
      {/* Board Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative opacity-60 pointer-events-none">
        
        {/* Opponent Info */}
        <div className="w-full max-w-[600px] flex items-center justify-between mb-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
              🔥
            </div>
            <div>
              <div className="font-bold text-white flex items-center gap-2">
                {blackPlayer.name} <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400">{blackPlayer.elo}</span>
              </div>
              <div className="text-xs text-red-400 flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3" /> 10:00
              </div>
            </div>
          </div>
        </div>

        {/* Custom Checkerboard */}
        <div className="w-full max-w-[600px] aspect-square rounded-lg overflow-hidden shadow-[0_0_50px_rgba(220,38,38,0.15)] ring-4 ring-zinc-800/50">
          <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
            {board.map((row, rIndex) => (
              row.map((cell, cIndex) => {
                const isDark = (rIndex + cIndex) % 2 === 1;
                return (
                  <div key={\`\${rIndex}-\${cIndex}\`} className={\`w-full h-full flex items-center justify-center \${isDark ? 'bg-[#27272a]' : 'bg-[#e4e4e7]'}\`}>
                    {cell && (
                      <div className={\`w-[80%] h-[80%] rounded-full shadow-inner flex items-center justify-center border-4 \${
                        cell === 'w' ? 'bg-zinc-200 border-white' : 'bg-zinc-800 border-zinc-950'
                      }\`}>
                        <div className={\`w-[70%] h-[70%] rounded-full border-2 \${cell === 'w' ? 'border-zinc-300' : 'border-zinc-700'}\`} />
                      </div>
                    )}
                  </div>
                );
              })
            ))}
          </div>
        </div>

        {/* My Info */}
        <div className="w-full max-w-[600px] flex items-center justify-between mt-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/50 text-red-400">
              😎
            </div>
            <div>
              <div className="font-bold text-white flex items-center gap-2">
                {whitePlayer.name} <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400">{whitePlayer.elo}</span>
              </div>
              <div className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3" /> 10:00
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Controls */}
      <div className="w-full lg:w-80 flex flex-col gap-4">
        {/* Status Card */}
        <div className="p-6 rounded-3xl bg-zinc-900/80 border border-red-900/50 backdrop-blur-md text-center">
          <h2 className="text-xs font-black uppercase tracking-widest text-red-500 mb-2">Dama (Checkers)</h2>
          <div className="text-xl font-bold text-white mb-2">{status}</div>
          <p className="text-sm text-zinc-400 mb-6">Bu oyun növü hələ aktiv deyil. Çox yaxında Dama oyun mühərriki əlavə olunacaq.</p>
          
          <Link href="/" className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-white transition flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Əsas Səhifəyə Dön
          </Link>
        </div>
      </div>
    </div>
  );
}
