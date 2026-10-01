'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Shield, Flag, ArrowLeft, Users, Cpu } from 'lucide-react';
import Link from 'next/link';
import { GoEngine, BoardState } from './engine';
import { playMoveSound, playCaptureSound } from '@/utils/sounds';

export default function GoArena() {
  const [engine, setEngine] = useState(new GoEngine(19));
  const [board, setBoard] = useState<BoardState>(engine.board);
  const [status, setStatus] = useState<string>('Oyun Başladı. Gediş: Qaralar');
  
  const whitePlayer = { name: "Bot (Ağ)", elo: 1520 };
  const blackPlayer = { name: "Sən (Qara)", elo: 1450 };

  const BOARD_SIZE = 19;

  const getStoneCount = (b: BoardState) => b.flat().filter(x => x !== null).length;

  useEffect(() => {
    updateStatus();
    
    // Bot plays white
    if (engine.turn === 'w') {
      setTimeout(() => {
        const preCount = getStoneCount(engine.board);
        if (engine.playBotMove()) {
          setBoard([...engine.board.map(r => [...r])]);
          updateStatus();
          
          const postCount = getStoneCount(engine.board);
          if (postCount < preCount + 1) playCaptureSound();
          else playMoveSound();
        }
      }, 600);
    }
  }, [engine.turn]);

  const updateStatus = () => {
    setStatus(\`Gediş sırası: \${engine.turn === 'w' ? 'Ağlar' : 'Qaralar'}\`);
  };

  const handleCellClick = (r: number, c: number) => {
    if (engine.turn === 'w') return; // Not our turn
    
    const preCount = getStoneCount(engine.board);
    if (engine.placeStone(r, c)) {
      setBoard([...engine.board.map(row => [...row])]);
      updateStatus();
      
      const postCount = getStoneCount(engine.board);
      if (postCount < preCount + 1) playCaptureSound();
      else playMoveSound();
    }
  };

  const resetGame = () => {
    const newEngine = new GoEngine(19);
    setEngine(newEngine);
    setBoard([...newEngine.board.map(row => [...row])]);
    setStatus('Oyun Başladı. Gediş: Qaralar');
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8 relative z-10 pt-24">
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-zinc-400 hover:text-white transition">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-bold uppercase tracking-widest">Geri Qayıt</span>
      </Link>
      
      {/* Board Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        
        {/* Opponent Info */}
        <div className="w-full max-w-[600px] flex items-center justify-between mb-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
              🤖
            </div>
            <div>
              <div className="font-bold text-white flex items-center gap-2">
                {whitePlayer.name} <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400">{whitePlayer.elo}</span>
              </div>
              <div className="text-xs text-red-400 flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3" /> 10:00
              </div>
            </div>
          </div>
        </div>

        {/* Custom Go Board */}
        <div className="w-full max-w-[600px] aspect-square rounded-lg p-4 shadow-[0_0_50px_rgba(34,197,94,0.15)] ring-4 ring-zinc-800/50 bg-[#dcba82]">
          <div className="grid w-full h-full border border-zinc-800 relative" style={{ gridTemplateColumns: \`repeat(\${BOARD_SIZE - 1}, minmax(0, 1fr))\`, gridTemplateRows: \`repeat(\${BOARD_SIZE - 1}, minmax(0, 1fr))\` }}>
            
            {/* The Grid Lines */}
            {Array((BOARD_SIZE - 1) * (BOARD_SIZE - 1)).fill(null).map((_, i) => (
              <div key={i} className="border-b border-r border-zinc-800" />
            ))}

            {/* The Intersections Overlay */}
            <div className="absolute top-0 left-0 w-[calc(100%+100%/(18))] h-[calc(100%+100%/(18))] grid -translate-x-[calc(50%/(18))] -translate-y-[calc(50%/(18))]" style={{ gridTemplateColumns: \`repeat(\${BOARD_SIZE}, minmax(0, 1fr))\`, gridTemplateRows: \`repeat(\${BOARD_SIZE}, minmax(0, 1fr))\` }}>
              {board.map((row, rIndex) => (
                row.map((cell, cIndex) => {
                  return (
                    <div 
                      key={\`\${rIndex}-\${cIndex}\`} 
                      onClick={() => handleCellClick(rIndex, cIndex)}
                      className="w-full h-full flex items-center justify-center cursor-pointer group"
                    >
                      {/* Hover Preview for empty cells */}
                      {!cell && engine.turn === 'b' && (
                        <div className="w-[85%] h-[85%] rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                      
                      {/* Placed Stone */}
                      {cell && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={\`w-[90%] h-[90%] rounded-full shadow-md \${
                            cell === 'w' ? 'bg-zinc-100' : 'bg-zinc-950 shadow-black/50 border border-white/10'
                          }\`} 
                        />
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
                {blackPlayer.name} <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400">{blackPlayer.elo}</span>
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
        <div className="p-6 rounded-3xl bg-zinc-900/80 border border-emerald-900/50 backdrop-blur-md">
          <h2 className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-2">Go (Weiqi)</h2>
          <div className="text-xl font-bold text-white mb-6">{status}</div>
          
          <div className="flex gap-2">
            <button onClick={resetGame} className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-white transition flex items-center justify-center gap-2">
              Yenidən Başla
            </button>
            <button className="flex-1 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-sm font-bold text-red-400 transition flex items-center justify-center gap-2">
              Pas (Keç)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
