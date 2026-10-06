'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Users, RotateCcw, Flag, Link as LinkIcon, Eye, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Connect4Engine, BoardState } from './engine';
import confetti from 'canvas-confetti';
import { toast } from 'react-hot-toast';
import { auth, db } from '@/lib/firebase';
import { updateStreakAndQuests } from '@/utils/streaks';
import { ref, get, set, update, remove, onValue, push, onDisconnect } from 'firebase/database';
import { onAuthStateChanged, User } from 'firebase/auth';
import GameChat from '@/components/GameChat';
import EndGameModal from '@/components/EndGameModal';
import VsScreen from '@/components/VsScreen';
import { uiAudio } from '@/utils/sfx';

import { playMoveSound } from '@/utils/sounds';

export default function Connect4Arena() {
  const [engine, setEngine] = useState(() => new Connect4Engine());
  const [board, setBoard] = useState<BoardState>(engine.board);
  const [mode, setMode] = useState<'bot' | 'multiplayer'>('bot');
  const [difficulty, setDifficulty] = useState<number>(3); 
  const [roomId, setRoomId] = useState<string | null>(null);
  const [myColor, setMyColor] = useState<'r'|'y'>('r');
  const [showVs, setShowVs] = useState(false);
  const [opponentName, setOpponentName] = useState('Oyunçu');
  const [opponentElo, setOpponentElo] = useState(1200);
  const [isSpectator, setIsSpectator] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [status, setStatus] = useState<string>('Oyun Başladı');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const resetGame = () => {
    const newEngine = new Connect4Engine();
    setEngine(newEngine);
    setBoard(newEngine.board);
    setStatus('Oyun Başladı');
    if (mode === 'multiplayer' && roomId) {
      update(ref(db, `games/connect4/${roomId}`), { state: newEngine.serialize(), status: 'playing' });
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && user) {
      const params = new URLSearchParams(window.location.search);
      const room = params.get('room');
      const watch = params.get('watch');
      
      if (watch && !roomId) {
        setMode('multiplayer');
        setRoomId(watch);
        setIsSpectator(true);
        setStatus('İzləyici kimi qoşuldunuz');
        toast.success('Otağa izləyici kimi qoşuldunuz!', { icon: '👁️' });
        window.history.replaceState({}, '', window.location.pathname);
      } else if (room && !roomId) {
        get(ref(db, `games/connect4/${room}`)).then(snap => {
          if (snap.exists()) {
             const data = snap.val();
             if (data.status === 'playing' || data.guest) {
                setMode('multiplayer');
                setRoomId(room);
                setIsSpectator(true);
                setStatus('Otaq doludur. İzləyici kimi qoşuldunuz');
             } else {
                setMode('multiplayer');
                setRoomId(room);
                setMyColor('y');
                update(ref(db, `games/connect4/${room}`), { status: 'playing', guest: user.uid });
                setStatus('Otağa qoşuldunuz! Oyun Başladı.');
             }
             window.history.replaceState({}, '', window.location.pathname);
          }
        });
      }
    }
  }, [user, roomId]);

  const updateStatus = () => {
    if (engine.winner) {
      if (engine.winner === 'draw') setStatus('Heç-heçə!');
      else if (mode === 'multiplayer') setStatus(engine.winner === myColor ? 'Siz Qalib Gəldiniz!' : 'Rəqib Qalib Gəldi!');
      else setStatus(engine.winner === 'r' ? 'Siz Qalib Gəldiniz!' : 'Bot Qalib Gəldi!');
      if (engine.winner === 'r' || (mode === 'multiplayer' && engine.winner === myColor)) {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      }
    } else {
      if (mode === 'multiplayer') setStatus(engine.turn === myColor ? 'Sizin Gedişiniz' : 'Rəqibin Gedişi');
      else setStatus(engine.turn === 'r' ? 'Sizin Gedişiniz' : 'Bot Düşünür...');
    }
  };

  useEffect(() => {
    if (mode === 'multiplayer' && roomId) {
      const gameRef = ref(db, `games/connect4/${roomId}`);
      const unsub = onValue(gameRef, (snap) => {
        const data = snap.val();
        if (data && data.state && data.state !== engine.serialize()) {
          const newEngine = new Connect4Engine();
          if (typeof data.state === 'string' && data.state.startsWith('resigned_')) { 
            newEngine.load(engine.serialize()); 
            newEngine.winner = data.state === 'resigned_r' ? 'y' : 'r'; 
          } else { 
            newEngine.load(data.state); 
          }
          setEngine(newEngine);
          setBoard([...newEngine.board.map(r => [...r])]);
          updateStatus();
          playMoveSound();
        }
      });
      return () => unsub();
    }
  }, [mode, roomId, engine]);

  const findMatch = async () => {
    if (!user) { toast.error('Oynamaq üçün hesabınıza daxil olun!'); return; }
    setIsSearching(true);
    setStatus('Rəqib axtarılır...');

    const waitingRef = ref(db, 'matchmaking/connect4/waiting');
    const snap = await get(waitingRef);
    if (snap.exists()) {
      const matchRoomId = snap.val();
      setRoomId(matchRoomId);
      setMyColor('y');
      setMode('multiplayer');
      remove(waitingRef);
      update(ref(db, `games/connect4/${matchRoomId}`), { status: 'playing', guest: user.uid });
      setIsSearching(false);
      resetGame();
      setStatus('Oyun Başladı!');
      playMoveSound();
    } else {
      const newRoomRef = push(ref(db, `games/connect4`));
      await set(newRoomRef, { state: new Connect4Engine().serialize(), status: 'waiting', host: user.uid });
      set(waitingRef, newRoomRef.key);
      setRoomId(newRoomRef.key);
      setMyColor('r');
      setMode('multiplayer');
      onDisconnect(waitingRef).remove();
      
      const matchRef = ref(db, `users/${user.uid}/currentMatch`);
      const unsubMatch = onValue(matchRef, (snapMatch) => {
        const foundRoomId = snapMatch.val();
        if (foundRoomId) {
          setRoomId(foundRoomId);
          setMyColor('r');
          resetGame();
          setStatus('Oyun Başladı!');
          playMoveSound();
          setIsSearching(false);
          remove(matchRef);
          unsubMatch();
        }
      });
    }
  };

  const createPrivateRoom = async () => {
    if (!user) { toast.error('Dostla oynamaq üçün daxil olun!'); return; }
    const newRoomRef = push(ref(db, `games/connect4`));
    await set(newRoomRef, { state: new Connect4Engine().serialize(), status: 'waiting_for_friend' });
    setRoomId(newRoomRef.key);
    setMyColor('r');
    setMode('multiplayer');
    const link = `${window.location.origin}/connect4?room=${newRoomRef.key}`;
    navigator.clipboard.writeText(link).then(() => {
       toast.success('Link kopyalandı! Dostunuza göndərin.');
       setStatus('Dostunuzun qoşulması gözlənilir...');
    });
  };

  const resign = () => {
    if (mode === 'multiplayer' && roomId) {
      if (confirm('Təslim olmaq istədiyinizə əminsiniz?')) {
        update(ref(db, `games/connect4/${roomId}`), { state: `resigned_${myColor}` });
      }
    } else {
      engine.winner = 'y';
      setBoard([...engine.board.map(r => [...r])]);
      updateStatus();
    }
  };

  const onColumnClick = (c: number) => {
    if (isSpectator) { toast.error('İzləyicilər gediş edə bilməz!'); return; }
    if (engine.winner) return;
    if (mode === 'multiplayer' && engine.turn !== myColor) return;
    if (mode === 'bot' && engine.turn === 'y') return;

    if (engine.drop(c)) {
      setBoard([...engine.board.map(r => [...r])]);
      updateStatus();
      playMoveSound();
      if (mode === 'multiplayer' && roomId) {
        update(ref(db, `games/connect4/${roomId}`), { state: engine.serialize() });
      }
    }
  };

  useEffect(() => {
    if (mode === 'bot' && engine.turn === 'y' && !engine.winner) {
      const t = setTimeout(() => {
        const col = engine.getBestMove(difficulty);
        if (col !== -1) {
          engine.drop(col);
          setBoard([...engine.board.map(r => [...r])]);
          updateStatus();
          playMoveSound();
        }
      }, 500);
      return () => clearTimeout(t);
    }
  }, [engine.turn, mode, engine.winner, difficulty]);

  let gameResult: 'win' | 'loss' | 'draw' | null = null;
  if (engine.winner) {
    if (engine.winner === 'draw') gameResult = 'draw';
    else {
      if (mode === 'multiplayer') gameResult = isSpectator ? null : (engine.winner === myColor ? 'win' : 'loss');
      else gameResult = engine.winner === 'r' ? 'win' : 'loss';
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8 relative z-10 pt-24">
      <EndGameModal isOpen={gameResult !== null} result={gameResult} onRematch={() => { setMode("bot"); resetGame(); }} />
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-zinc-400 hover:text-white transition">
        <ArrowRight className="w-4 h-4 rotate-180" /> Geri Qayıt
      </Link>

            {/* Epic Match Intro Screen */}
      <VsScreen 
        show={showVs} 
        player1Name={myColor === 'r' ? user?.displayName || 'Siz' : opponentName}
        player2Name={myColor === 'y' ? user?.displayName || 'Siz' : opponentName}
        player1Avatar="😎"
        player2Avatar="🤖"
        onComplete={() => setShowVs(false)}
      />

      <div className="flex-1 max-w-3xl mx-auto w-full relative z-10 flex flex-col items-center">
        
        {/* Opponent Info (Cyberpunk) */}
        <div className="w-full flex items-center justify-between mb-4 bg-zinc-950/80 p-4 rounded-2xl border-2 border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.15)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-yellow-950 border border-yellow-500/50 flex items-center justify-center text-2xl shadow-inner shadow-yellow-500/20">🤖</div>
            <div>
              <div className="font-black text-yellow-400 flex items-center gap-2 tracking-widest uppercase">
                {mode==='multiplayer'?(myColor==='y'?user?.displayName||'Siz':opponentName):'SYS.BOT'}
                <span className="px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/30 text-[10px] text-yellow-300 animate-pulse">{mode==='multiplayer'?opponentElo:'LVL.MAX'}</span>
              </div>
              <div className="text-[10px] font-mono text-zinc-500 mt-1">SÜNİ İNTELLEKT - SARI KÜRLƏR</div>
            </div>
          </div>
          <div className="text-xl px-4 font-black">🟡</div>
        </div>

        <div className="bg-zinc-950/90 rounded-3xl p-4 md:p-8 shadow-[0_0_50px_rgba(59,130,246,0.2)] border-[8px] border-blue-900/60 relative backdrop-blur-3xl overflow-hidden w-full">
          {/* Holographic Underglow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.3),transparent_70%)] pointer-events-none"></div>

          {/* Searching Overlay */}
          <AnimatePresence>
            {isSearching && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-md rounded-xl overflow-hidden"
              >
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                  <div className="w-[150%] h-[150%] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.4),transparent_60%)] animate-pulse" />
                </div>
                
                <div className="relative w-32 h-32 mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-500/10 border-t-blue-500 border-l-blue-500 animate-[spin_2s_linear_infinite]" />
                  <div className="absolute inset-2 rounded-full border-2 border-red-500/20 border-b-red-500 border-r-red-500 animate-[spin_3s_linear_infinite_reverse]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 bg-blue-400 rounded-full shadow-[0_0_15px_#3b82f6] animate-ping" />
                  </div>
                </div>

                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 tracking-widest uppercase mb-2">
                  Rəqib Axtarılır
                </h2>
                <div className="flex items-center gap-1.5 mb-6 text-blue-500/70 text-[10px] font-mono tracking-widest">
                  <span>SYS.SCAN</span>
                  <span className="flex gap-0.5">
                    <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>

                <button 
                  onClick={() => { setIsSearching(false); setStatus('Oyun başlayır...'); uiAudio.click(); }} 
                  className="px-6 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30 transition-all active:scale-95 uppercase tracking-widest"
                >
                  ABORT_MISSION
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-7 gap-2 md:gap-4 w-full aspect-[7/6] relative z-10 touch-none select-none">
            {board.map((row, r) => 
              row.map((cell, c) => {
                const isLast = engine.lastMove?.r === r && engine.lastMove?.c === c;
                const isHoverable = !engine.winner && cell === null;
                return (
                  <div 
                    key={`${r}-${c}`} 
                    onClick={() => { uiAudio.click(); onColumnClick(c); }} 
                    onMouseEnter={() => { if(isHoverable) uiAudio.hover(); }}
                    className="w-full h-full bg-black/60 rounded-full border-[3px] border-blue-950/80 shadow-[inset_0_5px_15px_rgba(0,0,0,1)] flex items-center justify-center cursor-pointer overflow-hidden relative group hover:border-blue-500/50 transition-colors"
                  >
                    <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition" />
                    
                    {/* Ghost Drop Preview */}
                    {isHoverable && engine.turn === myColor && (
                       <div className={`w-[85%] h-[85%] rounded-full absolute opacity-0 group-hover:opacity-30 ${myColor==='r'?'bg-red-500':'bg-yellow-400'} shadow-[0_0_20px_currentColor]`} />
                    )}

                    <AnimatePresence>
                      {cell && (
                        <motion.div 
                          initial={{ y: -400, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ type: "spring", bounce: 0.5 }}
                          className={`w-[90%] h-[90%] rounded-full shadow-2xl relative overflow-hidden flex items-center justify-center border-2 ${
                            cell === 'r' 
                              ? 'bg-gradient-to-br from-red-400 to-rose-700 border-red-300 shadow-[0_0_25px_rgba(225,29,72,0.6)]' 
                              : 'bg-gradient-to-br from-yellow-300 to-orange-500 border-yellow-200 shadow-[0_0_25px_rgba(245,158,11,0.6)]'
                          } ${isLast ? 'ring-4 ring-white shadow-[0_0_40px_#ffffff]' : ''}`}
                        >
                           <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/40 rounded-full" />
                           <div className="w-[60%] h-[60%] rounded-full border-4 border-black/10 mix-blend-overlay"></div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* My Info (Cyberpunk) */}
        <div className="w-full flex items-center justify-between mt-4 bg-zinc-950/80 p-4 rounded-2xl border-2 border-red-500/30 shadow-[0_0_20px_rgba(220,38,38,0.15)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-950 border border-red-500/50 flex items-center justify-center text-2xl shadow-inner shadow-red-500/20">😎</div>
            <div>
              <div className="font-black text-red-400 flex items-center gap-2 tracking-widest uppercase">
                {mode==='multiplayer'?(myColor==='r'?user?.displayName||'Siz':opponentName):'SƏN (QIRMIZI)'}
                <span className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-[10px] text-red-300 animate-pulse">{mode==='multiplayer'?(user as any)?.elo || 1200:'LVL.1'}</span>
              </div>
              <div className="text-[10px] font-mono text-zinc-500 mt-1">İNSAN OYUNÇU - QIRMIZI KÜRLƏR</div>
            </div>
          </div>
          <div className="text-xl px-4 font-black">🔴</div>
        </div>
      </div>

      <div className="w-full lg:w-80 flex flex-col gap-4">
        <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-md">
          <h2 className="text-xl font-black text-white mb-4">Dördünü Birləşdir</h2>
          
          <div className="flex items-center gap-4 mb-6">
            <div className={`flex-1 p-3 rounded-xl border flex flex-col items-center ${engine.turn === 'r' ? 'border-red-500 bg-red-500/10' : 'border-zinc-800 bg-zinc-900'}`}>
              <div className="w-6 h-6 rounded-full bg-red-500 shadow-lg mb-2" />
              <span className="text-xs font-bold text-white uppercase tracking-widest">{mode === 'multiplayer' ? (myColor === 'r' ? 'Siz' : 'Rəqib') : 'Siz'}</span>
            </div>
            <div className={`flex-1 p-3 rounded-xl border flex flex-col items-center ${engine.turn === 'y' ? 'border-yellow-500 bg-yellow-500/10' : 'border-zinc-800 bg-zinc-900'}`}>
              <div className="w-6 h-6 rounded-full bg-yellow-400 shadow-lg mb-2" />
              <span className="text-xs font-bold text-white uppercase tracking-widest">{mode === 'multiplayer' ? (myColor === 'y' ? 'Siz' : 'Rəqib') : 'Bot'}</span>
            </div>
          </div>

          <div className="text-sm font-bold text-emerald-400 text-center mb-6">{status}</div>

          <div className="flex flex-col gap-2">
            {mode === 'bot' && (
              <div className="mb-4">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Bot Səviyyəsi (1-5)</label>
                <input type="range" min="1" max="5" value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))} className="w-full accent-blue-500" />
              </div>
            )}

            <div className="flex gap-2 mb-4">
              <button onClick={() => { setMode('bot'); resetGame(); }} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${mode === 'bot' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'}`}>
                <Bot className="w-4 h-4" /> Bot
              </button>
              <button onClick={() => { setMode('multiplayer'); resetGame(); }} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${mode === 'multiplayer' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}>
                <Users className="w-4 h-4" /> Canlı
              </button>
            </div>

            {mode === 'multiplayer' ? (
              <>
                {isSearching ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full py-4 rounded-xl border border-blue-500/30 bg-blue-500/10 flex flex-col items-center justify-center gap-3">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <div className="text-sm font-bold text-blue-400">Rəqib axtarılır...</div>
                  </motion.div>
                ) : (
                  <button onClick={findMatch} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold text-white transition flex items-center justify-center gap-2 mb-2">
                    <Users className="w-4 h-4" /> Rəqib Axtar
                  </button>
                )}
                <button onClick={createPrivateRoom} className="w-full py-3 mb-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-bold text-white transition flex items-center justify-center gap-2">
                  <LinkIcon className="w-4 h-4" /> Dostla Oyna (Link)
                </button>
                <button onClick={() => {
                  const link = `${window.location.origin}/connect4?watch=${roomId}`;
                  navigator.clipboard.writeText(link).then(() => toast.success('İzləyici linki kopyalandı!'));
                }} className="w-full py-2 mb-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-white transition flex items-center justify-center gap-2">
                  <Eye className="w-4 h-4" /> İzləyici Linki
                </button>
                {isSpectator ? (
                  <div className="flex-1 py-2 rounded-xl bg-zinc-800 text-sm font-bold text-zinc-500 flex items-center justify-center gap-2"><Eye className="w-4 h-4"/> İzləyici</div>
                ) : (
                  <button onClick={resign} className="flex-1 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-sm font-bold text-red-400 transition flex items-center justify-center gap-2">
                    <Flag className="w-4 h-4" /> Təslim ol
                  </button>
                )}
              </>
            ) : (
              <button onClick={resetGame} className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-white transition flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" /> Yenidən Başla
              </button>
            )}
          </div>
        </div>

        {engine.moveHistory && engine.moveHistory.length > 0 && (
          <div className="p-4 rounded-3xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-md max-h-48 overflow-y-auto custom-scrollbar">
            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-3 sticky top-0 bg-zinc-900/80 backdrop-blur-md py-1">Gedişlər</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-medium">
              {engine.moveHistory.reduce((result, value, index, array) => {
                if (index % 2 === 0) result.push(array.slice(index, index + 2));
                return result;
              }, [] as any[]).map((pair: any, i: number) => (
                <div key={i} className="col-span-2 grid grid-cols-12 gap-2 hover:bg-white/5 px-2 py-1 rounded">
                  <div className="col-span-2 text-zinc-500 text-right">{i + 1}.</div>
                  <div className="col-span-5 text-red-400">{pair[0]}</div>
                  <div className="col-span-5 text-yellow-400">{pair[1] || ''}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <GameChat roomId={roomId} gameName="connect4" userName={user?.displayName || "Oyun�u"} />
      </div>
    </div>
  );
}


