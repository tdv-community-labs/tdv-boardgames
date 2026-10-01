'use client';

import React, { useState } from 'react';
import { Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function GoArena() {
  const [status] = useState<string>('Tezliklə... (Hazırlanır)');
  
  const whitePlayer = { name: "Sən", elo: 1450 };
  const blackPlayer = { name: "Rəqib_Usta", elo: 1520 };

  const BOARD_SIZE = 19;
  const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  
  // Place some dummy stones
  board[3][3] = 'b';
  board[3][15] = 'w';
  board[15][3] = 'b';
  board[15][15] = 'w';
  board[9][9] = 'b';

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

        {/* Custom Go Board */}
        <div className="w-full max-w-[600px] aspect-square rounded-lg p-4 shadow-[0_0_50px_rgba(34,197,94,0.15)] ring-4 ring-zinc-800/50 bg-[#dcba82]">
          <div className="grid w-full h-full border border-zinc-800" style={{ gridTemplateColumns: \`repeat(\${BOARD_SIZE - 1}, minmax(0, 1fr))\`, gridTemplateRows: \`repeat(\${BOARD_SIZE - 1}, minmax(0, 1fr))\` }}>
            
            {/* The Grid Lines */}
            {Array((BOARD_SIZE - 1) * (BOARD_SIZE - 1)).fill(null).map((_, i) => (
              <div key={i} className="border-b border-r border-zinc-800" />
            ))}

            {/* The Stones Overlay */}
            <div className="absolute inset-4 grid" style={{ gridTemplateColumns: \`repeat(\${BOARD_SIZE}, minmax(0, 1fr))\`, gridTemplateRows: \`repeat(\${BOARD_SIZE}, minmax(0, 1fr))\` }}>
              {board.map((row, rIndex) => (
                row.map((cell, cIndex) => {
                  return (
                    <div key={\`\${rIndex}-\${cIndex}\`} className="w-full h-full flex items-center justify-center transform scale-[1.1]">
                      {cell && (
                        <div className={\`w-[90%] h-[90%] rounded-full shadow-md \${
                          cell === 'w' ? 'bg-zinc-100' : 'bg-zinc-950'
                        }\`} />
                      )}
                    </div>
                  );
                })
              ))}
            </div>

          </div>
        </div>

        {/* My Info */}
        <div className="w-full max-w-[600px] flex items-center justify-between mt-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50 text-emerald-400">
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
        <div className="p-6 rounded-3xl bg-zinc-900/80 border border-emerald-900/50 backdrop-blur-md text-center">
          <h2 className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-2">Go (Weiqi)</h2>
          <div className="text-xl font-bold text-white mb-2">{status}</div>
          <p className="text-sm text-zinc-400 mb-6">Go oyun mühərriki və 19x19 məntiqi üzərində işləyirik. Tezliklə əlçatan olacaq!</p>
          
          <Link href="/" className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-white transition flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Əsas Səhifəyə Dön
          </Link>
        </div>
      </div>
    </div>
  );
}
