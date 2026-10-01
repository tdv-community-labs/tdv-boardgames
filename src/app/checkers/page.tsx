'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { CheckersEngine, Move, BoardState } from './engine';
import { playMoveSound, playCaptureSound } from '@/utils/sounds';

export default function CheckersArena() {
  const [engine, setEngine] = useState(new CheckersEngine());
  const [board, setBoard] = useState<BoardState>(engine.board);
  const [status, setStatus] = useState<string>('Oyun Başladı. Gediş: Ağlar');
  
  const [selectedCell, setSelectedCell] = useState<{r: number, c: number} | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  
  const whitePlayer = { name: "Sən (Ağ)", elo: 1450 };
  const blackPlayer = { name: "Bot (Qara)", elo: 1520 };

  useEffect(() => {
    updateStatus();
    
    // Simple Bot Logic
    if (engine.turn === 'b' && !engine.winner) {
      setTimeout(() => {
        const moves = engine.getValidMoves('b');
        if (moves.length > 0) {
          const randomMove = moves[Math.floor(Math.random() * moves.length)];
          engine.move(randomMove);
          setBoard([...engine.board.map(r => [...r])]);
          updateStatus();
          
          if (randomMove.jumped) playCaptureSound();
          else playMoveSound();
        }
      }, 600);
    }
  }, [engine.turn]);

  const updateStatus = () => {
    if (engine.winner) {
      setStatus(engine.winner === 'w' ? 'Siz Qalib Gəldiniz!' : 'Bot Qalib Gəldi!');
    } else {
      setStatus(`Gediş sırası: ${engine.turn === 'w' ? 'Ağlar' : 'Qaralar'}`);
    }
  };

  const handleCellClick = (r: number, c: number) => {
    if (engine.winner || engine.turn === 'b') return; // Not our turn

    const piece = board[r][c];
    
    // If we click one of our pieces, select it
    if (piece && piece.toLowerCase() === 'w') {
      const allMoves = engine.getValidMoves('w');
      const pieceMoves = allMoves.filter(m => m.fromRow === r && m.fromCol === c);
      setSelectedCell({r, c});
      setValidMoves(pieceMoves);
    } 
    // If we click an empty cell and we have a selected piece
    else if (selectedCell && !piece) {
      const move = validMoves.find(m => m.toRow === r && m.toCol === c);
      if (move) {
        engine.move(move);
        setBoard([...engine.board.map(row => [...row])]);
        setSelectedCell(null);
        setValidMoves([]);
        updateStatus();
        
        if (move.jumped) playCaptureSound();
        else playMoveSound();
      } else {
        setSelectedCell(null);
        setValidMoves([]);
      }
    } else {
      setSelectedCell(null);
      setValidMoves([]);
    }
  };

  const resetGame = () => {
    const newEngine = new CheckersEngine();
    setEngine(newEngine);
    setBoard([...newEngine.board.map(row => [...row])]);
    setSelectedCell(null);
    setValidMoves([]);
    setStatus('Oyun Başladı. Gediş: Ağlar');
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
                const isSelected = selectedCell?.r === rIndex && selectedCell?.c === cIndex;
                const isPossibleMove = validMoves.some(m => m.toRow === rIndex && m.toCol === cIndex);

                return (
                  <div 
                    key={`${rIndex}-${cIndex}`} 
                    onClick={() => handleCellClick(rIndex, cIndex)}
                    className={`w-full h-full flex items-center justify-center relative cursor-pointer ${isDark ? 'bg-[#27272a]' : 'bg-[#e4e4e7]'}`}
                  >
                    {/* Possible move dot */}
                    {isPossibleMove && (
                      <div className="absolute w-4 h-4 rounded-full bg-red-500/50 z-0" />
                    )}
                    
                    {/* Piece */}
                    {cell && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`z-10 w-[80%] h-[80%] rounded-full shadow-inner flex items-center justify-center border-4 ${
                          cell.toLowerCase() === 'w' ? 'bg-zinc-200 border-white' : 'bg-zinc-800 border-zinc-950'
                        } ${isSelected ? 'ring-4 ring-red-500 ring-offset-2 ring-offset-transparent' : ''}`}
                      >
                        <div className={`w-[70%] h-[70%] rounded-full border-2 flex items-center justify-center font-black ${cell.toLowerCase() === 'w' ? 'border-zinc-300 text-zinc-400' : 'border-zinc-700 text-zinc-500'}`}>
                          {cell === 'W' || cell === 'B' ? 'K' : ''}
                        </div>
                      </motion.div>
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
        <div className="p-6 rounded-3xl bg-zinc-900/80 border border-red-900/50 backdrop-blur-md">
          <h2 className="text-xs font-black uppercase tracking-widest text-red-500 mb-2">Dama (Checkers)</h2>
          <div className="text-xl font-bold text-white mb-6">{status}</div>
          
          <div className="flex gap-2">
            <button onClick={resetGame} className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-white transition flex items-center justify-center gap-2">
              Yenidən Başla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
