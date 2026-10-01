'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ArrowLeft, Flag, Users } from 'lucide-react';
import Link from 'next/link';
import GameChat from '@/components/GameChat';
import { TicTacToeEngine, BoardState } from './engine';
import { playMoveSound, playCaptureSound } from '@/utils/sounds';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import confetti from 'canvas-confetti';
import { toast } from 'react-hot-toast';
import { ref, get, set, update, remove, onValue, push, onDisconnect, serverTimestamp } from 'firebase/database';

export default function TicTacToeArena() {
  const [engine, setEngine] = useState(() => { const e = new TicTacToeEngine(); if (typeof window !== 'undefined') { const s = localStorage.getItem('tdv-xox'); if (s) e.load(s); } return e; });

  const [board, setBoard] = useState<BoardState>(engine.board);
  const [mode, setMode] = useState<'bot' | 'multiplayer'>('bot');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [myColor, setMyColor] = useState<'X' | 'O'>('X');
  const [eloUpdated, setEloUpdated] = useState(false);

  const [status, setStatus] = useState<string>('Oyun Başladı. Gediş: X');

  useEffect(() => { localStorage.setItem('tdv-xox', engine.serialize()); }, [board, engine.turn]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (mode === 'multiplayer' && user && roomId) {
      const gameRef = ref(db, `games/tictactoe/\${roomId}`);
      const unsubscribe = onValue(gameRef, (snap) => {
        const data = snap.val();
        if (data && data.state && data.state !== engine.serialize()) {
          const newEngine = new TicTacToeEngine();
          newEngine.load(data.state);
          setEngine(newEngine);
          setBoard(newEngine.board);
          
          if (newEngine.winner) {
            if (newEngine.winner === 'draw') setStatus('Heç-heçə!');
            else setStatus(newEngine.winner === myColor ? 'Siz Qalib Gəldiniz!' : 'Rəqib Qalib Gəldi!');
          } else {
            setStatus(`Gediş sırası: \${newEngine.turn}`);
          }
        }
      });
      return () => unsubscribe();
    }
  }, [mode, roomId, user, engine, myColor]);

  useEffect(() => {
    if (mode === 'multiplayer' && engine.winner && user && !eloUpdated) {
      setEloUpdated(true);
      const userRef = ref(db, `users/\${user.uid}`);
      get(userRef).then(snap => {
        const u = snap.val();
        if (u) {
          let newWins = u.wins || 0;
          let newLosses = u.losses || 0;
          let newElo = u.elo || 1200;
          
          let isWin = false;
          let isDraw = engine.winner === 'draw';
          
          if (engine.winner === myColor) isWin = true;
          
          if (isWin) { newWins++; newElo += 25; confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } }); toast.success('+25 Elo Qazandınız!', { icon: '🏆', duration: 5000 }); }
          else if (!isDraw) { newLosses++; newElo = Math.max(0, newElo - 25); toast.error('-25 Elo İtirdiniz.', { icon: '💀', duration: 5000 }); }

          const total = newWins + newLosses;
          const winRate = total > 0 ? Math.round((newWins / total) * 100) + "%" : "0%";

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

    const waitingRef = ref(db, 'matchmaking/tictactoe/waiting');
    const snap = await get(waitingRef);

    if (snap.exists()) {
      const opponentId = snap.val();
      if (opponentId === user.uid) return;

      await remove(waitingRef);
      const newRoomRef = push(ref(db, 'games/tictactoe'));
      const newRoomId = newRoomRef.key;

      await set(newRoomRef, {
        white: opponentId,
        black: user.uid,
        state: new TicTacToeEngine().serialize(),
        status: 'playing',
        timestamp: serverTimestamp()
      });

      await set(ref(db, `users/\${opponentId}/currentMatch`), newRoomId);
      
      setRoomId(newRoomId);
      setMyColor('O');
      resetGame();
      setStatus('Oyun Başladı! Uğurlar.'); toast.success('Oyun Başladı! Uğurlar.', { icon: '🔥' }); playMoveSound();
      setIsSearching(false);
    } else {
      await set(waitingRef, user.uid);
      onDisconnect(waitingRef).remove();

      const matchRef = ref(db, `users/\${user.uid}/currentMatch`);
      onValue(matchRef, (snapMatch) => {
        const foundRoomId = snapMatch.val();
        if (foundRoomId) {
          setRoomId(foundRoomId);
          setMyColor('X');
          resetGame();
          setStatus('Oyun Başladı! Uğurlar.'); toast.success('Oyun Başladı! Uğurlar.', { icon: '🔥' }); playMoveSound();
          setIsSearching(false);
          remove(matchRef);
        }
      });
    }
  };

  const xPlayer = { name: mode === 'multiplayer' ? (myColor === 'X' ? user?.displayName || 'Siz' : 'Rəqib') : 'Sən (X)', elo: 1450 };
  const oPlayer = { name: mode === 'multiplayer' ? (myColor === 'O' ? user?.displayName || 'Siz' : 'Rəqib') : 'Bot (O)', elo: 1520 };

  const updateStatus = () => {
    if (engine.winner) {
      if (engine.winner === 'draw') setStatus('Heç-heçə!');
      else setStatus(engine.winner === 'X' ? 'X Qalib Gəldi!' : 'O Qalib Gəldi!');
    } else {
      setStatus(`Gediş sırası: \${engine.turn}`);
    }
  };

  useEffect(() => {
    updateStatus();
    
    // AI Bot Logic
    let timeoutId: any;
    if (mode === 'bot' && engine.turn === 'O' && !engine.winner) {
      timeoutId = setTimeout(() => {
        const bestMove = engine.getBestMove();
        if (bestMove) {
          engine.move(bestMove.r, bestMove.c);
          setBoard([...engine.board.map(r => [...r])]);
          updateStatus();
          playMoveSound();
        }
      }, 500);
    }
    return () => { if (timeoutId) clearTimeout(timeoutId); };
  }, [board, engine.turn, mode, engine.winner]);

  const handleCellClick = (r: number, c: number) => {
    if (engine.winner) return;
    if (mode === 'bot' && engine.turn === 'O') return;
    if (mode === 'multiplayer' && engine.turn !== myColor) return;

    if (engine.move(r, c)) {
      if (mode === 'multiplayer' && roomId) set(ref(db, `games/tictactoe/\${roomId}/state`), engine.serialize());
      setBoard([...engine.board.map(row => [...row])]);
      updateStatus();
      playMoveSound();
    }
  };

  const resetGame = () => {
    const newEngine = new TicTacToeEngine();
    setEngine(newEngine);
    setBoard([...newEngine.board.map(row => [...row])]);
    setStatus('Oyun Başladı. Gediş: X');
    setEloUpdated(false);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8 relative z-10 pt-24">
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-zinc-400 hover:text-white transition">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-bold uppercase tracking-widest">Geri Qayıt</span>
      </Link>
      
      {/* Board Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        
        <div className="w-full max-w-full sm:max-w-[50vh] flex items-center justify-between mb-8 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/50 text-blue-400 font-black">
              O
            </div>
            <div>
              <div className="font-bold text-white flex items-center gap-2">
                {oPlayer.name}
              </div>
            </div>
          </div>
        </div>

        {/* Custom Board */}
        <div className="w-full max-w-full sm:max-w-[50vh] aspect-square rounded-2xl p-2 bg-zinc-900 border border-zinc-800 shadow-[0_0_50px_rgba(255,255,255,0.05)]">
          <div className="grid grid-cols-3 grid-rows-3 w-full h-full gap-2">
            {board.map((row, rIndex) => (
              row.map((cell, cIndex) => {
                return (
                  <div 
                    key={`\${rIndex}-\${cIndex}`} 
                    onClick={() => handleCellClick(rIndex, cIndex)}
                    className="w-full h-full flex items-center justify-center relative cursor-pointer bg-zinc-950 rounded-xl hover:bg-zinc-900 transition-colors border border-zinc-800/50"
                  >
                    <AnimatePresence>
                      {cell && (
                        <motion.div 
                          initial={{ scale: 0, rotate: -45 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0 }}
                          className={`text-7xl md:text-8xl font-black drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] \${
                            cell === 'X' ? 'text-rose-500' : 'text-blue-500'
                          }`}
                        >
                          {cell}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            ))}
          </div>
        </div>

        <div className="w-full max-w-full sm:max-w-[50vh] flex items-center justify-between mt-8 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center border border-rose-500/50 text-rose-400 font-black">
              X
            </div>
            <div>
              <div className="font-bold text-white flex items-center gap-2">
                {xPlayer.name}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Controls */}
      <div className="w-full lg:w-80 flex flex-col gap-4">
        {/* Status Card */}
        <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-md">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">XOX (Tic-Tac-Toe)</h2>
          <div className="text-xl font-bold text-white mb-6">{status}</div>
          
          <div className="flex gap-2 mb-6">
            <button 
              onClick={() => { setMode('bot'); resetGame(); }} 
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 \${mode === 'bot' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
            >
              Bot
            </button>
            <button 
              onClick={() => { setMode('multiplayer'); resetGame(); }}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 \${mode === 'multiplayer' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
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
            <button onClick={resetGame} className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-white transition flex items-center justify-center gap-2">
              Yenidən Başla
            </button>
          </div>
        </div>
        <GameChat roomId={roomId} gameName="tictactoe" userName={user?.displayName || 'Oyunçu'} />
      </div>
    </div>
  );
}

