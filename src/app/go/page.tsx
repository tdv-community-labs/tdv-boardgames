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
import { GoEngine, BoardState } from './engine';
import { playMoveSound, playCaptureSound } from '@/utils/sounds';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import confetti from 'canvas-confetti';
import { toast } from 'react-hot-toast';
import { ref, get, set, update, remove, onValue, push, onDisconnect, serverTimestamp } from 'firebase/database';

export default function GoArena() {
  const [engine, setEngine] = useState(() => { const e = new GoEngine(19); if (typeof window !== 'undefined') { const s = localStorage.getItem('tdv-go'); if (s) e.load(s); } return e; });

  const [board, setBoard] = useState<BoardState>(engine.board);
  const [mode, setMode] = useState<'bot' | 'multiplayer'>('bot');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [myColor, setMyColor] = useState<'b' | 'w'>('b');
  const [showVs, setShowVs] = useState(false);
  const [opponentName, setOpponentName] = useState('Oyunçu');
  const [opponentElo, setOpponentElo] = useState(1200);

  useEffect(() => { localStorage.setItem('tdv-go', engine.serialize()); }, [board, engine.turn]);
  const [status, setStatus] = useState<string>('Oyun Başladı. Gediş: Qaralar');
  
  const whitePlayer = { name: mode === 'multiplayer' ? (myColor === 'w' ? user?.displayName || 'Siz' : 'Rəqib') : 'Bot (Ağ)', elo: 1520 };
  const blackPlayer = { name: mode === 'multiplayer' ? (myColor === 'b' ? user?.displayName || 'Siz' : 'Rəqib') : 'Sən (Qara)', elo: 1450 };

  const BOARD_SIZE = 19;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (mode === 'multiplayer' && user && roomId) {
      const gameRef = ref(db, `games/go/${roomId}`);
      const unsubscribe = onValue(gameRef, (snap) => {
        const data = snap.val();
        if (data && data.state && data.state !== engine.serialize()) {
          const newEngine = new GoEngine(BOARD_SIZE);
          if (typeof data.state === 'string' && data.state.startsWith('resigned_')) { newEngine.load(engine.serialize()); newEngine.winner = data.state === 'resigned_w' ? 'b' : 'w'; } else { newEngine.load(data.state); }
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
    const newRoomRef = push(ref(db, `games/go`));
    
    // Depending on game, initial state varies
    let initialState = '';
    
    
    initialState = new GoEngine(19).serialize();
    
    
    await set(newRoomRef, { state: initialState, status: 'waiting_for_friend' });
    setRoomId(newRoomRef.key);
    setMyColor('b'); // Chess/Checkers white first, Go/Othello black first
    setMode('multiplayer');
    
    const link = `${window.location.origin}/go?room=${newRoomRef.key}`;
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

    const waitingRef = ref(db, 'matchmaking/go/waiting');
    const snap = await get(waitingRef);

    if (snap.exists()) {
      const opponentId = snap.val();
      if (opponentId === user.uid) return;

      await remove(waitingRef);
      const newRoomRef = push(ref(db, 'games/go'));
      const newRoomId = newRoomRef.key;

      await set(newRoomRef, {
        white: user.uid, // Opponent was waiting, let them be black
        black: opponentId,
        state: new GoEngine(BOARD_SIZE).serialize(),
        status: 'playing',
        timestamp: serverTimestamp()
      });

      await set(ref(db, `users/${opponentId}/currentMatch`), newRoomId);
      
      setRoomId(newRoomId);
      setMyColor('w');
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
          setMyColor('b');
          resetGame();
          setStatus('Oyun Başladı! Uğurlar.'); setShowVs(true); uiAudio.success();
          setIsSearching(false);
          remove(matchRef);
        }
      });
    }
  };
  

  const getStoneCount = (b: BoardState) => b.flat().filter(x => x !== null).length;

  useEffect(() => {
    updateStatus();
    
    // Bot plays white
    if (mode === 'bot' && engine.turn === 'w' && !engine.winner) {
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
    setStatus(`Gediş sırası: ${engine.turn === 'w' ? 'Ağlar' : 'Qaralar'}`);
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

  
  let gameResult: 'win' | 'loss' | 'draw' | null = null;
  if (engine.winner) {
    if (engine.winner === 'draw') {
      gameResult = 'draw';
    } else {
      if (mode === 'multiplayer') {
        gameResult = engine.winner === myColor ? 'win' : 'loss';
      } else {
        gameResult = engine.winner === 'b' ? 'win' : 'loss';
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
        <div className="w-full max-w-[600px] flex items-center justify-between mb-4 bg-zinc-950/80 p-4 rounded-2xl border-2 border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-2xl shadow-inner shadow-cyan-500/20">
              🤖
            </div>
            <div>
              <div className="font-black text-cyan-400 flex items-center gap-2 tracking-widest uppercase">
                {mode === 'multiplayer' ? opponentName : 'SYS.BOT.OPPONENT'} 
                <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-[10px] text-cyan-300 animate-pulse">{mode === 'multiplayer' ? opponentElo : 'LVL.99'}</span>
              </div>
              <div className="text-xs text-red-400 flex items-center gap-1 font-mono mt-1">
                <Clock className="w-3 h-3" /> ∞:∞
              </div>
            </div>
          </div>
        </div>

        {/* Custom Go Board (Cyberpunk Hologram) */}
        <div className="w-full max-w-[600px] aspect-square rounded-2xl p-2 md:p-6 shadow-[0_0_60px_rgba(6,182,212,0.15)] ring-4 ring-cyan-500/20 bg-zinc-950/90 relative backdrop-blur-3xl overflow-hidden touch-none select-none">
          {/* Holographic Underglow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.15),transparent_70%)] pointer-events-none"></div>

          {/* Searching Overlay */}
          <AnimatePresence>
            {isSearching && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-md rounded-2xl overflow-hidden"
              >
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                  <div className="w-[150%] h-[150%] bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.4),transparent_60%)] animate-pulse" />
                </div>
                
                <div className="relative w-32 h-32 mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-cyan-500/10 border-t-cyan-500 border-l-cyan-500 animate-[spin_2s_linear_infinite]" />
                  <div className="absolute inset-2 rounded-full border-2 border-purple-500/20 border-b-purple-500 border-r-purple-500 animate-[spin_3s_linear_infinite_reverse]" />
                  <div className="absolute inset-4 rounded-full overflow-hidden">
                    <div className="w-full h-full" style={{ background: 'conic-gradient(from 0deg, transparent 70%, rgba(6,182,212,0.8) 100%)', animation: 'spin 1.5s linear infinite' }} />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 bg-cyan-400 rounded-full shadow-[0_0_15px_#22d3ee] animate-ping" />
                  </div>
                  <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-30">
                    <line x1="50" y1="0" x2="50" y2="100" stroke="#06b6d4" strokeWidth="0.5" />
                    <line x1="0" y1="50" x2="100" y2="50" stroke="#06b6d4" strokeWidth="0.5" />
                    <circle cx="50" cy="50" r="25" fill="none" stroke="#06b6d4" strokeWidth="0.5" />
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#06b6d4" strokeWidth="0.5" />
                  </svg>
                </div>

                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-widest uppercase mb-2">
                  Rəqib Axtarılır
                </h2>
                <div className="flex items-center gap-1.5 mb-6 text-cyan-500/70 text-[10px] font-mono tracking-widest">
                  <span>SYS.SCAN</span>
                  <span className="flex gap-0.5">
                    <span className="w-1 h-1 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-1 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>

                <button 
                  onClick={() => { setIsSearching(false); setStatus('Oyun başlayır...'); uiAudio.click(); }} 
                  className="px-6 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold border border-red-500/30 transition-all active:scale-95 uppercase tracking-widest"
                >
                  ABORT_MISSION
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="w-full h-full relative z-10">
            {/* The Grid Lines */}
            {Array(19).fill(null).map((_, i) => (
              <React.Fragment key={i}>
                {/* Horizontal line */}
                <div className="absolute bg-cyan-900/50" style={{ top: `${(i / 18) * 100}%`, left: 0, right: 0, height: '1px', transform: 'translateY(-50%)', boxShadow: '0 0 5px rgba(6,182,212,0.3)' }} />
                {/* Vertical line */}
                <div className="absolute bg-cyan-900/50" style={{ left: `${(i / 18) * 100}%`, top: 0, bottom: 0, width: '1px', transform: 'translateX(-50%)', boxShadow: '0 0 5px rgba(6,182,212,0.3)' }} />
              </React.Fragment>
            ))}

            {/* The Star Points (Hoshi) */}
            {[ [3,3], [3,9], [3,15], [9,3], [9,9], [9,15], [15,3], [15,9], [15,15] ].map(([r, c], i) => (
              <div key={`star-${i}`} className="absolute w-2 h-2 bg-cyan-400 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_10px_#22d3ee]" style={{ top: `${(r / 18) * 100}%`, left: `${(c / 18) * 100}%` }} />
            ))}

            {/* The Intersections (Clickable Areas and Stones) */}
            {board.map((row, rIndex) => (
              row.map((cell, cIndex) => {
                const isHoverable = !cell && (mode === 'bot' || engine.turn === myColor);
                return (
                  <div 
                    key={`${rIndex}-${cIndex}`}
                    onClick={() => { if(isHoverable) uiAudio.click(); handleCellClick(rIndex, cIndex); }}
                    onMouseEnter={() => { if(isHoverable) uiAudio.hover(); }}
                    className="absolute w-[5%] h-[5%] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer group z-10"
                    style={{ top: `${(rIndex / 18) * 100}%`, left: `${(cIndex / 18) * 100}%` }}
                  >
                    {/* Hover Preview for empty cells */}
                    {isHoverable && (
                      <div className={`w-[90%] h-[90%] rounded-full opacity-0 group-hover:opacity-40 transition-opacity ${engine.turn === 'b' ? 'bg-cyan-500 shadow-[0_0_15px_#06b6d4]' : 'bg-pink-500 shadow-[0_0_15px_#ec4899]'}`} />
                    )}
                    
                    {/* Placed Stone */}
                    {cell && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`w-[90%] h-[90%] rounded-full shadow-lg flex items-center justify-center relative overflow-hidden ${
                          cell === 'b' 
                            ? 'bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_0_20px_rgba(6,182,212,0.6)] border border-cyan-200/50' 
                            : 'bg-gradient-to-br from-pink-400 to-rose-600 shadow-[0_0_20px_rgba(236,72,153,0.6)] border border-pink-200/50'
                        }`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/30 rounded-full" />
                      </motion.div>
                    )}
                  </div>
                );
              })
            ))}
          </div>
        </div>

        {/* My Info (Cyberpunk) */}
        <div className="w-full max-w-[600px] flex items-center justify-between mt-4 bg-zinc-950/80 p-4 rounded-2xl border-2 border-pink-500/30 shadow-[0_0_20px_rgba(236,72,153,0.15)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-pink-950 border border-pink-500/50 flex items-center justify-center text-2xl shadow-inner shadow-pink-500/20">
              😎
            </div>
            <div>
              <div className="font-black text-pink-400 flex items-center gap-2 tracking-widest uppercase">
                {blackPlayer.name} <span className="px-2 py-0.5 rounded bg-pink-500/10 border border-pink-500/30 text-[10px] text-pink-300 animate-pulse">{blackPlayer.elo}</span>
              </div>
              <div className="text-xs text-emerald-400 flex items-center gap-1 font-mono mt-1">
                <Clock className="w-3 h-3" /> ∞:∞
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




