'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {  Clock, ArrowLeft, Flag, Shield, Swords , Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';
import GameChat from '@/components/GameChat';
import { CheckersEngine, Move, BoardState } from './engine';
import { playMoveSound, playCaptureSound } from '@/utils/sounds';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import confetti from 'canvas-confetti';
import { toast } from 'react-hot-toast';
import { ref, get, set, update, remove, onValue, push, onDisconnect, serverTimestamp } from 'firebase/database';

export default function CheckersArena() {
  const [engine, setEngine] = useState(() => { const e = new CheckersEngine(); if (typeof window !== 'undefined') { const s = localStorage.getItem('tdv-checkers'); if (s) e.load(s); } return e; });

  const [board, setBoard] = useState<BoardState>(engine.board);
  const [mode, setMode] = useState<'bot' | 'multiplayer'>('bot');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [myColor, setMyColor] = useState<'w' | 'b'>('w');

  useEffect(() => { localStorage.setItem('tdv-checkers', engine.serialize()); }, [board, engine.turn]);
  const [status, setStatus] = useState<string>('Oyun Başladı. Gediş: Ağlar');
  
  const [selectedCell, setSelectedCell] = useState<{r: number, c: number} | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);

  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `:`;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (mode === 'multiplayer' && user && roomId) {
      const gameRef = ref(db, `games/checkers/${roomId}`);
      const unsubscribe = onValue(gameRef, (snap) => {
        const data = snap.val();
        if (data && data.state && data.state !== engine.serialize()) {
          const newEngine = new CheckersEngine();
          if (typeof data.state === 'string' && data.state.startsWith('resigned_')) { newEngine.load(engine.serialize()); newEngine.winner = data.state === 'resigned_w' ? 'b' : 'w'; } else { newEngine.load(data.state); }
          setEngine(newEngine);
          setBoard(newEngine.board);
          
          if (newEngine.winner) {
            setStatus(newEngine.winner === myColor ? 'Siz Qalib Gəldiniz!' : 'Rəqib Qalib Gəldi!');
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
          
          if (isWin) { newWins++; newElo += 25; confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } }); toast.success('+25 Elo Qazandınız!', { icon: '🏆', duration: 5000 }); }
          else if (!isDraw) { newLosses++; newElo = Math.max(0, newElo - 25); toast.error('-25 Elo İtirdiniz.', { icon: '💀', duration: 5000 }); }

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

  
  const createPrivateRoom = async () => {
    if (!user) { alert('Dostla oynamaq üçün hesabınıza daxil olun!'); return; }
    const newRoomRef = push(ref(db, `games/checkers`));
    
    // Depending on game, initial state varies
    let initialState = '';
    
    initialState = new CheckersEngine().serialize();
    
    
    
    await set(newRoomRef, { state: initialState, status: 'waiting_for_friend' });
    setRoomId(newRoomRef.key);
    setMyColor('w'); // Chess/Checkers white first, Go/Othello black first
    setMode('multiplayer');
    
    const link = `${window.location.origin}/checkers?room=${newRoomRef.key}`;
    navigator.clipboard.writeText(link).then(() => {
       toast.success('Link kopyalandı! Dostunuza göndərin.', { icon: '🔗', duration: 6000 });
       setStatus('Dostunuzun qoşulması gözlənilir...');
    });
  };

  const findMatch =  async () => {
    if (!user) {
      alert('Multiplayer oynamaq üçün hesabınıza daxil olmalısınız!');
      return;
    }
    setIsSearching(true);
    setStatus('Rəqib axtarılır...');

    const waitingRef = ref(db, 'matchmaking/checkers/waiting');
    const snap = await get(waitingRef);

    if (snap.exists()) {
      const opponentId = snap.val();
      if (opponentId === user.uid) return;

      await remove(waitingRef);
      const newRoomRef = push(ref(db, 'games/checkers'));
      const newRoomId = newRoomRef.key;

      await set(newRoomRef, {
        white: opponentId,
        black: user.uid,
        state: new CheckersEngine().serialize(),
        status: 'playing',
        timestamp: serverTimestamp()
      });

      await set(ref(db, `users/${opponentId}/currentMatch`), newRoomId);
      
      setRoomId(newRoomId);
      setMyColor('b');
      resetGame();
      setStatus('Oyun Başladı! Uğurlar.'); toast.success('Oyun Başladı! Uğurlar.', { icon: '🔥' }); toast.success('Rəqib qoşuldu! Oyun Başladı.', { icon: '🔥' });
      setIsSearching(false);
    } else {
      await set(waitingRef, user.uid);
      onDisconnect(waitingRef).remove();

      const matchRef = ref(db, `users/${user.uid}/currentMatch`);
      onValue(matchRef, (snapMatch) => {
        const foundRoomId = snapMatch.val();
        if (foundRoomId) {
          setRoomId(foundRoomId);
          setMyColor('w');
          resetGame();
          setStatus('Oyun Başladı! Uğurlar.'); toast.success('Oyun Başladı! Uğurlar.', { icon: '🔥' });
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
        setWhiteTime(t => { if (t <= 1) { engine.winner = 'b'; updateStatus(); setBoard([...engine.board.map(r => [...r])]); return 0; } return t - 1; });
      } else {
        setBlackTime(t => { if (t <= 1) { engine.winner = 'w'; updateStatus(); return 0; } return t - 1; });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [engine.turn, engine.winner]);
  
  const whitePlayer = { name: "Sən (Ağ)", elo: 1450 };
  const blackPlayer = { name: mode === 'multiplayer' ? (myColor === 'b' ? user?.displayName || 'Siz' : 'Rəqib') : 'Bot (Qara)', elo: 1520 };

  useEffect(() => {
    updateStatus();
    
    // AI Bot Logic
    if (mode === 'bot' && engine.turn === 'b' && !engine.winner) {
      setTimeout(() => {
        const bestMove = engine.getBestMove(5); // Depth 5 Minimax
        if (bestMove) {
          engine.move(bestMove);
          setBoard([...engine.board.map(r => [...r])]);
          updateStatus();
          
          if (bestMove.jumped) playCaptureSound();
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
    if (engine.winner) return;
    if (mode === 'bot' && engine.turn === 'b') return;
    if (mode === 'multiplayer' && engine.turn !== myColor) return;

    const piece = board[r][c];
    
    // If we click one of our pieces, select it
    if (piece && piece.color.toLowerCase() === (mode === 'multiplayer' ? myColor : 'w')) {
      const allMoves = engine.getValidMoves(mode === 'multiplayer' ? myColor : 'w');
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
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
              🤖
            </div>
            <div>
              <div className="font-bold text-white flex items-center gap-2">
                {blackPlayer.name} <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400">{blackPlayer.elo}</span>
              </div>
              <div className="text-xs text-red-400 flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3" /> {formatTime(blackTime)}
              </div>
            </div>
          </div>
        </div>

        {/* Custom Checkerboard */}
        <div className="w-full max-w-full sm:max-w-[65vh] aspect-square rounded-lg overflow-hidden shadow-[0_0_50px_rgba(220,38,38,0.15)] ring-4 ring-zinc-800/50">
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
                        layoutId={cell.id}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`z-10 w-[80%] h-[80%] rounded-full shadow-inner flex items-center justify-center border-4 ${
                          cell.color.toLowerCase() === 'w' ? 'bg-zinc-200 border-white' : 'bg-zinc-800 border-zinc-950'
                        } ${isSelected ? 'ring-4 ring-red-500 ring-offset-2 ring-offset-transparent' : ''}`}
                      >
                        <div className={`w-[70%] h-[70%] rounded-full border-2 flex items-center justify-center font-black ${cell.color.toLowerCase() === 'w' ? 'border-zinc-300 text-zinc-400' : 'border-zinc-700 text-zinc-500'}`}>
                          {cell.color === 'W' || cell.color === 'B' ? 'K' : ''}
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
        <div className="w-full max-w-full sm:max-w-[65vh] flex items-center justify-between mt-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/50 text-red-400">
              😎
            </div>
            <div>
              <div className="font-bold text-white flex items-center gap-2">
                {whitePlayer.name} <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400">{whitePlayer.elo}</span>
              </div>
              <div className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3" /> {formatTime(whiteTime)}
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

          {/* Rejim Seçimi */}
          <div className="flex gap-2 mb-6">
            <button 
              onClick={() => { setMode('bot'); resetGame(); }} 
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${mode === 'bot' ? 'bg-red-600 text-white shadow-lg shadow-red-500/20' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
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
            <button onClick={resetGame} className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-white transition flex items-center justify-center gap-2">
              Yenidən Başla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}










