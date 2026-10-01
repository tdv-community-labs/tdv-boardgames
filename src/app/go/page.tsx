'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, ArrowLeft, Flag, Shield, Swords } from 'lucide-react';
import Link from 'next/link';
import { GoEngine, BoardState } from './engine';
import { playMoveSound, playCaptureSound } from '@/utils/sounds';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { ref, get, set, update, remove, onValue, push, onDisconnect, serverTimestamp } from 'firebase/database';

export default function GoArena() {
  const [engine, setEngine] = useState(() => { const e = new GoEngine(19); if (typeof window !== 'undefined') { const s = localStorage.getItem('tdv-go'); if (s) e.load(s); } return e; });

  const [board, setBoard] = useState<BoardState>(engine.board);
  const [mode, setMode] = useState<'bot' | 'multiplayer'>('bot');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [myColor, setMyColor] = useState<'b' | 'w'>('b');

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
        <div className="w-full max-w-[600px] aspect-square rounded-lg p-2 md:p-6 shadow-[0_0_50px_rgba(34,197,94,0.15)] ring-4 ring-zinc-800/50 bg-[#dcba82] relative">
          <div className="w-full h-full relative">
            {/* The Grid Lines */}
            {Array(19).fill(null).map((_, i) => (
              <React.Fragment key={i}>
                {/* Horizontal line */}
                <div className="absolute bg-zinc-800" style={{ top: `%`, left: 0, right: 0, height: '1px', transform: 'translateY(-50%)' }} />
                {/* Vertical line */}
                <div className="absolute bg-zinc-800" style={{ left: `%`, top: 0, bottom: 0, width: '1px', transform: 'translateX(-50%)' }} />
              </React.Fragment>
            ))}

            {/* The Star Points (Hoshi) */}
            {[ [3,3], [3,9], [3,15], [9,3], [9,9], [9,15], [15,3], [15,9], [15,15] ].map(([r, c], i) => (
              <div key={"star-"} className="absolute w-2 h-2 bg-zinc-800 rounded-full -translate-x-1/2 -translate-y-1/2" style={{ top: `%`, left: `%` }} />
            ))}

            {/* The Intersections (Clickable Areas and Stones) */}
            {board.map((row, rIndex) => (
              row.map((cell, cIndex) => {
                return (
                  <div 
                    key={`-`}
                    onClick={() => handleCellClick(rIndex, cIndex)}
                    className="absolute w-[5%] h-[5%] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer group z-10"
                    style={{ top: `%`, left: `%` }}
                  >
                    {/* Hover Preview for empty cells */}
                    {!cell && engine.turn === 'b' && (
                      <div className="w-full h-full rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                    
                    {/* Placed Stone */}
                    {cell && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={"w-[110%] h-[110%] rounded-full shadow-md " + (cell === 'w' ? 'bg-zinc-100 shadow-white/20' : 'bg-zinc-950 shadow-black/50 border border-white/10')}
                      />
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




