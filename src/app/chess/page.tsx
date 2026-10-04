'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess, Move } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Shield, Flag, Swords, ArrowLeft, Cpu, Users, Loader2, Link as LinkIcon, Eye, RotateCcw } from 'lucide-react';
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

/* ─── Board Themes ─────────────────────────────────── */
const THEMES = {
  classic: { light: '#f0d9b5', dark: '#b58863', label: 'Klassik' },
  wood:    { light: '#e6c8a0', dark: '#8b5a2b', label: 'Ağac'    },
  ocean:   { light: '#d1e6e6', dark: '#4682b4', label: 'Okean'   },
  neon:    { light: '#2c003e', dark: '#ff007f', label: 'Neon'    },
} as const;
type ThemeKey = keyof typeof THEMES;

/* ─── Time Controls ────────────────────────────────── */
const TIME_CONTROLS = [
  { label: '1+0',  secs: 60,  name: 'Bullet' },
  { label: '3+0',  secs: 180, name: 'Blitz'  },
  { label: '5+0',  secs: 300, name: 'Rapid'  },
  { label: '10+0', secs: 600, name: 'Klassik'},
];

/* ─── Elo & Stats Update ───────────────────────────── */
async function updateElo(winnerId: string, loserId: string) {
  try {
    const [ws, ls] = await Promise.all([
      get(ref(db, `users/${winnerId}`)),
      get(ref(db, `users/${loserId}`)),
    ]);
    const w = ws.val() || {};
    const l = ls.val() || {};
    const wElo = (w.elo || 1200) + 25;
    const lElo = Math.max(0, (l.elo || 1200) - 25);
    const wTotal = (w.wins || 0) + 1 + (w.losses || 0);
    const lTotal = (l.wins || 0) + (l.losses || 0) + 1;

    await Promise.all([
      update(ref(db, `users/${winnerId}`), { elo: wElo, wins: (w.wins || 0) + 1, winRate: Math.round(((w.wins || 0) + 1) / wTotal * 100) + '%' }),
      update(ref(db, `users/${loserId}`),  { elo: lElo, losses: (l.losses || 0) + 1, winRate: Math.round((l.wins || 0) / lTotal * 100) + '%' }),
      update(ref(db, `users/${winnerId}/gameStats/chess`), { wins: (w.gameStats?.chess?.wins || 0) + 1 }),
      update(ref(db, `users/${loserId}/gameStats/chess`),  { losses: (l.gameStats?.chess?.losses || 0) + 1 }),
      push(ref(db, 'activity_feed'), {
        winnerName: w.displayName || 'Oyunçu',
        loserName: l.displayName || 'Oyunçu',
        winnerAvatar: w.avatar || '😎',
        loserAvatar: l.avatar || '😎',
        game: 'chess',
        eloChange: 25,
        timestamp: Date.now()
      }),
      push(ref(db, `match_history/${winnerId}`), { game: 'chess', result: 'win',  eloChange: +25, timestamp: Date.now(), opponentName: l.displayName || 'Oyunçu' }),
      push(ref(db, `match_history/${loserId}`),  { game: 'chess', result: 'loss', eloChange: -25, timestamp: Date.now(), opponentName: w.displayName || 'Oyunçu' }),
    ]);

    await Promise.all([
      updateStreakAndQuests(winnerId, true),
      updateStreakAndQuests(loserId, false),
    ]);
  } catch (err) {
    console.error('Error updating elo:', err);
  }
}

