'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, ArrowLeft, Flag, Shield, Swords } from 'lucide-react';
import Link from 'next/link';
import { OthelloEngine, Move, BoardState } from './engine';
import { playMoveSound, playCaptureSound } from '@/utils/sounds';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { ref, get, set, update, remove, onValue, push, onDisconnect, serverTimestamp } from 'firebase/database';

export default function OthelloArena() {
  const [engine, setEngine] = useState(() => { const e = new OthelloEngine(); if (typeof window !== 'undefined') { const s = localStorage.getItem('tdv-othello'); if (s) e.load(s); } return e; });

  const [board, setBoard] = useState<BoardState>(engine.board);
  const [mode, setMode] = useState<'bot' | 'multiplayer'>('bot');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [myColor, setMyColor] = useState<'b' | 'w'>('b');

  useEffect(() => { localStorage.setItem('tdv-othello', engine.serialize()); }, [board, engine.turn]);
  const [status, setStatus] = useState<string>('Oyun Başladı. Gediş: Qaralar');
  
  const [validMoves, setValidMoves] = useState<Move[]>([]);

  const [whiteTime, setWhiteTime] = useState(600); // 10 minutes
  const [blackTime, setBlackTime] = useState(600);
  
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (mode === 'multiplayer' && user && roomId) {
      const gameRef = ref(db, `games/othello/${roomId}`);
      const unsubscribe = onValue(gameRef, (snap) => {
        const data = snap.val();
        if (data && data.state && data.state !== engine.serialize()) {
          const newEngine = new OthelloEngine();
          newEngine.load(data.state);
          setEngine(newEngine);
          setBoard(newEngine.board);
          
          if (newEngine.winner) {
            if (newEngine.winner === 'draw') setStatus('Heç-heçə!');
            else setStatus(newEngine.winner === myColor ? 'Siz Qalib Gəldiniz!' : 'Rəqib Qalib Gəldi!');
          } else {
            setStatus(`Gediş sırası: ${newEngine.turn === 'w' ? 'Ağlar' : 'Qaralar'}`);
          }
        }
      });
      return () => unsubscribe();
    }
  }, [mode, roomId, user, engine, myColor]);

  
  const [eloUpdated, setEloUpdated] = useState(false);

  useEffect(() => {
    if (mode === 'multiplayer' && engine.winner && user && !eloUpdated) {
      setEloUpdated(true);
      const userRef = ref(db, `users/${user.uid}`);
      get(userRef).then(snap => {
        const u = snap.val();
        if (u) {
          let newWins = u.wins || 0;
          let newLosses = u.losses || 0;
          let newElo = u.elo || 1200;
          
          let isWin = false;
          let isDraw = engine.winner === 'draw';
          
          // In Chess, winner is usually myColor (w or b) or draw
          if (engine.winner === myColor) isWin = true;
          
          if (isWin) { newWins++; newElo += 25; }
          else if (!isDraw) { newLosses++; newElo = Math.max(0, newElo - 25); }

          const total = newWins + newLosses;
          const winRate = total > 0 ? Math.round((newWins / total) * 100) + "%" : "0%";

          const { update } = require('firebase/database');
          update(userRef, {
            wins: newWins,
            losses: newLosses,
            elo: newElo,
            winRate: winRate
          });
        }
      });
    }
  }, [engine.winner, mode, user, eloUpdated, myColor]);

  const findMatch = async () => {
    if (!user) {
      alert('Multiplayer oynamaq üçün hesabınıza daxil olmalısınız!');
      return;
    }
    setIsSearching(true);
    setStatus('Rəqib axtarılır...');

    const waitingRef = ref(db, 'matchmaking/othello/waiting');
    const snap = await get(waitingRef);

    if (snap.exists()) {
      const opponentId = snap.val();
      if (opponentId === user.uid) return;

      await remove(waitingRef);
      const newRoomRef = push(ref(db, 'games/othello'));
      const newRoomId = newRoomRef.key;

      await set(newRoomRef, {
        white: user.uid, // Opponent was waiting, let them be black
        black: opponentId,
        state: new OthelloEngine().serialize(),
        status: 'playing',
        timestamp: serverTimestamp()
      });

      await set(ref(db, `users/${opponentId}/currentMatch`), newRoomId);
      
      setRoomId(newRoomId);
      setMyColor('w');
      resetGame();
      setStatus('Oyun Başladı! Uğurlar.');
      setIsSearching(false);
    } else {
      await set(waitingRef, user.uid);
      onDisconnect(waitingRef).remove();

      const matchRef = ref(db, `users/${user.uid}/currentMatch`);
      onValue(matchRef, (snapMatch) => {
        const foundRoomId = snapMatch.val();
        if (foundRoomId) {
          setRoomId(foundRoomId);
          setMyColor('b');
          resetGame();
          setStatus('Oyun Başladı! Uğurlar.');
          setIsSearching(false);
          remove(matchRef);
        }
      });
    }
  };
  

  useEffect(() => {
    if (engine.winner) return;
    const interval = setInterval(() => {
      if (engine.turn === 'w') {
        setWhiteTime(t => { if (t <= 1) { engine.winner = 'b'; updateStatus(); return 0; } return t - 1; });
      } else {
        setBlackTime(t => { if (t <= 1) { engine.winner = 'w'; updateStatus(); return 0; } return t - 1; });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [engine.turn, engine.winner]);
  
  const whitePlayer = { name: mode === 'multiplayer' ? (myColor === 'w' ? user?.displayName || 'Siz' : 'Rəqib') : 'Bot (Ağ)', elo: 1520 }; // White is bot usually if player goes first
  const blackPlayer = { name: mode === 'multiplayer' ? (myColor === 'b' ? user?.displayName || 'Siz' : 'Rəqib') : 'Sən (Qara)', elo: 1450 };

  useEffect(() => {
    setValidMoves(engine.getValidMoves(engine.turn));
    updateStatus();
    
    // AI Bot Logic
    if (mode === 'bot' && engine.turn === 'w' && !engine.winner) {
      setTimeout(() => {
        const bestMove = engine.getBestMove();
        if (bestMove) {
          engine.move(bestMove.r, bestMove.c);
          setBoard([...engine.board.map(r => [...r])]);
          updateStatus();
          playCaptureSound(); // Othello always captures
        }
      }, 800);
    }
  }, [board, engine.turn]);

  const updateStatus = () => {
    if (engine.winner) {
      if (engine.winner === 'draw') setStatus('Heç-heçə!');
      else setStatus(engine.winner === 'b' ? 'Siz Qalib Gəldiniz!' : 'Bot Qalib Gəldi!');
    } else {
      setStatus(`Gediş sırası: ${engine.turn === 'w' ? 'Ağlar' : 'Qaralar'}`);
    }
  };

  const handleCellClick = (r: number, c: number) => {
    if (engine.winner) return;
    if (mode === 'bot' && engine.turn === 'w') return;
    if (mode === 'multiplayer' && engine.turn !== myColor) return; // Not our turn

    const move = validMoves.find(m => m.r === r && m.c === c);
    if (move) {
      engine.move(r, c);
      setBoard([...engine.board.map(row => [...row])]);
      updateStatus();
      playCaptureSound();
    }
  };

  const resetGame = () => {
    const newEngine = new OthelloEngine();
    setEngine(newEngine);
    setBoard([...newEngine.board.map(row => [...row])]);
    setValidMoves(newEngine.getValidMoves('b'));
    setStatus('Oyun Başladı. Gediş: Qaralar');
    setWhiteTime(600);
    setBlackTime(600);
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
        <div className="w-full max-w-full sm:max-w-[65vh] flex items-center justify-between mb-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center border border-zinc-700 text-black">
              W
            </div>
            <div>
              <div className="font-bold text-white flex items-center gap-2">
                {whitePlayer.name} <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400">{whitePlayer.elo}</span>
              </div>
              <div className="text-xs text-red-400 flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3" /> {formatTime(whiteTime)}
              </div>
            </div>
          </div>
        </div>

        {/* Custom Othello Board */}
        <div className="w-full max-w-full sm:max-w-[65vh] aspect-square rounded-lg overflow-hidden shadow-[0_0_50px_rgba(22,163,74,0.15)] ring-4 ring-zinc-800/50">
          <div className="grid grid-cols-8 grid-rows-8 w-full h-full bg-[#15803d] border-4 border-[#14532d]">
            {board.map((row, rIndex) => (
              row.map((cell, cIndex) => {
                const isPossibleMove = validMoves.some(m => m.r === rIndex && m.c === cIndex);

                return (
                  <div 
                    key={`${rIndex}-${cIndex}`} 
                    onClick={() => handleCellClick(rIndex, cIndex)}
                    className={`w-full h-full flex items-center justify-center relative cursor-pointer border border-[#16a34a]`}
                  >
                    {/* Possible move dot */}
                    {isPossibleMove && (
                      <div className="absolute w-3 h-3 rounded-full bg-black/30 z-0" />
                    )}
                    
                    {/* Piece */}
                    {cell && (
                      <motion.div 
                        initial={{ rotateY: 90, opacity: 0 }}
                        animate={{ rotateY: 0, opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className={`z-10 w-[85%] h-[85%] rounded-full shadow-md flex items-center justify-center border ${
                          cell === 'w' ? 'bg-zinc-100 border-white text-black' : 'bg-zinc-950 border-black text-white'
                        }`}
                      />
                    )}
                  </div>
                );
              })
            ))}
          </div>
        </div>

        {/* My Info */}
        <div className="w-full max-w-full sm:max-w-[65vh] flex items-center justify-between mt-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-950 flex items-center justify-center border border-zinc-700 text-white">
              B
            </div>
            <div>
              <div className="font-bold text-white flex items-center gap-2">
                {blackPlayer.name} <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400">{blackPlayer.elo}</span>
              </div>
              <div className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3" /> {formatTime(blackTime)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Controls */}
      <div className="w-full lg:w-80 flex flex-col gap-4">
        {/* Status Card */}
        <div className="p-6 rounded-3xl bg-zinc-900/80 border border-green-900/50 backdrop-blur-md">
          <h2 className="text-xs font-black uppercase tracking-widest text-fuchsia-500 mb-2">Reversi (Othello)</h2>
          <div className="text-xl font-bold text-white mb-6">{status}</div>

          {/* Rejim Seçimi */}
          <div className="flex gap-2 mb-6">
            <button 
              onClick={() => { setMode('bot'); resetGame(); }} 
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${mode === 'bot' ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/20' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
            >
              Bot
            </button>
            <button 
              onClick={() => { setMode('multiplayer'); resetGame(); }}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${mode === 'multiplayer' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
            >
              Canlı
            </button>
          </div>
          
          {mode === 'multiplayer' && !roomId && (
            <button onClick={findMatch} disabled={isSearching} className="w-full py-3 mb-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold text-white transition disabled:opacity-50">
              {isSearching ? 'Rəqib axtarılır...' : 'Rəqib Axtar'}
            </button>
          )}
  
          
          <div className="flex gap-2">
            <button 
              onClick={() => { engine.winner = 'w'; updateStatus(); setBoard([...engine.board.map(r => [...r])]); }} 
              disabled={!!engine.winner}
              className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-white transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Flag className="w-4 h-4" /> Təslim ol
            </button>
            <button 
              onClick={() => { engine.winner = 'draw'; updateStatus(); setBoard([...engine.board.map(r => [...r])]); }} 
              disabled={!!engine.winner}
              className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-white transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Shield className="w-4 h-4" /> Heç-heçə
            </button>
          </div>
          <button onClick={resetGame} className="w-full mt-2 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-sm font-bold transition">
            Yenidən Başla
          </button>
        </div>

        {/* Move History */}
        <div className="p-6 rounded-3xl bg-zinc-900/50 border border-zinc-800 flex-1 min-h-[300px] flex flex-col">
          <div className="flex items-center gap-2 text-zinc-400 mb-4">
            <Swords className="w-4 h-4" />
            <h3 className="text-sm font-bold uppercase tracking-widest">Gedişlər Tarixçəsi</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-1">
            {engine.moveHistory.length === 0 ? (
              <div className="text-zinc-500 text-sm italic text-center mt-10">Oyun hələ başlamayıb...</div>
            ) : (
              engine.moveHistory.map((m, i) => {
                if (i % 2 !== 0) return null; // We render pairs
                return (
                  <div key={i} className="flex items-center text-sm">
                    <span className="w-8 text-zinc-600 font-mono">{Math.floor(i/2) + 1}.</span>
                    <span className="flex-1 text-zinc-300 font-mono bg-zinc-800/50 px-2 py-1 rounded">{m}</span>
                    <span className="flex-1 text-zinc-400 font-mono px-2 py-1">
                      {engine.moveHistory[i+1] || ''}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}



