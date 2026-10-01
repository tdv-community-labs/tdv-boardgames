'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Users, Shield, Swords } from 'lucide-react';
import Link from 'next/link';
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
          newE.load(data.state);
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

  const findMatch = async () => {
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
      setStatus('Oyun Başladı! Uğurlar.'); toast.success('Oyun Başladı!', {icon:'🔥'}); playMoveSound(); setIsSearching(false);
    } else {
      await set(wRef, user.uid); onDisconnect(wRef).remove();
      const matchRef = ref(db, `users/${user.uid}/currentMatch`);
      onValue(matchRef, (s) => {
        if (s.val()) {
          setRoomId(s.val()); setMyColor('b'); resetGame();
          setStatus('Oyun Başladı! Uğurlar.'); toast.success('Oyun Başladı!', {icon:'🔥'}); playMoveSound(); setIsSearching(false); remove(matchRef);
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

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8 relative z-10 pt-24">
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-zinc-400 hover:text-white transition">
        <ArrowLeft className="w-4 h-4" /> <span className="text-sm font-bold uppercase tracking-widest">Geri Qayıt</span>
      </Link>
      
      <div className="flex-1 flex flex-col items-center justify-center relative">
        <div className="w-full max-w-full sm:max-w-[80vh] flex items-center justify-between mb-8 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-black border-2 border-white shadow-md">W</div>
            <div className="font-bold text-white">{mode==='multiplayer'?(myColor==='w'?user?.displayName||'Siz':'Rəqib'):'Bot (Ağ)'}</div>
          </div>
          <div className="text-2xl font-black text-white px-4 bg-zinc-950 rounded-xl py-1">{wCount}</div>
        </div>

        <div className="w-full max-w-full sm:max-w-[80vh] aspect-square rounded-sm p-2 bg-[#16a34a] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-[12px] border-zinc-900">
          <div className="grid grid-cols-8 grid-rows-8 w-full h-full border border-[#14532d]">
            {board.map((row, r) => row.map((cell, c) => {
              const isMove = validMoves.some(m => m.r === r && m.c === c);
              const highlightTurn = mode === 'bot' && engine.turn === 'w' ? false : (mode === 'multiplayer' && engine.turn !== myColor ? false : true);
              return (
                <div key={`${r}-${c}`} onClick={() => handleCellClick(r, c)} className="w-full h-full border border-[#15803d] flex items-center justify-center relative cursor-pointer">
                  {isMove && highlightTurn && <div className="absolute w-4 h-4 rounded-full bg-black/40 border border-black/50 animate-pulse z-0" />}
                  <AnimatePresence>
                    {cell && (
                      <motion.div initial={{ rotateY: 90 }} animate={{ rotateY: 0 }} transition={{ duration: 0.3 }} className={`z-10 w-[85%] h-[85%] rounded-full shadow-lg border ${cell==='w'?'bg-zinc-100 border-white':'bg-zinc-950 border-black'}`} />
                    )}
                  </AnimatePresence>
                </div>
              );
            }))}
          </div>
        </div>

        <div className="w-full max-w-full sm:max-w-[80vh] flex items-center justify-between mt-8 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-950 flex items-center justify-center font-bold text-white border-2 border-black shadow-md">B</div>
            <div className="font-bold text-white">{mode==='multiplayer'?(myColor==='b'?user?.displayName||'Siz':'Rəqib'):'Sən (Qara)'}</div>
          </div>
          <div className="text-2xl font-black text-white px-4 bg-zinc-950 rounded-xl py-1">{bCount}</div>
        </div>
      </div>

      <div className="w-full lg:w-80 flex flex-col gap-4">
        <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-md">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Oyun Statusu</h2>
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
          <button onClick={resetGame} className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-white transition">Yenidən Başla</button>
        </div>
        <GameChat roomId={roomId} gameName="othello" userName={user?.displayName || 'Oyunçu'} />
      </div>
    </div>
  );
}




