'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess, Move } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { motion, AnimatePresence } from 'framer-motion';
import {   Clock, Shield, Flag, Swords, ArrowLeft, Cpu, Users, Loader2 , Link as LinkIcon , Eye } from 'lucide-react';
import Link from 'next/link';
import EndGameModal from '@/components/EndGameModal';
import GameChat from '@/components/GameChat';
import { auth, db } from '@/lib/firebase';
import { ref, get, set, remove, onValue, push, serverTimestamp, onDisconnect, update } from 'firebase/database';
import { updateStreakAndQuests } from '@/utils/streaks';
import { onAuthStateChanged, User } from 'firebase/auth';
import confetti from 'canvas-confetti';
import { toast } from 'react-hot-toast';
import { playMoveSound, playCaptureSound } from '@/utils/sounds';

export default function ChessArena() {
  const [game, setGame] = useState(() => { if (typeof window !== 'undefined') { const saved = localStorage.getItem('tdv-chess'); if (saved) return new Chess(saved); } return new Chess(); });
  useEffect(() => { localStorage.setItem('tdv-chess', game.fen()); }, [game.fen()]);
  const [moves, setMoves] = useState<Move[]>([]);
  const [optionSquares, setOptionSquares] = useState<{ [square: string]: { background: string; borderRadius?: string } }>({});
  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  const [incomingDraw, setIncomingDraw] = useState(false);
  const [timeControl, setTimeControl] = useState<number>(300); // seconds
  const [whiteTime, setWhiteTime] = useState<number>(300);
  const [blackTime, setBlackTime] = useState<number>(300);
  const [clockRunning, setClockRunning] = useState(false);
  const [drawOfferedByMe, setDrawOfferedByMe] = useState(false);
  const [status, setStatus] = useState<string>('Oyun Başladı');
  const [engineWinner, setEngineWinner] = useState<string | null>(null);
  const [isSpectator, setIsSpectator] = useState(false);
  const [mode, setMode] = useState<'bot' | 'multiplayer'>('bot');
  const [difficulty, setDifficulty] = useState<number>(10);
  const [theme, setTheme] = useState<'classic' | 'wood' | 'ocean' | 'neon'>('classic');
  
  const themes = {
    classic: { light: '#f0d9b5', dark: '#b58863' },
    wood: { light: '#e6c8a0', dark: '#8b5a2b' },
    ocean: { light: '#d1e6e6', dark: '#4682b4' },
    neon: { light: '#2c003e', dark: '#ff007f' }
  }; // 1-20
  
  // Multiplayer State
  
  const [isSearching, setIsSearching] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [myColor, setMyColor] = useState<'w' | 'b'>('w');
  
  const engine = useRef<Worker | null>(null);

  // Fake players for now
  const whitePlayer = { name: myColor === 'w' ? "Sən" : "Rəqib", elo: 1450 };
  const blackPlayer = { 
    name: mode === 'bot' ? "Stockfish 19 (Bot)" : (myColor === 'b' ? "Sən" : (roomId ? "Canlı Rəqib" : "Rəqib_Usta")), 
    elo: mode === 'bot' ? 2800 : 1520 
  };

  useEffect(() => {
    // Initialize Stockfish worker
    if (typeof window !== 'undefined') {
      engine.current = new Worker('/stockfish.js');
      engine.current.postMessage('uci');
      engine.current.postMessage('isready');
      
      engine.current.onmessage = (event) => {
        const line = event.data;
        if (mode === 'bot' && line.startsWith('bestmove')) {
          const match = line.match(/^bestmove ([a-h][1-8])([a-h][1-8])([qrbn])?/);
          if (match) {
            const from = match[1];
            const to = match[2];
            const promotion = match[3];
            
            setGame((g) => {
              const newGame = new Chess(g.fen());
              const moveResult = newGame.move({ from, to, promotion });
              
              if (moveResult) {
                if (moveResult.captured) playCaptureSound();
                else playMoveSound();
              }

              setMoves(newGame.history({ verbose: true }) as Move[]);
              updateStatus(newGame);
              return newGame;
            });
          }
        }
      };
    }
    return () => {
      if (engine.current) engine.current.terminate();
    };
  }, [mode]);

  // Firebase Matchmaking & Game Sync
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (mode === 'multiplayer' && user && roomId) {
      const gameRef = ref(db, "games/chess/");
      const unsubscribe = onValue(gameRef, (snap) => {
        const data = snap.val();
        if (data && data.state && typeof data.state === 'string' && data.state.startsWith('resigned_')) {
            setEngineWinner(data.state);
            return;
          }
          if (data && data.fen !== game.fen()) {
          const newGame = new Chess(data.fen);
          setGame(newGame);
          setMoves(newGame.history({ verbose: true }) as Move[]);
          updateStatus(newGame);
        }
      });
      return () => unsubscribe();
    }
  }, [mode, roomId, user, game]);

  
  const [eloUpdated, setEloUpdated] = useState(false);

  useEffect(() => {
    if (mode === 'multiplayer' && game.isGameOver() && user && !eloUpdated) {
      setEloUpdated(true);
      const userRef = ref(db, `users/${user.uid}`);
      get(userRef).then(snap => {
        const u = snap.val();
        if (u) {
          let newWins = u.wins || 0;
          let newLosses = u.losses || 0;
          let newElo = u.elo || 1200;
          
          let isWin = false;
          let isDraw = game.isDraw() || game.isStalemate();
          
          if (game.isCheckmate()) {
             const winnerColor = game.turn() === 'w' ? 'b' : 'w';
             if (winnerColor === myColor) isWin = true;
          }
          
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
  }, [game, mode, user, eloUpdated, myColor]);

  
  const createPrivateRoom = async () => {
    if (!user) { alert('Dostla oynamaq üçün hesabınıza daxil olun!'); return; }
    const newRoomRef = push(ref(db, `games/chess`));
    
    // Depending on game, initial state varies
    let initialState = '';
    initialState = new Chess().fen();
    
    
    
    
    await set(newRoomRef, { state: initialState, status: 'waiting_for_friend' });
    setRoomId(newRoomRef.key);
    setMyColor('w'); // Chess/Checkers white first, Go/Othello black first
    setMode('multiplayer');
    
    const link = `${window.location.origin}/chess?room=${newRoomRef.key}`;
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
    setStatus('R?qib axtarılır...');

    const waitingRef = ref(db, 'matchmaking/chess/waiting');
    const snap = await get(waitingRef);

    if (snap.exists()) {
      const opponentId = snap.val();
      if (opponentId === user.uid) return;

      await remove(waitingRef);
      const newRoomRef = push(ref(db, 'games/chess'));
      const newRoomId = newRoomRef.key;

      await set(newRoomRef, {
        white: opponentId,
        black: user.uid,
        fen: new Chess().fen(),
        status: 'playing',
        timestamp: serverTimestamp()
      });

      await set(ref(db, "users//currentMatch"), newRoomId);
      
      setRoomId(newRoomId);
      setMyColor('b');
      resetGame();
      setStatus('Oyun Başladı! Uğurlar.'); toast.success('Oyun Başladı! Uğurlar.', { icon: '??' }); playMoveSound();
      setIsSearching(false);
    } else {
      await set(waitingRef, user.uid);
      onDisconnect(waitingRef).remove();

      const matchRef = ref(db, "users//currentMatch");
      onValue(matchRef, (snapMatch) => {
        const foundRoomId = snapMatch.val();
        if (foundRoomId) {
          setRoomId(foundRoomId);
          setMyColor('w');
          resetGame();
          setStatus('Oyun Başladı! Uğurlar.'); toast.success('Oyun Başladı! Uğurlar.', { icon: '??' }); playMoveSound();
          setIsSearching(false);
          remove(matchRef);
        }
      });
    }
  };

  const makeMove = useCallback((move: {from: string, to: string, promotion?: string}) => {
    try {
      const newGame = new Chess(game.fen());
      const result = newGame.move(move);
      
      if (result) {
        if (result.captured) playCaptureSound();
        else playMoveSound();

        setGame(newGame);
        setMoves(newGame.history({ verbose: true }) as Move[]);
        updateStatus(newGame);
        
        if (mode === 'bot' && !newGame.isGameOver()) {
          if (engine.current) {
            engine.current.postMessage(`position fen ${newGame.fen()}`);
            engine.current.postMessage(`setoption name Skill Level value ${difficulty}`);
            engine.current.postMessage(`go depth 15`);
          }
        } else if (mode === 'multiplayer' && roomId && user) {
          set(ref(db, "games/chess//fen"), newGame.fen());
        }
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  }, [game, mode, difficulty, roomId, user]);

  const onDrop = (sourceSquare: string, targetSquare: string, piece: string) => {
    // Check if it's our turn in multiplayer
    if (mode === 'multiplayer' && game.turn() !== myColor) {
      return false;
    }

    const move = makeMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: piece[1].toLowerCase() ?? 'q',
    });
    return move;
  };

  
  const onSquareClick = (square: string) => {
    if (isSpectator) return;
    if (game.isGameOver() || engineWinner) return;
    if (mode === 'multiplayer' && game.turn() !== myColor) return;
    if (mode === 'bot' && game.turn() === 'b') return;

    if (!moveFrom) {
      const hasMoveOptions = getMoveOptions(square);
      if (hasMoveOptions) setMoveFrom(square);
      return;
    }

    const movesObj = game.moves({ square: moveFrom as any, verbose: true }) as Move[];
    const foundMove = movesObj.find((m) => m.to === square);

    if (!foundMove) {
      const hasMoveOptions = getMoveOptions(square);
      setMoveFrom(hasMoveOptions ? square : null);
      return;
    }

    try {
      const move = game.move({ from: moveFrom, to: square, promotion: 'q' });
      if (move) {
        setMoves(game.history({ verbose: true }) as Move[]);
        updateStatus(game);
        setOptionSquares({});
    setMoveFrom(null);
    setWhiteTime(timeControl);
    setBlackTime(timeControl);
    setClockRunning(false);
        playMoveSound();
        if (move.captured) playCaptureSound();
        setOptionSquares({});
        setMoveFrom(null);
        
        if (mode === 'multiplayer' && roomId) {
          update(ref(db, `games/chess/${roomId}`), { fen: game.fen() });
        }
      }
    } catch (e) {
      setMoveFrom(null);
      setOptionSquares({});
    }
  };

  const getMoveOptions = (square: string) => {
    const movesObj = game.moves({ square: square as any, verbose: true }) as Move[];
    if (movesObj.length === 0) {
      setOptionSquares({});
      return false;
    }
    const newSquares: any = {};
    movesObj.forEach((m) => {
      newSquares[m.to] = {
        background: game.get(m.to as any) && game.get(m.to as any)?.color !== game.get(square as any)?.color
          ? 'radial-gradient(circle, rgba(0,0,0,.3) 85%, transparent 85%)'
          : 'radial-gradient(circle, rgba(0,0,0,.3) 25%, transparent 25%)',
        borderRadius: '50%'
      };
    });
    newSquares[square] = { background: 'rgba(255, 255, 0, 0.4)' };
    setOptionSquares(newSquares);
    return true;
  };

  const updateStatus = (g: Chess) => {
    if (g.isCheckmate()) setStatus('Şah və Mat! Oyun Bitdi.');
    else if (g.isDraw()) setStatus('Heç-heçə!');
    else if (g.isStalemate()) setStatus('Pat! Heç-heçə.');
    else if (g.isCheck()) setStatus('ŞAH!');
    else setStatus(`Gediş sırası: ${g.turn() === 'w' ? 'Ağlar' : 'Qaralar'}`);
  };

  
  const offerDraw = () => {
    if (mode === 'multiplayer' && roomId && !isSpectator) {
      update(ref(db, `games/chess/${roomId}`), { drawOffer: myColor });
      toast.success('Heç-heçə təklifi göndərildi!');
    } else {
      toast.error('Bota qarşı heç-heçə təklif edə bilməzsiniz (Təslim olun)');
    }
  };

  const acceptDraw = () => {
    if (roomId) update(ref(db, `games/chess/${roomId}`), { state: 'draw', drawOffer: null });
  };

  const rejectDraw = () => {
    if (roomId) {
      update(ref(db, `games/chess/${roomId}`), { drawOffer: null });
      setIncomingDraw(false);
      toast.success('Təklif rədd edildi.');
    }
  };
  
  
  const writeActivityFeed = async (winnerUid: string, loserUid: string) => {
    try {
      const [wSnap, lSnap] = await Promise.all([
        get(ref(db, `users/${winnerUid}`)),
        get(ref(db, `users/${loserUid}`))
      ]);
      const winner = wSnap.val();
      const loser = lSnap.val();
      await push(ref(db, 'activity_feed'), {
        winnerName: winner?.displayName || 'Oyunçu',
        loserName: loser?.displayName || 'Oyunçu',
        winnerAvatar: winner?.avatar || '😎',
        loserAvatar: loser?.avatar || '😎',
        game: 'chess',
        eloChange: 25,
        timestamp: Date.now()
      });
    } catch(e) {}
  };
  
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };
  
  const startClock = () => {
    setWhiteTime(timeControl);
    setBlackTime(timeControl);
    setClockRunning(true);
  };

  const resetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setMoves([]);
    setStatus('Oyun Başladı');
  };


  let gameResult: 'win' | 'loss' | 'draw' | null = null;
  if (game.isGameOver() || (typeof engineWinner === 'string' && engineWinner.startsWith('resigned_'))) {
    if (game.isDraw() || game.isStalemate() || game.isThreefoldRepetition() || game.isInsufficientMaterial()) {
      gameResult = 'draw';
    } else {
      let finalWinner = '';
      if (typeof engineWinner === 'string' && engineWinner.startsWith('resigned_')) {
        finalWinner = engineWinner === 'resigned_w' ? 'b' : 'w';
      } else {
        finalWinner = game.turn() === 'w' ? 'b' : 'w';
      }
      
      if (mode === 'multiplayer') {
        gameResult = isSpectator ? null : (finalWinner === myColor ? 'win' : 'loss');
      } else {
        gameResult = finalWinner === 'w' ? 'win' : 'loss';
      }
    }
  }
  
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8 relative z-10 pt-24">
      
      <AnimatePresence>
        {incomingDraw && (
          <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }} className="absolute top-24 left-1/2 transform -translate-x-1/2 z-50 bg-blue-900 border border-blue-500 p-4 rounded-2xl shadow-2xl flex flex-col items-center gap-3 w-80">
            <div className="text-white font-bold text-center">Rəqib heç-heçə təklif edir!</div>
            <div className="flex gap-2 w-full">
              <button onClick={acceptDraw} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl text-sm font-black">Qəbul Et</button>
              <button onClick={rejectDraw} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-xl text-sm font-black">Rədd Et</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
  
      <EndGameModal isOpen={gameResult !== null} result={gameResult} onRematch={() => { setMode("bot"); resetGame(); }} />
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-zinc-400 hover:text-white transition">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-bold uppercase tracking-widest">Geri Qayıt</span>
      </Link>
      
      {/* Board Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        
        {/* Matchmaking Overlay */}
        <AnimatePresence>
          {isSearching && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg"
            >
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
              <div className="text-xl font-bold text-white">Rəqib axtarılır...</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mode Selector */}
        <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800 mb-6">
          <button 
            onClick={() => { setMode('bot'); resetGame(); }}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${mode === 'bot' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            <Cpu className="w-4 h-4" /> Stockfish AI (Bot)
          </button>
          <button 
            onClick={() => { setMode('multiplayer'); resetGame(); }}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${mode === 'multiplayer' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            <Users className="w-4 h-4" /> Canlı (Multiplayer)</button>
              
              <button onClick={() => {
                const link = `${window.location.origin}/chess?watch=${roomId}`;
                navigator.clipboard.writeText(link).then(() => toast.success('İzləyici linki kopyalandı!'));
              }} className="w-full py-2 mb-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-white transition flex items-center justify-center gap-2">
                <Eye className="w-4 h-4" /> İzləyici Linki
              </button>
  
              <button onClick={createPrivateRoom} className="w-full py-3 mb-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-bold text-white transition flex items-center justify-center gap-2">
                <LinkIcon className="w-4 h-4" /> Dostla Oyna (Link)
              </button>
        </div>

        {/* Opponent Info */}
        <div className="w-full max-w-full sm:max-w-[65vh] flex items-center justify-between mb-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
              {mode === 'bot' ? '🤖' : '🔥'}
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
          {mode === 'bot' && (
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
              Zəka (Səviyyə):
              <input 
                type="range" min="1" max="20" 
                value={difficulty} 
                onChange={(e) => setDifficulty(parseInt(e.target.value))}
                className="w-24 accent-purple-500"
              />
              <span className="w-4 text-white">{difficulty}</span>
            </div>
          )}
        </div>

        {/* Board */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-[100%] sm:max-w-[65vh] aspect-square rounded-lg overflow-hidden shadow-[0_0_50px_rgba(139,92,246,0.15)] ring-4 ring-zinc-800/50"
        >
          {/* @ts-ignore */}
          <Chessboard {...({} as any)} position={game.fen()} onPieceDrop={onDrop} onSquareClick={onSquareClick} boardOrientation={myColor === 'w' ? 'white' : 'black'} customDarkSquareStyle={{ backgroundColor: themes[theme]?.dark || '#27272a' }} customLightSquareStyle={{ backgroundColor: themes[theme]?.light || '#e4e4e7' }} customSquareStyles={optionSquares} animationDuration={200} />
        </motion.div>

        {/* My Info */}
        <div className="w-full max-w-full sm:max-w-[65vh] flex items-center justify-between mt-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/50 text-purple-400">
              😎
            </div>
            <div>
              <div className="font-bold text-white flex items-center gap-2">
                {whitePlayer.name} <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400">{whitePlayer.elo}</span>
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
        <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-md">
          
          {/* Chess Clock */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className={`relative p-4 rounded-2xl border-2 text-center transition-all ${game.turn() === 'b' && clockRunning ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'border-zinc-800 bg-zinc-950'}`}>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                {mode === 'multiplayer' ? (myColor === 'b' ? 'Siz' : 'Rəqib') : 'Bot'}
              </div>
              <div className={`text-3xl font-mono font-black ${blackTime < 30 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                {formatTime(blackTime)}
              </div>
              <div className="text-xl mt-1">⚫</div>
            </div>
            <div className={`relative p-4 rounded-2xl border-2 text-center transition-all ${game.turn() === 'w' && clockRunning ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'border-zinc-800 bg-zinc-950'}`}>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                {mode === 'multiplayer' ? (myColor === 'w' ? 'Siz' : 'Rəqib') : 'Siz'}
              </div>
              <div className={`text-3xl font-mono font-black ${whiteTime < 30 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                {formatTime(whiteTime)}
              </div>
              <div className="text-xl mt-1">⚪</div>
            </div>
          </div>

          {/* Time Control Selector */}
          {!clockRunning && (
            <div className="mb-4">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Vaxt Nəzarəti</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[{label:'1 dəq', secs:60},{label:'3 dəq', secs:180},{label:'5 dəq', secs:300},{label:'10 dəq', secs:600}].map(tc => (
                  <button key={tc.secs} onClick={() => { setTimeControl(tc.secs); setWhiteTime(tc.secs); setBlackTime(tc.secs); }}
                    className={`py-1.5 rounded-lg text-xs font-black transition-all ${timeControl === tc.secs ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}>
                    {tc.label}
                  </button>
                ))}
              </div>
            </div>
          )}
  
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Oyun Statusu</h2>
          <div className="text-xl font-bold text-white mb-4">{status}</div>
          
          <div className="flex flex-col gap-2">
            {mode === 'multiplayer' && !roomId && !isSearching && (
              <button onClick={findMatch} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold text-white transition flex items-center justify-center gap-2 mb-2">
                <Users className="w-4 h-4" /> Rəqib Axtar
              </button>
            )}
            
            <div className="flex gap-2">
              <button onClick={resetGame} className="flex-1 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-sm font-bold text-red-400 transition flex items-center justify-center gap-2">
                <Flag className="w-4 h-4" /> Təslim ol
              </button>
              <button onClick={offerDraw} disabled={drawOfferedByMe} className={`flex-1 py-2 rounded-xl text-sm font-bold text-white transition flex items-center justify-center gap-2 ${drawOfferedByMe ? 'bg-zinc-900 text-zinc-600' : 'bg-zinc-800 hover:bg-zinc-700'}`}>
                  <Shield className="w-4 h-4" /> {drawOfferedByMe ? 'Gözlənilir...' : 'Heç-heçə'}
                </button>
            </div>
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















