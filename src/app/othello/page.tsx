'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {  ArrowLeft, Users, Shield, Swords , Flag , Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';
import EndGameModal from '@/components/EndGameModal';
import VsScreen from '@/components/VsScreen';
import { uiAudio } from '@/utils/sfx';
import GameChat from '@/components/GameChat';
import { OthelloEngine, Move } from './engine';
import { playMoveSound, playCaptureSound } from '@/utils/sounds';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import confetti from 'canvas-confetti';
import { toast } from 'react-hot-toast';
import { ref, get, set, update, remove, onValue, push, onDisconnect, serverTimestamp } from 'firebase/database';

export default function OthelloArena() {
  const [engine, setEngine] = useState(() => { const e = new OthelloEngine(); if (typeof window !== 'undefined') { const s = localStorage.getItem('tdv-othello'); if (s) e.load(s); } return e; });
  const [board, setBoard] = useState(engine.board);
  const [validMoves, setValidMoves] = useState<Move[]>(engine.getValidMoves(engine.turn));
  
  const [mode, setMode] = useState<'bot' | 'multiplayer'>('bot');
  const [user, setUser] = useState<User | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [myColor, setMyColor] = useState<'b' | 'w'>('b');
  const [showVs, setShowVs] = useState(false);
  const [opponentName, setOpponentName] = useState('Oyunçu');
  const [opponentElo, setOpponentElo] = useState(1200);
  const [eloUpdated, setEloUpdated] = useState(false);
  const [status, setStatus] = useState('Oyun Başladı. Gediş: Qaralar');

  useEffect(() => { localStorage.setItem('tdv-othello', engine.serialize()); }, [board, engine.turn]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  // Sync state for multiplayer
  useEffect(() => {
    if (mode === 'multiplayer' && user && roomId) {
      const gameRef = ref(db, `games/othello/${roomId}`);
      const unsub = onValue(gameRef, (snap) => {
        const data = snap.val();
        if (data && data.state && data.state !== engine.serialize()) {
          const newE = new OthelloEngine();
          if (typeof data.state === 'string' && data.state.startsWith('resigned_')) {
            newE.load(engine.serialize());
            newE.winner = data.state === 'resigned_w' ? 'b' : 'w';
          } else {
            newE.load(data.state);
          }
          setEngine(newE);
          setBoard(newE.board);
          setValidMoves(newE.getValidMoves(newE.turn));
          updateStatus(newE);
        }
      });
      return () => unsub();
    }
  }, [mode, roomId, user]);

  // Handle Bot Turn
  useEffect(() => {
    let timeoutId: any;
    if (mode === 'bot' && engine.turn === 'w' && !engine.winner) {
      timeoutId = setTimeout(() => {
        const bestMove = engine.getBestMove();
        if (bestMove) {
          engine.move(bestMove.r, bestMove.c);
          setBoard([...engine.board.map(r => [...r])]);
          setValidMoves(engine.getValidMoves(engine.turn));
          updateStatus(engine);
          playCaptureSound();
        } else {
           // Skip turn if bot has no moves (should be handled by engine, but just in case)
           engine.turn = 'b';
           setValidMoves(engine.getValidMoves('b'));
           updateStatus(engine);
        }
      }, 800);
    }
    return () => { if (timeoutId) clearTimeout(timeoutId); };
  }, [engine.turn, engine.winner, mode, board]); // Depend on board so it triggers after user sets board

  
  useEffect(() => {
    if (typeof window !== 'undefined' && user) {
      const params = new URLSearchParams(window.location.search);
      const room = params.get('room');
      if (room && !roomId) {
        setMode('multiplayer');
        setRoomId(room);
        setMyColor('w'); // Joiner is opposite color
        setStatus('Otağa qoşuldunuz! Oyun Başladı.');
        toast.success('Dostunuzun otağına qoşuldunuz!', { icon: '🤝' });
        window.history.replaceState({}, '', window.location.pathname); // Clear URL
      }
    }
  }, [user, roomId]);

  // Handle Elo Updates
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
          let isWin = engine.winner === myColor;
          let isDraw = engine.winner === 'draw';
          
          if (isWin) { newWins++; newElo += 25; confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } }); toast.success('+25 Elo Qazandınız!', { icon: '🏆', duration: 5000 }); }
          else if (!isDraw) { newLosses++; newElo = Math.max(0, newElo - 25); toast.error('-25 Elo İtirdiniz.', { icon: '💀', duration: 5000 }); }
          
          update(userRef, { wins: newWins, losses: newLosses, elo: newElo });
        }
      });
    }
  }, [engine.winner, mode, user, eloUpdated, myColor]);

  const updateStatus = (e: OthelloEngine) => {
    if (e.winner) {
      if (e.winner === 'draw') setStatus('Heç-heçə!');
      else setStatus(e.winner === myColor && mode === 'multiplayer' || e.winner === 'b' && mode === 'bot' ? 'Siz Qalib Gəldiniz!' : 'Rəqib Qalib Gəldi!');
    } else {
      setStatus(`Gediş sırası: ${e.turn === 'w' ? 'Ağlar' : 'Qaralar'}`);
    }
  };

  const handleCellClick = (r: number, c: number) => {
    if (engine.winner) return;
    if (mode === 'bot' && engine.turn === 'w') return;
    if (mode === 'multiplayer' && engine.turn !== myColor) return;

    if (engine.move(r, c)) {
      if (mode === 'multiplayer' && roomId) set(ref(db, `games/othello/${roomId}/state`), engine.serialize());
      setBoard([...engine.board.map(row => [...row])]);
      setValidMoves(engine.getValidMoves(engine.turn));
      updateStatus(engine);
      playCaptureSound();
    }
  };

  
  const createPrivateRoom = async () => {
    if (!user) { alert('Dostla oynamaq üçün hesabınıza daxil olun!'); return; }
    const newRoomRef = push(ref(db, `games/othello`));
    
    // Depending on game, initial state varies
    let initialState = '';
    
    
    
    initialState = new OthelloEngine().serialize();
    
    await set(newRoomRef, { state: initialState, status: 'waiting_for_friend' });
    setRoomId(newRoomRef.key);
    setMyColor('b'); // Chess/Checkers white first, Go/Othello black first
    setMode('multiplayer');
    
    const link = `${window.location.origin}/othello?room=${newRoomRef.key}`;
    navigator.clipboard.writeText(link).then(() => {
       toast.success('Link kopyalandı! Dostunuza göndərin.', { icon: '🔗', duration: 6000 });
       setStatus('Dostunuzun qoşulması gözlənilir...');
    });
  };

  const findMatch =  async () => {
    if (!user) { alert('Multiplayer üçün hesabınıza daxil olun!'); return; }
    setIsSearching(true); setStatus('Rəqib axtarılır...');
    const wRef = ref(db, 'matchmaking/othello/waiting');
    const snap = await get(wRef);
    if (snap.exists()) {
      const oppId = snap.val();
      if (oppId === user.uid) return;
      await remove(wRef);
      const newRoomRef = push(ref(db, 'games/othello'));
      await set(newRoomRef, { state: new OthelloEngine().serialize(), status: 'playing' });
      await set(ref(db, `users/${oppId}/currentMatch`), newRoomRef.key);
      setRoomId(newRoomRef.key); setMyColor('w'); resetGame();
      setStatus('Oyun Başladı! Uğurlar.'); setShowVs(true); uiAudio.success(); playMoveSound(); setIsSearching(false);
    } else {
      await set(wRef, user.uid); onDisconnect(wRef).remove();
      const matchRef = ref(db, `users/${user.uid}/currentMatch`);
      onValue(matchRef, (s) => {
        if (s.val()) {
          setRoomId(s.val()); setMyColor('b'); resetGame();
          setStatus('Oyun Başladı! Uğurlar.'); setShowVs(true); uiAudio.success(); playMoveSound(); setIsSearching(false); remove(matchRef);
        }
      });
    }
  };

  const resetGame = () => {
    const e = new OthelloEngine();
    setEngine(e); setBoard(e.board); setValidMoves(e.getValidMoves('b')); setStatus('Oyun Başladı. Gediş: Qaralar'); setEloUpdated(false);
  };

  // Count pieces
  let bCount = 0, wCount = 0;
  board.forEach(r => r.forEach(c => { if(c === 'b') bCount++; else if (c === 'w') wCount++; }));

  
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
        <ArrowLeft className="w-4 h-4" /> <span className="text-sm font-bold uppercase tracking-widest">Geri Qayıt</span>
      </Link>
      
            {/* Epic Match Intro Screen */}
      <VsScreen 
        show={showVs} 
        player1Name={myColor === 'b' ? user?.displayName || 'Siz' : opponentName}
        player2Name={myColor === 'w' ? user?.displayName || 'Siz' : opponentName}
        player1Avatar="😎"
        player2Avatar="🤖"
        onComplete={() => setShowVs(false)}
      />

      <div className="flex-1 flex flex-col items-center justify-center relative">
        <div className="w-full max-w-full sm:max-w-[80vh] flex items-center justify-between mb-8 bg-zinc-950/80 p-4 rounded-2xl border-2 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-2xl shadow-inner shadow-emerald-500/20">🤖</div>
            <div>
              <div className="font-black text-emerald-400 flex items-center gap-2 tracking-widest uppercase">
                {mode==='multiplayer'?(myColor==='w'?user?.displayName||'Siz':opponentName):'SYS.BOT.OPPONENT'}
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-300 animate-pulse">{mode==='multiplayer'?opponentElo:'LVL.99'}</span>
              </div>
              <div className="text-[10px] font-mono text-zinc-500 mt-1">SÜNİ İNTELLEKT</div>
            </div>
          </div>
          <div className="text-3xl font-black text-white px-5 bg-zinc-900 border border-emerald-500/20 rounded-xl py-1 shadow-inner shadow-black">{wCount}</div>
        </div>

        <div className="w-full max-w-full sm:max-w-[80vh] aspect-square rounded-2xl p-2 md:p-4 bg-zinc-950/90 shadow-[0_0_60px_rgba(16,185,129,0.15)] ring-4 ring-emerald-500/20 relative backdrop-blur-3xl overflow-hidden touch-none select-none">
          
          {/* Holographic Underglow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.15),transparent_70%)] pointer-events-none"></div>

          {/* Searching Overlay */}
          <AnimatePresence>
            {isSearching && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-md rounded-2xl overflow-hidden"
              >
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                  <div className="w-[150%] h-[150%] bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.4),transparent_60%)] animate-pulse" />
                </div>
                
                <div className="relative w-32 h-32 mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-500/10 border-t-emerald-500 border-l-emerald-500 animate-[spin_2s_linear_infinite]" />
                  <div className="absolute inset-2 rounded-full border-2 border-emerald-300/20 border-b-emerald-300 border-r-emerald-300 animate-[spin_3s_linear_infinite_reverse]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 bg-emerald-400 rounded-full shadow-[0_0_15px_#10b981] animate-ping" />
                  </div>
                </div>

                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-500 tracking-widest uppercase mb-2">
                  Rəqib Axtarılır
                </h2>
                <div className="flex items-center gap-1.5 mb-6 text-emerald-500/70 text-[10px] font-mono tracking-widest">
                  <span>SYS.SCAN</span>
                  <span className="flex gap-0.5">
                    <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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

          <div className="grid grid-cols-8 grid-rows-8 w-full h-full border border-emerald-500/20 relative z-10">
            {board.map((row, r) => row.map((cell, c) => {
              const isLastMove = engine.lastMove && engine.lastMove.to.r === r && engine.lastMove.to.c === c;
              const isMove = validMoves.some(m => m.r === r && m.c === c);
              const highlightTurn = mode === 'bot' && engine.turn === 'w' ? false : (mode === 'multiplayer' && engine.turn !== myColor ? false : true);
              return (
                <div key={`${r}-${c}`} onClick={() => { uiAudio.click(); handleCellClick(r, c); }} onMouseEnter={() => { if(isMove) uiAudio.hover(); }} className={`w-full h-full border border-emerald-900/40 flex items-center justify-center relative cursor-pointer hover:bg-emerald-900/20 transition-colors ${isLastMove ? 'bg-emerald-900/50 shadow-[inset_0_0_20px_rgba(16,185,129,0.3)]' : 'bg-zinc-950'}`}>
                  {isMove && highlightTurn && <div className="absolute w-6 h-6 rounded-full border-2 border-dashed border-emerald-500/50 animate-[spin_3s_linear_infinite] z-0" />}
                  {isMove && highlightTurn && <div className="absolute w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981] animate-ping z-0" />}
                  
                  <AnimatePresence>
                    {cell && (
                      <motion.div initial={{ rotateY: 90 }} animate={{ rotateY: 0 }} transition={{ duration: 0.3 }} className={`z-10 w-[85%] h-[85%] rounded-full shadow-2xl border flex items-center justify-center overflow-hidden ${cell==='w'?'bg-gradient-to-br from-zinc-100 to-zinc-400 border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]':'bg-gradient-to-br from-zinc-800 to-black border-zinc-700 shadow-[0_0_15px_rgba(0,0,0,0.8)]'}`}>
                         <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/20 rounded-full" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }))}
          </div>
        </div>

        <div className="w-full max-w-full sm:max-w-[80vh] flex items-center justify-between mt-8 bg-zinc-950/80 p-4 rounded-2xl border-2 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-2xl shadow-inner shadow-emerald-500/20">😎</div>
            <div>
              <div className="font-black text-emerald-400 flex items-center gap-2 tracking-widest uppercase">
                {mode==='multiplayer'?(myColor==='b'?user?.displayName||'Siz':opponentName):'SƏN (QARA)'}
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-300 animate-pulse">{mode==='multiplayer'?(user as any)?.elo || 1200:'LVL.1'}</span>
              </div>
              <div className="text-[10px] font-mono text-zinc-500 mt-1">İNSAN OYUNÇU</div>
            </div>
          </div>
          <div className="text-3xl font-black text-white px-5 bg-zinc-900 border border-emerald-500/20 rounded-xl py-1 shadow-inner shadow-black">{bCount}</div>
        </div>
      </div>

      <div className="w-full lg:w-80 flex flex-col gap-4">
        <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-md">
          <h2 className="tdv-section-label mb-2">Oyun Statusu</h2>
          <div className="text-xl font-bold text-white mb-6">{status}</div>
          <div className="flex gap-2 mb-6">
            <button onClick={()=>{setMode('bot');resetGame()}} className={`flex-1 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${mode==='bot'?'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/20':'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>Bot</button>
            <button onClick={()=>{setMode('multiplayer');resetGame()}} className={`flex-1 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${mode==='multiplayer'?'bg-blue-600 text-white shadow-lg shadow-blue-500/20':'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>Canlı</button>
          </div>
          {mode === 'multiplayer' && !roomId && (
            <button onClick={findMatch} disabled={isSearching} className="w-full py-3 mb-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold text-white transition disabled:opacity-50">
              {isSearching ? 'Rəqib axtarılır...' : 'Rəqib Axtar'}
            </button>
          )}
          <div className="flex gap-2 mb-2"><button onClick={resetGame} className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-white transition">Yenidən Başla</button> {mode === 'multiplayer' && roomId && !engine.winner && <button onClick={() => { if (confirm('Təslim olmaq istədiyinizə əminsiniz?')) { set(ref(db, `games/othello/${roomId}/state`), 'resigned_' + myColor); } }} className="flex-1 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-sm font-bold text-red-400 transition flex items-center justify-center gap-1"><Flag className="w-4 h-4" /> Təslim ol</button>}</div>
        </div>
        <GameChat roomId={roomId} gameName="othello" userName={user?.displayName || 'Oyunçu'} />
      </div>
    </div>
  );
}






