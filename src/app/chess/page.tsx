'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Chess, Move } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { motion } from 'framer-motion';
import { Clock, Shield, Flag, Swords, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ChessArena() {
  const [game, setGame] = useState(new Chess());
  const [moves, setMoves] = useState<Move[]>([]);
  const [status, setStatus] = useState<string>('Oyun Başladı');
  
  // Fake players for now
  const whitePlayer = { name: "TDV_Tələbə1", elo: 1450 };
  const blackPlayer = { name: "Rəqib_Usta", elo: 1520 };

  const makeMove = useCallback((move: any) => {
    try {
      const result = game.move(move);
      if (result) {
        setGame(new Chess(game.fen()));
        setMoves(game.history({ verbose: true }) as Move[]);
        updateStatus();
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  }, [game]);

  const onDrop = (sourceSquare: string, targetSquare: string, piece: string) => {
    const move = makeMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: piece[1].toLowerCase() ?? 'q', // auto promote to queen
    });
    
    // Simulate opponent move (Bot for now)
    if (move && !game.isGameOver()) {
      setTimeout(() => {
        const possibleMoves = game.moves();
        if (possibleMoves.length > 0) {
          const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
          game.move(randomMove);
          setGame(new Chess(game.fen()));
          setMoves(game.history({ verbose: true }) as Move[]);
          updateStatus();
        }
      }, 500);
    }
    
    return move;
  };

  const updateStatus = () => {
    if (game.isCheckmate()) setStatus('Şah və Mat! Oyun Bitdi.');
    else if (game.isDraw()) setStatus('Heç-heçə!');
    else if (game.isStalemate()) setStatus('Pat! Heç-heçə.');
    else if (game.isCheck()) setStatus('ŞAH!');
    else setStatus(\`Gediş sırası: \${game.turn() === 'w' ? 'Ağlar' : 'Qaralar'}\`);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8 relative z-10 pt-24">
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-zinc-400 hover:text-white transition">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-bold uppercase tracking-widest">Geri Qayıt</span>
      </Link>
      
      {/* Board Area */}
      <div className="flex-1 flex flex-col items-center justify-center">
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

        {/* Board */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-[600px] aspect-square rounded-lg overflow-hidden shadow-[0_0_50px_rgba(139,92,246,0.15)] ring-4 ring-zinc-800/50"
        >
          <Chessboard 
            position={game.fen()} 
            onPieceDrop={onDrop}
            boardOrientation="white"
            customDarkSquareStyle={{ backgroundColor: '#27272a' }}
            customLightSquareStyle={{ backgroundColor: '#e4e4e7' }}
            animationDuration={200}
          />
        </motion.div>

        {/* My Info */}
        <div className="w-full max-w-[600px] flex items-center justify-between mt-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/50 text-purple-400">
              😎
            </div>
            <div>
              <div className="font-bold text-white flex items-center gap-2">
                {whitePlayer.name} <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400">{whitePlayer.elo}</span>
              </div>
              <div className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3" /> 09:45
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Controls */}
      <div className="w-full lg:w-80 flex flex-col gap-4">
        {/* Status Card */}
        <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-md">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Oyun Statusu</h2>
          <div className="text-xl font-bold text-white mb-4">{status}</div>
          
          <div className="flex gap-2">
            <button className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-white transition flex items-center justify-center gap-2">
              <Flag className="w-4 h-4" /> Təslim ol
            </button>
            <button className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-white transition flex items-center justify-center gap-2">
              <Shield className="w-4 h-4" /> Heç-heçə
            </button>
          </div>
        </div>

        {/* Move History */}
        <div className="flex-1 min-h-[300px] p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-md flex flex-col">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
            <Swords className="w-4 h-4" /> Gedişlər Tarixçəsi
          </h2>
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-1">
            {moves.reduce((resultArray, item, index) => { 
              const chunkIndex = Math.floor(index/2);
              if(!resultArray[chunkIndex]) {
                resultArray[chunkIndex] = []; 
              }
              resultArray[chunkIndex].push(item);
              return resultArray;
            }, [] as Move[][]).map((pair, i) => (
              <div key={i} className="flex items-center text-sm py-1 border-b border-zinc-800/50">
                <span className="w-8 text-zinc-500 font-mono text-xs">{i + 1}.</span>
                <span className="flex-1 font-mono font-medium text-zinc-300">{pair[0]?.san}</span>
                <span className="flex-1 font-mono font-medium text-zinc-300">{pair[1]?.san || ''}</span>
              </div>
            ))}
            {moves.length === 0 && (
              <div className="text-center text-zinc-600 text-sm italic mt-10">
                Oyun hələ başlamayıb...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