/* ═══════════════════════════════════════════════════ */
export default function ChessArena() {
  const [mounted, setMounted] = useState(false);
  const [game, setGame] = useState(() => new Chess());
  const [moves, setMoves] = useState<Move[]>([]);
  const [status, setStatus] = useState('Oyun başlayır...');
  const [engineWinner, setEngineWinner] = useState<string | null>(null);
  const [eloUpdated, setEloUpdated] = useState(false);

  /* ── Board Highlights ── */
  const [optionSquares, setOptionSquares] = useState<Record<string, Record<string, string | number>>>({});
  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  /* ── UI Settings ── */
  const [theme, setTheme] = useState<ThemeKey>('classic');
  const [mode, setMode] = useState<'bot' | 'multiplayer'>('bot');
  const [difficulty, setDifficulty] = useState(10);

  /* ── Clock ── */
  const [timeControl, setTimeControl] = useState(300);
  const [whiteTime, setWhiteTime] = useState(300);
  const [blackTime, setBlackTime] = useState(300);
  const [clockRunning, setClockRunning] = useState(false);

  /* ── Multiplayer ── */
  const [user, setUser] = useState<User | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [myColor, setMyColor] = useState<'w' | 'b'>('w');
  const [isSpectator, setIsSpectator] = useState(false);
  const [opponentName, setOpponentName] = useState<string>('');
  const [opponentElo, setOpponentElo] = useState<number>(1200);

  /* ── Draw ── */
  const [drawOfferedByMe, setDrawOfferedByMe] = useState(false);
  const [incomingDraw, setIncomingDraw] = useState(false);

  const engine = useRef<Worker | null>(null);
  const movesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  /* ── Auth ── */
  useEffect(() => {
    return onAuthStateChanged(auth, u => setUser(u));
  }, []);

  /* ── Read URL Query Params for Direct Room Link ── */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    const watch = params.get('watch');
    if (room) {
      setRoomId(room);
      setMode('multiplayer');
      setMyColor('b');
    }
    if (watch) {
      setRoomId(watch);
      setMode('multiplayer');
      setIsSpectator(true);
    }
  }, []);

  /* ── Helper: Bot Move ── */
  const makeBotMove = useCallback((currentGame: Chess) => {
    if (currentGame.isGameOver()) return;

    let moveHandled = false;

    // Safety Fallback: If Stockfish does not respond within 1.1s, execute legal move
    const fallbackTimer = setTimeout(() => {
      if (moveHandled) return;
      moveHandled = true;
      const legalMoves = currentGame.moves({ verbose: true });
      if (legalMoves.length === 0) return;
      const captures = legalMoves.filter(m => m.captured);
      const chosen = captures.length > 0
        ? captures[Math.floor(Math.random() * captures.length)]
        : legalMoves[Math.floor(Math.random() * legalMoves.length)];

      const next = new Chess(currentGame.fen());
      const res = next.move(chosen);
      if (res) {
        if (res.captured) playCaptureSound();
        else playMoveSound();
        setLastMove({ from: chosen.from, to: chosen.to });
        setGame(next);
        setMoves(next.history({ verbose: true }) as Move[]);
        updateStatus(next);
      }
    }, 1100);

    if (engine.current) {
      engine.current.onmessage = (e: MessageEvent) => {
        const line = String(e.data);
        if (line.startsWith('bestmove')) {
          const match = line.match(/^bestmove ([a-h][1-8])([a-h][1-8])([qrbn])?/);
          if (match && !moveHandled) {
            moveHandled = true;
            clearTimeout(fallbackTimer);
            const from = match[1];
            const to = match[2];
            const promotion = match[3] || (to[1] === '1' ? 'q' : undefined);

            setGame(prev => {
              const next = new Chess(prev.fen());
              const res = next.move({ from, to, promotion });
              if (res) {
                if (res.captured) playCaptureSound();
                else playMoveSound();
                setLastMove({ from, to });
                setMoves(next.history({ verbose: true }) as Move[]);
                updateStatus(next);
              }
              return next;
            });
          }
        }
      };

      engine.current.postMessage(`position fen ${currentGame.fen()}`);
      engine.current.postMessage(`setoption name Skill Level value ${difficulty}`);
      engine.current.postMessage(`go depth ${Math.min(15, Math.max(3, difficulty))}`);
    }
  }, [difficulty]);

  /* ── Stockfish Worker Setup ── */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      engine.current = new Worker('/stockfish.js');
      engine.current.postMessage('uci');
      engine.current.postMessage('isready');
    } catch (e) {
      console.warn('Stockfish worker could not be started, fallback AI enabled.');
    }
    return () => {
      engine.current?.terminate();
    };
  }, []);

  /* ── Multiplayer Firebase Sync ── */
  useEffect(() => {
    if (mode !== 'multiplayer' || !roomId) return;
    const gameRef = ref(db, `games/chess/${roomId}`);
    const unsub = onValue(gameRef, snap => {
      const data = snap.val();
      if (!data) return;

      if (data.fen && data.fen !== game.fen()) {
        const synced = new Chess(data.fen);
        setGame(synced);
        setMoves(synced.history({ verbose: true }) as Move[]);
        updateStatus(synced);
      }

      if (user && data.white && data.black) {
        if (!isSpectator) setMyColor(data.white === user.uid ? 'w' : 'b');
        const oppUid = data.white === user.uid ? data.black : data.white;
        if (oppUid) {
          get(ref(db, `users/${oppUid}`)).then(s => {
            const d = s.val();
            if (d) {
              setOpponentName(d.displayName || 'Oyunçu');
              setOpponentElo(d.elo || 1200);
            }
          });
        }
      }

      if (data.drawOffer && data.drawOffer !== myColor && !isSpectator) {
        setIncomingDraw(true);
      } else if (!data.drawOffer) {
        setIncomingDraw(false);
        setDrawOfferedByMe(false);
      }

      if (data.state === 'draw')       { setEngineWinner('draw'); setClockRunning(false); }
      if (data.state === 'resigned_w') { setEngineWinner('resigned_w'); setClockRunning(false); }
      if (data.state === 'resigned_b') { setEngineWinner('resigned_b'); setClockRunning(false); }
      if (data.state === 'timeout_w')  { setEngineWinner('timeout_w'); setClockRunning(false); }
      if (data.state === 'timeout_b')  { setEngineWinner('timeout_b'); setClockRunning(false); }
    });
    return () => unsub();
  }, [mode, roomId, user, myColor, isSpectator, game]);

  /* ── Elo Update on Game Over ── */
  useEffect(() => {
    if (mode !== 'multiplayer' || !user || eloUpdated || !roomId) return;
    if (!game.isGameOver() && engineWinner === null) return;

    setEloUpdated(true);
    setClockRunning(false);

    get(ref(db, `games/chess/${roomId}`)).then(snap => {
      const d = snap.val();
      if (!d) return;

      let winnerId: string | null = null;
      let loserId: string | null = null;

      if (game.isCheckmate()) {
        const winColor = game.turn() === 'w' ? 'b' : 'w';
        winnerId = winColor === 'w' ? d.white : d.black;
        loserId  = winColor === 'w' ? d.black : d.white;
      } else if (engineWinner === 'resigned_w' || engineWinner === 'timeout_w') {
        winnerId = d.black; loserId = d.white;
      } else if (engineWinner === 'resigned_b' || engineWinner === 'timeout_b') {
        winnerId = d.white; loserId = d.black;
      }

      if (winnerId && loserId) {
        updateElo(winnerId, loserId).then(() => {
          if (winnerId === user.uid) {
            confetti({ particleCount: 160, spread: 80, origin: { y: 0.6 } });
            toast.success('+25 ELO Qazandınız! 🏆', { duration: 5000 });
          } else {
            toast.error('-25 ELO İtirdiniz 💀', { duration: 5000 });
          }
        });
      }
    });
  }, [game, engineWinner, mode, user, eloUpdated, roomId]);

  /* ── Clock Countdown ── */
  useEffect(() => {
    if (!clockRunning || game.isGameOver() || engineWinner) return;
    const interval = setInterval(() => {
      const turn = game.turn();
      if (turn === 'w') {
        setWhiteTime(t => {
          if (t <= 1) {
            clearInterval(interval);
            setClockRunning(false);
            if (mode === 'multiplayer' && roomId) update(ref(db, `games/chess/${roomId}`), { state: 'timeout_w' });
            else setEngineWinner('timeout_w');
            return 0;
          }
          return t - 1;
        });
      } else {
        setBlackTime(t => {
          if (t <= 1) {
            clearInterval(interval);
            setClockRunning(false);
            if (mode === 'multiplayer' && roomId) update(ref(db, `games/chess/${roomId}`), { state: 'timeout_b' });
            else setEngineWinner('timeout_b');
            return 0;
          }
          return t - 1;
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [clockRunning, game, engineWinner, mode, roomId]);

  /* ── Auto-scroll Move History ── */
  useEffect(() => {
    movesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [moves]);

  /* ── Status Text ── */
  const updateStatus = (g: Chess) => {
    if (g.isCheckmate()) setStatus('♚ Şah və Mat! Oyun bitdi.');
    else if (g.isDraw()) setStatus('½-½ Heç-heçə');
    else if (g.isStalemate()) setStatus('Pat! Heç-heçə.');
    else if (g.isCheck()) setStatus('⚠️ ŞAH!');
    else setStatus(`Gediş: ${g.turn() === 'w' ? '⚪ Ağlar' : '⚫ Qaralar'}`);
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  /* ── Move Highlight Calculation ── */
  const getMoveOptions = (square: string): boolean => {
    const mvs = game.moves({ square: square as any, verbose: true }) as Move[];
    if (!mvs || mvs.length === 0) {
      setOptionSquares({});
      return false;
    }
    const sq: Record<string, Record<string, string | number>> = {};
    mvs.forEach(m => {
      const hasCapture = game.get(m.to as any);
      sq[m.to] = {
        background: hasCapture && hasCapture.color !== game.get(square as any)?.color
          ? 'radial-gradient(circle, rgba(239, 68, 68, 0.75) 65%, transparent 65%)'
          : 'radial-gradient(circle, rgba(59, 130, 246, 0.7) 25%, transparent 25%)',
        borderRadius: '50%',
      };
    });
    sq[square] = { background: 'rgba(250, 204, 21, 0.4)' };
    setOptionSquares(sq);
    return true;
  };

  /* ── Apply Move (Core) ── */
  const applyMove = useCallback((from: string, to: string, customPromotion?: string): boolean => {
    try {
      const next = new Chess(game.fen());
      const movingPiece = next.get(from as any);
      let promo = customPromotion;
      if (movingPiece?.type === 'p' && ((movingPiece.color === 'w' && to[1] === '8') || (movingPiece.color === 'b' && to[1] === '1'))) {
        promo = promo || 'q';
      }

      const res = next.move({ from, to, promotion: promo });
      if (!res) return false;

      if (res.captured) playCaptureSound();
      else playMoveSound();

      setGame(next);
      setMoves(next.history({ verbose: true }) as Move[]);
      setLastMove({ from, to });
      setOptionSquares({});
      setMoveFrom(null);
      updateStatus(next);

      if (!clockRunning && moves.length === 0) setClockRunning(true);

      if (mode === 'bot' && !next.isGameOver()) {
        makeBotMove(next);
      } else if (mode === 'multiplayer' && roomId) {
        update(ref(db, `games/chess/${roomId}`), { fen: next.fen() });
      }

      return true;
    } catch (e) {
      return false;
    }
  }, [game, clockRunning, moves.length, mode, roomId, makeBotMove]);

  /* ── Drag & Drop Handler ── */
  const onPieceDrop = (sourceSquare: string, targetSquare: string): boolean => {
    if (isSpectator || game.isGameOver() || engineWinner) return false;
    if (mode === 'multiplayer' && game.turn() !== myColor) return false;
    if (mode === 'bot' && game.turn() === 'b') return false;

    return applyMove(sourceSquare, targetSquare);
  };

  /* ── Click-To-Move Handler ── */
  const onSquareClick = (square: string) => {
    if (isSpectator || game.isGameOver() || engineWinner) return;
    if (mode === 'multiplayer' && game.turn() !== myColor) return;
    if (mode === 'bot' && game.turn() === 'b') return;

    if (!moveFrom) {
      const piece = game.get(square as any);
      if (piece && piece.color === game.turn()) {
        const has = getMoveOptions(square);
        if (has) setMoveFrom(square);
      }
      return;
    }

    if (moveFrom === square) {
      setMoveFrom(null);
      setOptionSquares({});
      return;
    }

    const legal = (game.moves({ square: moveFrom as any, verbose: true }) as Move[]).some(m => m.to === square);

    if (legal) {
      applyMove(moveFrom, square);
    } else {
      const piece = game.get(square as any);
      if (piece && piece.color === game.turn()) {
        const has = getMoveOptions(square);
        setMoveFrom(has ? square : null);
      } else {
        setMoveFrom(null);
        setOptionSquares({});
      }
    }
  };

  /* ── Matchmaking ── */
  const findMatch = async () => {
    if (!user) { toast.error('Giriş edin!'); return; }
    setIsSearching(true);
    setStatus('Rəqib axtarılır...');

    const waitRef = ref(db, 'matchmaking/chess/waiting');
    const snap = await get(waitRef);

    if (snap.exists() && snap.val() !== user.uid) {
      const oppId = snap.val();
      await remove(waitRef);
      const roomRef = push(ref(db, 'games/chess'));
      await set(roomRef, { white: oppId, black: user.uid, fen: new Chess().fen(), status: 'playing', timestamp: serverTimestamp() });
      setRoomId(roomRef.key!);
      setMyColor('b');
      resetGame(false);
      toast.success('Oyun başladı! Uğurlar 🎲');
      setIsSearching(false);
    } else {
      await set(waitRef, user.uid);
      onDisconnect(waitRef).remove();
      const matchRef = ref(db, `matchmaking/chess/found/${user.uid}`);
      onValue(matchRef, snapM => {
        const found = snapM.val();
        if (found?.roomId) {
          setRoomId(found.roomId);
          setMyColor('w');
          resetGame(false);
          toast.success('Oyun başladı! Uğurlar 🎲');
          setIsSearching(false);
          remove(matchRef);
          remove(waitRef);
        }
      });
    }
  };

  const createPrivateRoom = async () => {
    if (!user) { toast.error('Giriş edin!'); return; }
    const roomRef = push(ref(db, 'games/chess'));
    await set(roomRef, { white: user.uid, fen: new Chess().fen(), state: 'waiting_for_friend' });
    setRoomId(roomRef.key!);
    setMyColor('w');
    setMode('multiplayer');
    const link = `${window.location.origin}/chess?room=${roomRef.key}`;
    await navigator.clipboard.writeText(link);
    toast.success('Link kopyalandı! Dostunuza göndərin 🔗', { duration: 6000 });
  };

  const copySpectatorLink = () => {
    if (!roomId) { toast.error('Əvvəlcə otaq yaradın'); return; }
    const link = `${window.location.origin}/chess?watch=${roomId}`;
    navigator.clipboard.writeText(link);
    toast.success('İzləyici linki kopyalandı 👁');
  };

  const resign = () => {
    if (isSpectator) return;
    if (mode === 'multiplayer' && roomId) {
      update(ref(db, `games/chess/${roomId}`), { state: myColor === 'w' ? 'resigned_w' : 'resigned_b' });
    } else {
      setEngineWinner(myColor === 'w' ? 'resigned_w' : 'resigned_b');
    }
    setClockRunning(false);
  };

  const offerDraw = () => {
    if (isSpectator) return;
    if (mode === 'multiplayer' && roomId) {
      update(ref(db, `games/chess/${roomId}`), { drawOffer: myColor });
      setDrawOfferedByMe(true);
      toast.success('Heç-heçə təklifi göndərildi');
    } else {
      toast.error('Bota qarşı heç-heçə olmur');
    }
  };

  const acceptDraw = () => {
    if (roomId) update(ref(db, `games/chess/${roomId}`), { state: 'draw', drawOffer: null });
  };

  const rejectDraw = () => {
    if (roomId) update(ref(db, `games/chess/${roomId}`), { drawOffer: null });
    setIncomingDraw(false);
    toast('Heç-heçə rədd edildi', { icon: '✋' });
  };

  const resetGame = (full = true) => {
    setGame(new Chess());
    setMoves([]);
    setOptionSquares({});
    setMoveFrom(null);
    setLastMove(null);
    setEngineWinner(null);
    setEloUpdated(false);
    setClockRunning(false);
    setWhiteTime(timeControl);
    setBlackTime(timeControl);
    setDrawOfferedByMe(false);
    setIncomingDraw(false);
    if (full) { setRoomId(null); setMode('bot'); }
    updateStatus(new Chess());
  };

  /* ── Result Calculation for EndGameModal ── */
  let gameResult: 'win' | 'loss' | 'draw' | null = null;
  const isOver = game.isGameOver() || engineWinner !== null;
  if (isOver && !isSpectator) {
    if (game.isDraw() || game.isStalemate() || game.isInsufficientMaterial() || engineWinner === 'draw') {
      gameResult = 'draw';
    } else {
      let winnerColor: 'w' | 'b' | null = null;
      if (game.isCheckmate()) {
        winnerColor = game.turn() === 'w' ? 'b' : 'w';
      } else if (engineWinner === 'resigned_w' || engineWinner === 'timeout_w') {
        winnerColor = 'b';
      } else if (engineWinner === 'resigned_b' || engineWinner === 'timeout_b') {
        winnerColor = 'w';
      }
      if (winnerColor) {
        gameResult = winnerColor === myColor ? 'win' : 'loss';
      }
    }
  }

  /* ── Square Styles ── */
  const lastMoveSquares: Record<string, Record<string, string | number>> = lastMove ? {
    [lastMove.from]: { background: 'rgba(250, 204, 21, 0.25)' },
    [lastMove.to]:   { background: 'rgba(250, 204, 21, 0.35)' },
  } : {};

  const combinedSquares: any = { ...lastMoveSquares, ...optionSquares };

  return (
    <div className="min-h-screen bg-zinc-950 pt-20 pb-8 px-4">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 relative">

        <EndGameModal
          isOpen={gameResult !== null}
          result={gameResult}
          onRematch={() => { resetGame(); }}
        />

        {/* ── Draw Offer Notification ── */}
        <AnimatePresence>
          {incomingDraw && (
            <motion.div
              initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -60, opacity: 0 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-blue-950/90 border border-blue-500/60 backdrop-blur-xl p-5 rounded-2xl shadow-2xl flex flex-col items-center gap-3 w-72"
            >
              <Shield className="w-6 h-6 text-blue-400" />
              <div className="text-white font-bold text-center text-sm">Rəqib heç-heçə təklif edir!</div>
              <div className="flex gap-2 w-full">
                <button onClick={acceptDraw} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl text-sm font-black transition">Qəbul Et</button>
                <button onClick={rejectDraw} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-xl text-sm font-black transition">Rədd Et</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════ BOARD COLUMN ═══════ */}
        <div className="flex-1 flex flex-col items-center gap-4 relative">

          {/* Top Bar */}
          <div className="w-full flex items-center justify-between mb-2">
            <Link href="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition text-sm font-bold">
              <ArrowLeft className="w-4 h-4" /> Ana Səhifə
            </Link>
            {/* Board Themes */}
            <div className="flex gap-1.5 items-center">
              <span className="text-xs text-zinc-500 font-bold hidden sm:inline mr-1">Lövhə:</span>
              {(Object.keys(THEMES) as ThemeKey[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  title={THEMES[t].label}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${theme === t ? 'border-white scale-110 shadow-lg' : 'border-zinc-700 hover:border-zinc-500'}`}
                  style={{ background: `linear-gradient(135deg, ${THEMES[t].light} 50%, ${THEMES[t].dark} 50%)` }}
                />
              ))}
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-zinc-800 gap-1 self-start">
            <button
              onClick={() => { setMode('bot'); resetGame(); }}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${mode === 'bot' ? 'bg-purple-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}
            >
              <Cpu className="w-4 h-4" /> Bot (AI)
            </button>
            <button
              onClick={() => { setMode('multiplayer'); resetGame(false); }}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${mode === 'multiplayer' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}
            >
              <Users className="w-4 h-4" /> Canlı (Multiplayer)
            </button>
          </div>

          {/* Opponent Card */}
          <div className="w-full max-w-[min(100%,65vh)] flex items-center justify-between bg-zinc-900/70 border border-zinc-800 p-3.5 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xl border border-zinc-700">
                {mode === 'bot' ? '🤖' : '⚔️'}
              </div>
              <div>
                <div className="font-bold text-white text-sm">
                  {mode === 'bot' ? 'Stockfish AI (Bot)' : (opponentName || 'Rəqib gözlənilir...')}
                </div>
                <div className="text-xs text-zinc-500">{mode === 'bot' ? `Səviyyə ${difficulty}` : `${opponentElo} ELO`}</div>
              </div>
            </div>
            {/* Black Clock */}
            <div className={`font-mono font-black text-2xl px-4 py-1.5 rounded-xl border transition-all ${
              blackTime < 30 ? 'text-red-400 border-red-500/50 bg-red-500/10 animate-pulse' :
              game.turn() === 'b' && clockRunning ? 'text-white border-purple-500/50 bg-purple-500/10' : 'text-zinc-500 border-zinc-800'
            }`}>
              {formatTime(blackTime)}
            </div>
          </div>

          {/* Chessboard Container */}
          <div className="relative w-full max-w-[min(100%,65vh)]">
            <AnimatePresence>
              {isSearching && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-md rounded-2xl overflow-hidden"
                >
                  <div className="relative w-32 h-32 mb-6">
                    <div className="absolute inset-0 rounded-full border-4 border-cyan-500/10 border-t-cyan-500 border-l-cyan-500 animate-[spin_2s_linear_infinite]" />
                    <div className="absolute inset-2 rounded-full border-2 border-purple-500/20 border-b-purple-500 border-r-purple-500 animate-[spin_3s_linear_infinite_reverse]" />
                    <div className="absolute inset-4 rounded-full overflow-hidden">
                      <div className="w-full h-full" style={{ background: 'conic-gradient(from 0deg, transparent 70%, rgba(6,182,212,0.8) 100%)', animation: 'spin 1.5s linear infinite' }} />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-4 h-4 bg-cyan-400 rounded-full shadow-[0_0_15px_#22d3ee] animate-ping" />
                    </div>
                  </div>
                  <div className="text-xl font-black text-cyan-400 font-mono tracking-wider mb-2">RADAR AKTİV...</div>
                  <div className="text-xs text-zinc-400 font-mono">Qlobal serverdə rəqib axtarılır</div>
                  <button onClick={() => { setIsSearching(false); setStatus('Oyun başlayır...'); }} className="mt-6 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-xs font-mono font-bold transition">
                    PROTOKOLU DAYANDIR
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(139,92,246,0.15)] ring-2 ring-zinc-800/80 bg-zinc-900">
              {mounted ? (
                <Chessboard
                  position={game.fen()}
                  boardOrientation={myColor === 'w' ? 'white' : 'black'}
                  customDarkSquareStyle={{ backgroundColor: THEMES[theme].dark }}
                  customLightSquareStyle={{ backgroundColor: THEMES[theme].light }}
                  customSquareStyles={combinedSquares}
                  animationDuration={150}
                  onPieceDrop={onPieceDrop}
                  onSquareClick={onSquareClick}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* My Card */}
          <div className="w-full max-w-[min(100%,65vh)] flex items-center justify-between bg-zinc-900/70 border border-zinc-800 p-3.5 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-xl border border-purple-500/40">
                {user ? '😎' : '👤'}
              </div>
              <div>
                <div className="font-bold text-white text-sm">{user?.displayName || 'Siz'}</div>
                <div className="text-xs text-zinc-500">{myColor === 'w' ? '⚪ Ağlar' : '⚫ Qaralar'}</div>
              </div>
            </div>
            {/* White Clock */}
            <div className={`font-mono font-black text-2xl px-4 py-1.5 rounded-xl border transition-all ${
              whiteTime < 30 ? 'text-red-400 border-red-500/50 bg-red-500/10 animate-pulse' :
              game.turn() === 'w' && clockRunning ? 'text-white border-blue-500/50 bg-blue-500/10' : 'text-zinc-500 border-zinc-800'
            }`}>
              {formatTime(whiteTime)}
            </div>
          </div>
        </div>

        {/* ═══════ SIDEBAR CONTROLS ═══════ */}
        <div className="w-full lg:w-72 flex flex-col gap-4">

          {/* Status & Options Card */}
          <div className="tdv-card p-5 flex flex-col gap-4">
            {/* Time Control */}
            <div>
              <div className="tdv-section-label mb-2">Vaxt Nəzarəti</div>
              <div className="grid grid-cols-4 gap-1.5">
                {TIME_CONTROLS.map(tc => (
                  <button
                    key={tc.secs}
                    onClick={() => {
                      if (!clockRunning) {
                        setTimeControl(tc.secs);
                        setWhiteTime(tc.secs);
                        setBlackTime(tc.secs);
                      }
                    }}
                    className={`py-1.5 rounded-lg text-[11px] font-black transition-all ${timeControl === tc.secs ? 'bg-blue-600 text-white shadow-md' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
                  >
                    {tc.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <div className="tdv-section-label mb-1">Oyun Statusu</div>
              <div className={`text-base font-black ${status.includes('ŞAH') ? 'text-red-400' : 'text-white'}`}>
                {status}
              </div>
            </div>

            {/* Difficulty slider */}
            {mode === 'bot' && (
              <div>
                <div className="tdv-section-label mb-2">Bot Səviyyəsi: {difficulty}</div>
                <input
                  type="range" min="1" max="20" value={difficulty}
                  onChange={e => setDifficulty(+e.target.value)}
                  className="w-full accent-purple-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                  <span>Asan</span>
                  <span>Usta</span>
                </div>
              </div>
            )}

            {/* Multiplayer Actions */}
            {mode === 'multiplayer' && !roomId && !isSearching && (
              <div className="flex flex-col gap-2">
                <button onClick={findMatch} className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-black rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95">
                  <Users className="w-4 h-4" /> Rəqib Axtar
                </button>
                <button onClick={createPrivateRoom} className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-black rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95">
                  <LinkIcon className="w-4 h-4" /> Dostla Oyna (Link)
                </button>
                <button onClick={copySpectatorLink} className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all">
                  <Eye className="w-4 h-4" /> İzləyici Linki
                </button>
              </div>
            )}

            {/* Action Buttons */}
            {!isSpectator && (
              <div className="flex gap-2">
                <button onClick={resign} className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95">
                  <Flag className="w-4 h-4" /> Təslim
                </button>
                <button
                  onClick={offerDraw}
                  disabled={drawOfferedByMe || mode === 'bot'}
                  className={`flex-1 py-2 border text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${drawOfferedByMe ? 'bg-zinc-900 border-zinc-800 text-zinc-600' : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600 text-zinc-300 hover:text-white active:scale-95'}`}
                >
                  <Shield className="w-4 h-4" />
                  {drawOfferedByMe ? 'Gözlənilir...' : 'Heç-heçə'}
                </button>
              </div>
            )}

            <button onClick={() => resetGame()} className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95">
              <RotateCcw className="w-3 h-3" /> Yeni Oyun
            </button>
          </div>

          {/* Move History */}
          <div className="tdv-card p-5 flex flex-col flex-1 min-h-[240px]">
            <div className="tdv-section-label mb-3 flex items-center gap-2">
              <Swords className="w-3 h-3" /> Gedişlər Tarixçəsi
            </div>
            <div className="flex-1 overflow-y-auto max-h-[300px] flex flex-col gap-0.5 scrollbar-hide">
              {moves.reduce((acc, m, i) => {
                const ci = Math.floor(i / 2);
                if (!acc[ci]) acc[ci] = [];
                acc[ci].push(m);
                return acc;
              }, [] as Move[][]).map((pair, i) => (
                <div key={i} className="flex items-center text-sm px-2 py-1 rounded-lg hover:bg-zinc-800/40">
                  <span className="w-7 text-zinc-600 font-mono text-xs shrink-0">{i + 1}.</span>
                  <span className={`flex-1 font-mono text-sm ${pair[0]?.san.includes('+') ? 'text-red-400 font-bold' : pair[0]?.san.includes('x') ? 'text-orange-400 font-semibold' : 'text-zinc-200'}`}>
                    {pair[0]?.san}
                  </span>
                  <span className={`flex-1 font-mono text-sm ${pair[1]?.san?.includes('+') ? 'text-red-400 font-bold' : pair[1]?.san?.includes('x') ? 'text-orange-400 font-semibold' : 'text-zinc-400'}`}>
                    {pair[1]?.san || ''}
                  </span>
                </div>
              ))}
              {moves.length === 0 && (
                <div className="text-center text-zinc-700 text-xs italic mt-8">
                  Lövhəyə klikləyib oynamağa başlayın...
                </div>
              )}
              <div ref={movesEndRef} />
            </div>
          </div>

          {/* In-Game Chat (Multiplayer) */}
          {mode === 'multiplayer' && roomId && (
            <GameChat roomId={roomId} gameName="Şahmat" userName={user?.displayName || 'Oyunçu'} />
          )}
        </div>
      </div>
    </div>
  );
}
