'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {  Clock, ArrowLeft, Flag, Shield, Swords , Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';
import EndGameModal from '@/components/EndGameModal';
import VsScreen from '@/components/VsScreen';
import { uiAudio } from '@/utils/sfx';
import { AnimatePresence } from 'framer-motion';
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
  const [showVs, setShowVs] = useState(false);
  const [opponentName, setOpponentName] = useState('Oyunçu');
  const [opponentElo, setOpponentElo] = useState(1200);

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
      setStatus('Oyun Başladı! Uğurlar.'); setShowVs(true); uiAudio.success(); setShowVs(true); uiAudio.success();
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
          setStatus('Oyun Başladı! Uğurlar.'); setShowVs(true); uiAudio.success();
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

        if (mode === 'multiplayer' && roomId) {
          update(ref(db, `games/checkers/${roomId}`), { state: engine.serialize() });
        }
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

  
  let gameResult: 'win' | 'loss' | 'draw' | null = null;
  if (engine.winner) {
    if (engine.winner === 'draw') {
      gameResult = 'draw';
    } else {
      if (mode === 'multiplayer') {
        gameResult = engine.winner === myColor ? 'win' : 'loss';
      } else {
        gameResult = engine.winner === 'w' ? 'win' : 'loss';
      }
    }
  }
  
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8 relative z-10 pt-24">
      <EndGameModal isOpen={gameResult !== null} result={gameResult} onRematch={() => { setMode("bot"); resetGame(); }} />
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-zinc-400 hover:text-white transition">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-bold uppercase tracking-widest">Geri Qayıt</span>
      </Link>
      
            {/* Epic Match Intro Screen */}
      <VsScreen 
        show={showVs} 
        player1Name={myColor === 'w' ? user?.displayName || 'Siz' : opponentName}
        player2Name={myColor === 'b' ? user?.displayName || 'Siz' : opponentName}
        player1Avatar="😎"
        player2Avatar="🤖"
        onComplete={() => setShowVs(false)}
      />

      {/* Board Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
        
        {/* Opponent Info (Cyberpunk) */}
        <div className="w-full max-w-[600px] flex items-center justify-between mb-4 bg-zinc-950/80 p-4 rounded-2xl border-2 border-red-500/30 shadow-[0_0_20px_rgba(220,38,38,0.15)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-950 border border-red-500/50 flex items-center justify-center text-2xl shadow-inner shadow-red-500/20">
              🤖
            </div>
            <div>
              <div className="font-black text-red-400 flex items-center gap-2 tracking-widest uppercase">
                {blackPlayer.name} <span className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-[10px] text-red-300 animate-pulse">{blackPlayer.elo}</span>
              </div>
              <div className="text-xs text-zinc-400 flex items-center gap-1 font-mono mt-1">
                <Clock className="w-3 h-3" /> {formatTime(blackTime)}
              </div>
            </div>
          </div>
        </div>

        {/* Custom Checkerboard (Cyberpunk Laser Grid) */}
        <div className="w-full max-w-[600px] aspect-square rounded-2xl p-2 md:p-4 shadow-[0_0_60px_rgba(220,38,38,0.15)] ring-4 ring-red-500/20 bg-zinc-950/90 relative backdrop-blur-3xl overflow-hidden touch-none select-none">
          {/* Holographic Underglow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(220,38,38,0.15),transparent_70%)] pointer-events-none"></div>

          {/* Searching Overlay */}
          <AnimatePresence>
            {isSearching && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-md rounded-2xl overflow-hidden"
              >
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                  <div className="w-[150%] h-[150%] bg-[radial-gradient(ellipse_at_center,rgba(220,38,38,0.4),transparent_60%)] animate-pulse" />
                </div>
                
                <div className="relative w-32 h-32 mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-red-500/10 border-t-red-500 border-l-red-500 animate-[spin_2s_linear_infinite]" />
                  <div className="absolute inset-2 rounded-full border-2 border-orange-500/20 border-b-orange-500 border-r-orange-500 animate-[spin_3s_linear_infinite_reverse]" />
                  <div className="absolute inset-4 rounded-full overflow-hidden">
                    <div className="w-full h-full" style={{ background: 'conic-gradient(from 0deg, transparent 70%, rgba(220,38,38,0.8) 100%)', animation: 'spin 1.5s linear infinite' }} />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 bg-red-400 rounded-full shadow-[0_0_15px_#f87171] animate-ping" />
                  </div>
                </div>

                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-500 tracking-widest uppercase mb-2">
                  Rəqib Axtarılır
                </h2>
                <div className="flex items-center gap-1.5 mb-6 text-red-500/70 text-[10px] font-mono tracking-widest">
                  <span>SYS.SCAN</span>
                  <span className="flex gap-0.5">
                    <span className="w-1 h-1 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-1 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>

                <button 
                  onClick={() => { setIsSearching(false); setStatus('Oyun başlayır...'); uiAudio.click(); }} 
                  className="px-6 py-2 rounded-xl bg-zinc-500/10 hover:bg-zinc-500/20 text-zinc-400 text-xs font-bold border border-zinc-500/30 transition-all active:scale-95 uppercase tracking-widest"
                >
                  ABORT_MISSION
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-8 grid-rows-8 w-full h-full border border-red-500/20 relative z-10">
            {board.map((row, rIndex) => (
              row.map((cell, cIndex) => {
                const isDark = (rIndex + cIndex) % 2 === 1;
                const isSelected = selectedCell?.r === rIndex && selectedCell?.c === cIndex;
                const isLastMoveFrom = engine.lastMove && engine.lastMove.from.r === rIndex && engine.lastMove.from.c === cIndex;
                const isLastMoveTo = engine.lastMove && engine.lastMove.to.r === rIndex && engine.lastMove.to.c === cIndex;
                const isPossibleMove = validMoves.some(m => m.toRow === rIndex && m.toCol === cIndex);

                return (
                  <div 
                    key={`${rIndex}-${cIndex}`} 
                    onClick={() => { uiAudio.click(); handleCellClick(rIndex, cIndex); }}
                    onMouseEnter={() => { if(isPossibleMove || (cell && cell.color.toLowerCase() === myColor)) uiAudio.hover(); }}
                    className={`w-full h-full flex items-center justify-center relative cursor-pointer overflow-hidden ${
                      isDark ? 'bg-zinc-950 border border-red-900/10' : 'bg-red-950/20 border border-red-500/5'
                    } ${isLastMoveFrom || isLastMoveTo ? 'bg-orange-950/40' : ''}`}
                  >
                    {/* Possible move dot (Hologram target) */}
                    {isPossibleMove && (
                      <div className="absolute w-6 h-6 rounded-full border-2 border-dashed border-red-400 animate-[spin_3s_linear_infinite] opacity-50 z-0" />
                    )}
                    {isPossibleMove && (
                      <div className="absolute w-2 h-2 rounded-full bg-red-400 shadow-[0_0_10px_#f87171] z-0 animate-ping" />
                    )}
                    
                    {/* Piece (Cyberpunk Energy Disk) */}
                    {cell && (
                      <motion.div 
                        layoutId={cell.id}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`z-10 w-[85%] h-[85%] rounded-full shadow-2xl flex items-center justify-center relative overflow-hidden ${
                          cell.color.toLowerCase() === 'w' 
                            ? 'bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_0_20px_rgba(6,182,212,0.6)] border border-cyan-200/50' 
                            : 'bg-gradient-to-br from-purple-500 to-pink-600 shadow-[0_0_20px_rgba(217,70,239,0.6)] border border-pink-200/50'
                        } ${isSelected ? 'ring-4 ring-white shadow-[0_0_30px_#ffffff]' : ''}`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/30 rounded-full" />
                        
                        {/* King Icon (Crown Hologram) */}
                        <div className={`w-[60%] h-[60%] rounded-full flex items-center justify-center font-black drop-shadow-md text-white/90`}>
                          {(cell.color === 'W' || cell.color === 'B') ? '👑' : ''}
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })
            ))}
          </div>
        </div>

        {/* My Info (Cyberpunk) */}
        <div className="w-full max-w-[600px] flex items-center justify-between mt-4 bg-zinc-950/80 p-4 rounded-2xl border-2 border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-2xl shadow-inner shadow-cyan-500/20">
              😎
            </div>
            <div>
              <div className="font-black text-cyan-400 flex items-center gap-2 tracking-widest uppercase">
                {whitePlayer.name} <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-[10px] text-cyan-300 animate-pulse">{whitePlayer.elo}</span>
              </div>
              <div className="text-xs text-zinc-400 flex items-center gap-1 font-mono mt-1">
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
            {mode === 'multiplayer' && roomId && !engine.winner && (
              <button
                onClick={() => {
                  if (confirm('Təslim olmaq istədiyinizə əminsiniz?')) {
                    update(ref(db, `games/checkers/${roomId}`), { state: 'resigned_' + myColor });
                  }
                }}
                className="flex-1 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-sm font-bold text-red-400 transition flex items-center justify-center gap-2"
              >
                <Flag className="w-4 h-4" /> Təslim ol
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}










