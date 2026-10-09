'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess, Move } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Shield, Flag, Swords, ArrowLeft, Cpu, Users, Loader2, Link as LinkIcon, Eye, RotateCcw, Sliders, Check } from 'lucide-react';
import Link from 'next/link';
import EndGameModal from '@/components/EndGameModal';
import GameChat from '@/components/GameChat';
import { auth, db } from '@/lib/firebase';
import { ref, get, set, remove, onValue, push, serverTimestamp, onDisconnect, update } from 'firebase/database';
import { updateStreakAndQuests } from '@/utils/streaks';
import { onAuthStateChanged, User } from 'firebase/auth';
import confetti from 'canvas-confetti';
import { toast } from 'react-hot-toast';
import { playMoveSound, playCaptureSound, playCheckSound } from '@/utils/sounds';

/* ─── Board Themes ─────────────────────────────────── */
const THEMES = {
  classic: { light: '#f0d9b5', dark: '#b58863', label: 'Klassik' },
  wood:    { light: '#e6c8a0', dark: '#8b5a2b', label: 'Ağac'    },
  ocean:   { light: '#d1e6e6', dark: '#4682b4', label: 'Okean'   },
  neon:    { light: '#2c003e', dark: '#ff007f', label: 'Neon'    },
} as const;
type ThemeKey = keyof typeof THEMES;

/* ─── Time Controls ────────────────────────────────── */
interface TimeControlConfig {
  label: string;
  secs: number;
  inc: number;
  name: string;
}

const PRESET_TIME_CONTROLS: TimeControlConfig[] = [
  { label: '1+0',  secs: 60,  inc: 0, name: 'Bullet' },
  { label: '3+0',  secs: 180, inc: 0, name: 'Blitz'  },
  { label: '3+1',  secs: 180, inc: 1, name: 'Blitz'  },
  { label: '5+0',  secs: 300, inc: 0, name: 'Rapid'  },
  { label: '5+2',  secs: 300, inc: 2, name: 'Rapid'  },
  { label: '10+0', secs: 600, inc: 0, name: 'Klassik'},
];

/* ─── Bot Difficulty Levels ────────────────────────── */
interface BotDifficulty {
  level: number;
  name: string;
  elo: string;
  icon: string;
  skill: number;
  depth: number;
  blunderRate: number; // probability of choosing a suboptimal move
  delayMin: number;
  delayMax: number;
}

const BOT_LEVELS: BotDifficulty[] = [
  { level: 1, name: 'Asan',        elo: '600-800',   icon: '🌱', skill: 0,  depth: 1,  blunderRate: 0.35, delayMin: 800,  delayMax: 1400 },
  { level: 2, name: 'Həvəskar',    elo: '1000-1100', icon: '⚔️', skill: 3,  depth: 3,  blunderRate: 0.15, delayMin: 900,  delayMax: 1500 },
  { level: 3, name: 'Orta',        elo: '1400',      icon: '🎯', skill: 7,  depth: 5,  blunderRate: 0.05, delayMin: 1000, delayMax: 1700 },
  { level: 4, name: 'Usta',        elo: '1800',      icon: '🏆', skill: 14, depth: 8,  blunderRate: 0.0,  delayMin: 1200, delayMax: 2000 },
  { level: 5, name: 'Qrossmeyster',elo: '2500+',     icon: '🤖', skill: 20, depth: 14, blunderRate: 0.0,  delayMin: 1300, delayMax: 2200 },
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
  const [botLevel, setBotLevel] = useState<BotDifficulty>(BOT_LEVELS[1]); // Default: Həvəskar (~1000 ELO)
  const [isAiThinking, setIsAiThinking] = useState(false);

  /* ── Clock & Time Control ── */
  const [timeControl, setTimeControl] = useState(180); // 3 dəq
  const [increment, setIncrement] = useState(1);       // 1 san artım (3+1 default)
  const [activeTcLabel, setActiveTcLabel] = useState('3+1');
  const [whiteTime, setWhiteTime] = useState(180);
  const [blackTime, setBlackTime] = useState(180);
  const [clockRunning, setClockRunning] = useState(false);

  /* ── Custom Time Modal/Drawer ── */
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(5);
  const [customInc, setCustomInc] = useState(3);

  /* ── Multiplayer ── */
  const [user, setUser] = useState<User | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [myColor, setMyColor] = useState<'w' | 'b'>('w');
  const [isSpectator, setIsSpectator] = useState(false);
  const [opponentName, setOpponentName] = useState<string>('');
  const [opponentElo, setOpponentElo] = useState<number>(1200);

  /* ── Draw & Promotion ── */
  const [drawOfferedByMe, setDrawOfferedByMe] = useState(false);
  const [incomingDraw, setIncomingDraw] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);

  const engine = useRef<Worker | null>(null);
  const movesContainerRef = useRef<HTMLDivElement>(null);
  const botTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  /* ── Helper: Bot Move with Human-like Delay & Balanced Difficulty ── */
  const makeBotMove = useCallback((currentGame: Chess) => {
    if (currentGame.isGameOver()) return;

    setIsAiThinking(true);
    let moveHandled = false;

    // Calculate natural delay (e.g. 800 - 1600ms)
    const delay = Math.floor(Math.random() * (botLevel.delayMax - botLevel.delayMin)) + botLevel.delayMin;

    const executeMove = (chosenMove: { from: string; to: string; promotion?: string }) => {
      botTimeoutRef.current = setTimeout(() => {
        setIsAiThinking(false);
        setGame(prev => {
          const next = new Chess(prev.fen());
          const res = next.move(chosenMove);
          if (res) {
            if (res.captured) playCaptureSound();
            else if (next.isCheck()) playCheckSound();
            else playMoveSound();
            setLastMove({ from: chosenMove.from, to: chosenMove.to });
            setMoves(next.history({ verbose: true }) as Move[]);
            updateStatus(next);

            // Add increment to black time
            if (increment > 0) {
              setBlackTime(t => t + increment);
            }
          }
          return next;
        });
      }, delay);
    };

    // If bot blunders intentionally based on difficulty (e.g., Level 1 Asan)
    if (botLevel.blunderRate > 0 && Math.random() < botLevel.blunderRate) {
      const legalMoves = currentGame.moves({ verbose: true });
      if (legalMoves.length > 0) {
        // Pick a non-capturing or casual move if available
        const nonCaptures = legalMoves.filter(m => !m.captured);
        const randomMove = (nonCaptures.length > 0 && Math.random() < 0.7)
          ? nonCaptures[Math.floor(Math.random() * nonCaptures.length)]
          : legalMoves[Math.floor(Math.random() * legalMoves.length)];

        moveHandled = true;
        executeMove({ from: randomMove.from, to: randomMove.to, promotion: 'q' });
        return;
      }
    }

    // Safety Fallback Timer if Stockfish worker fails to respond
    const fallbackTimer = setTimeout(() => {
      if (moveHandled) return;
      moveHandled = true;
      const legalMoves = currentGame.moves({ verbose: true });
      if (legalMoves.length === 0) return;
      const captures = legalMoves.filter(m => m.captured);
      const chosen = (captures.length > 0 && botLevel.level >= 2)
        ? captures[Math.floor(Math.random() * captures.length)]
        : legalMoves[Math.floor(Math.random() * legalMoves.length)];

      executeMove({ from: chosen.from, to: chosen.to, promotion: 'q' });
    }, delay + 400);

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

            executeMove({ from, to, promotion });
          }
        }
      };

      engine.current.postMessage(`position fen ${currentGame.fen()}`);
      engine.current.postMessage(`setoption name Skill Level value ${botLevel.skill}`);
      engine.current.postMessage(`go depth ${botLevel.depth}`);
    }
  }, [botLevel, increment]);

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
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
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

  /* ── Auto-scroll Move History (Container only, never the window) ── */
  useEffect(() => {
    if (movesContainerRef.current) {
      movesContainerRef.current.scrollTop = movesContainerRef.current.scrollHeight;
    }
  }, [moves]);

  /* ── Status Text ── */
  const updateStatus = (g: Chess) => {
    if (g.isCheckmate()) setStatus('♚ Şah və Mat! Oyun bitdi.');
    else if (g.isDraw()) setStatus('½-½ Heç-heçə');
    else if (g.isStalemate()) setStatus('Pat! Heç-heçə.');
    else if (g.isCheck()) setStatus('⚠️ ŞAH!');
    else setStatus(`Gediş: ${g.turn() === 'w' ? '⚪ Ağlar' : '⚫ Qaralar'}`);
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
      else if (next.isCheck()) playCheckSound();
      else playMoveSound();

      // Add increment if clock is running or started
      if (increment > 0) {
        if (game.turn() === 'w') {
          setWhiteTime(t => t + increment);
        } else {
          setBlackTime(t => t + increment);
        }
      }

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
  }, [game, clockRunning, moves.length, mode, roomId, increment, makeBotMove]);

  /* ── Check if Move is Pawn Promotion ── */
  const isPromotionMove = (from: string, to: string): boolean => {
    const piece = game.get(from as any);
    if (!piece || piece.type !== 'p') return false;
    if (piece.color === 'w' && to[1] === '8') return true;
    if (piece.color === 'b' && to[1] === '1') return true;
    return false;
  };

  const handleSelectPromotion = (promoPiece: 'q' | 'n' | 'r' | 'b') => {
    if (pendingPromotion) {
      applyMove(pendingPromotion.from, pendingPromotion.to, promoPiece);
      setPendingPromotion(null);
    }
  };

  /* ── Drag & Drop Handler ── */
  const onPieceDrop = (sourceSquare: string, targetSquare: string): boolean => {
    if (isSpectator || game.isGameOver() || engineWinner || isAiThinking) return false;
    if (mode === 'multiplayer' && game.turn() !== myColor) return false;
    if (mode === 'bot' && game.turn() === 'b') return false;

    const legalMoves = (game.moves({ square: sourceSquare as any, verbose: true }) as Move[]);
    const isLegal = legalMoves.some(m => m.to === targetSquare);
    if (!isLegal) return false;

    if (isPromotionMove(sourceSquare, targetSquare)) {
      setPendingPromotion({ from: sourceSquare, to: targetSquare });
      return true;
    }

    return applyMove(sourceSquare, targetSquare);
  };

  /* ── Click-To-Move Handler ── */
  const onSquareClick = (square: string) => {
    if (isSpectator || game.isGameOver() || engineWinner || isAiThinking) return;
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
      if (isPromotionMove(moveFrom, square)) {
        setPendingPromotion({ from: moveFrom, to: square });
        setMoveFrom(null);
        setOptionSquares({});
      } else {
        applyMove(moveFrom, square);
      }
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

  /* ── Time Control Select Handlers ── */
  const handleSelectPresetTime = (tc: TimeControlConfig) => {
    if (clockRunning) {
      toast.error('Oyun gedərkən vaxtı dəyişmək olmaz');
      return;
    }
    setTimeControl(tc.secs);
    setIncrement(tc.inc);
    setActiveTcLabel(tc.label);
    setWhiteTime(tc.secs);
    setBlackTime(tc.secs);
    toast.success(`Vaxt: ${tc.label} (${tc.name}) seçildi`);
  };

  const handleApplyCustomTime = () => {
    if (clockRunning) {
      toast.error('Oyun gedərkən vaxtı dəyişmək olmaz');
      return;
    }
    const mins = Math.max(1, Math.min(120, customMinutes));
    const inc = Math.max(0, Math.min(60, customInc));
    const totalSecs = mins * 60;
    const label = `${mins}+${inc}`;

    setTimeControl(totalSecs);
    setIncrement(inc);
    setActiveTcLabel(label);
    setWhiteTime(totalSecs);
    setBlackTime(totalSecs);
    setShowCustomModal(false);
    toast.success(`Xüsusi vaxt: ${label} tətbiq edildi! ⏱️`);
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
    if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    setIsAiThinking(false);
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
    if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    setIsAiThinking(false);
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

        {/* ── Custom Time Setting Modal ── */}
        <AnimatePresence>
          {showCustomModal && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-sm bg-zinc-900 border border-zinc-700 p-6 rounded-3xl shadow-2xl flex flex-col gap-5"
              >
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-blue-400" /> Xüsusi Vaxt Rejimi
                  </h3>
                  <button onClick={() => setShowCustomModal(false)} className="text-zinc-500 hover:text-white text-sm font-bold">✕</button>
                </div>

                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-400 block mb-1.5 uppercase tracking-wider">
                      Başlanğıc Vaxtı (Dəqiqə)
                    </label>
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      {[1, 3, 5, 10, 15, 20, 30, 60].map(m => (
                        <button
                          key={m}
                          onClick={() => setCustomMinutes(m)}
                          className={`py-1.5 rounded-xl text-xs font-bold transition-all ${customMinutes === m ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                        >
                          {m} dəq
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-zinc-500 font-bold">Dəqiq:</span>
                      <input
                        type="number" min="1" max="120"
                        value={customMinutes}
                        onChange={e => setCustomMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-24 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-white font-mono text-sm outline-none focus:border-blue-500"
                      />
                      <span className="text-xs text-zinc-400">dəqiqə</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-400 block mb-1.5 uppercase tracking-wider">
                      Gediş Başına Artım (Saniyə)
                    </label>
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      {[0, 1, 2, 3, 5, 10, 15, 30].map(s => (
                        <button
                          key={s}
                          onClick={() => setCustomInc(s)}
                          className={`py-1.5 rounded-xl text-xs font-bold transition-all ${customInc === s ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                        >
                          +{s} san
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-zinc-500 font-bold">Dəqiq:</span>
                      <input
                        type="number" min="0" max="60"
                        value={customInc}
                        onChange={e => setCustomInc(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-24 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-white font-mono text-sm outline-none focus:border-purple-500"
                      />
                      <span className="text-xs text-zinc-400">saniyə artım</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800 text-center">
                  <span className="text-xs text-zinc-500">Format: </span>
                  <span className="text-base font-black text-amber-400 font-mono">{customMinutes}+{customInc}</span>
                  <span className="text-xs text-zinc-500 ml-1">({customMinutes} dəqiqə, hər gedişdə +{customInc} san)</span>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setShowCustomModal(false)} className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-sm rounded-xl transition">
                    İmtina
                  </button>
                  <button onClick={handleApplyCustomTime} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-sm rounded-xl transition shadow-lg active:scale-95">
                    Tətbiq Et
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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

        {/* ── Promotion Selection Modal ── */}
        <AnimatePresence>
          {pendingPromotion && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-zinc-950 border border-purple-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(168,85,247,0.25)] max-w-sm w-full text-center relative overflow-hidden"
              >
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mx-auto mb-3 text-purple-400 text-2xl shadow-inner">
                  👑
                </div>
                <h3 className="text-xl font-black text-white mb-1 tracking-tight">Piyadanı Çevir</h3>
                <p className="text-xs text-zinc-400 mb-6">Piyadanız son xanaya çatdı. Çevriləcəyi fiquru seçin:</p>
                
                <div className="grid grid-cols-4 gap-2.5">
                  <button
                    onClick={() => handleSelectPromotion('q')}
                    className="p-3 bg-zinc-900/90 hover:bg-purple-600/30 border border-purple-500/30 hover:border-purple-400 rounded-2xl flex flex-col items-center gap-1.5 transition active:scale-95 group shadow-sm"
                  >
                    <span className="text-4xl filter drop-shadow group-hover:scale-110 transition-transform">{game.turn() === 'w' ? '♕' : '♛'}</span>
                    <span className="text-xs font-bold text-zinc-300 group-hover:text-purple-300">Vəzir</span>
                  </button>
                  <button
                    onClick={() => handleSelectPromotion('n')}
                    className="p-3 bg-zinc-900/90 hover:bg-cyan-600/30 border border-cyan-500/30 hover:border-cyan-400 rounded-2xl flex flex-col items-center gap-1.5 transition active:scale-95 group shadow-sm"
                  >
                    <span className="text-4xl filter drop-shadow group-hover:scale-110 transition-transform">{game.turn() === 'w' ? '♘' : '♞'}</span>
                    <span className="text-xs font-bold text-zinc-300 group-hover:text-cyan-300">At</span>
                  </button>
                  <button
                    onClick={() => handleSelectPromotion('r')}
                    className="p-3 bg-zinc-900/90 hover:bg-amber-600/30 border border-amber-500/30 hover:border-amber-400 rounded-2xl flex flex-col items-center gap-1.5 transition active:scale-95 group shadow-sm"
                  >
                    <span className="text-4xl filter drop-shadow group-hover:scale-110 transition-transform">{game.turn() === 'w' ? '♖' : '♜'}</span>
                    <span className="text-xs font-bold text-zinc-300 group-hover:text-amber-300">Top</span>
                  </button>
                  <button
                    onClick={() => handleSelectPromotion('b')}
                    className="p-3 bg-zinc-900/90 hover:bg-emerald-600/30 border border-emerald-500/30 hover:border-emerald-400 rounded-2xl flex flex-col items-center gap-1.5 transition active:scale-95 group shadow-sm"
                  >
                    <span className="text-4xl filter drop-shadow group-hover:scale-110 transition-transform">{game.turn() === 'w' ? '♗' : '♝'}</span>
                    <span className="text-xs font-bold text-zinc-300 group-hover:text-emerald-300">Fil</span>
                  </button>
                </div>

                <button
                  onClick={() => setPendingPromotion(null)}
                  className="mt-5 text-xs text-zinc-500 hover:text-zinc-300 transition underline underline-offset-4"
                >
                  Gedişi ləğv et
                </button>
              </motion.div>
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
          <div className={`w-full max-w-[min(100%,65vh)] flex items-center justify-between bg-zinc-900/70 border p-3.5 rounded-2xl transition-all ${
            isAiThinking ? 'border-purple-500/70 shadow-[0_0_20px_rgba(168,85,247,0.2)]' : 'border-zinc-800'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xl border border-zinc-700 relative">
                {mode === 'bot' ? botLevel.icon : '⚔️'}
                {isAiThinking && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full animate-ping" />
                )}
              </div>
              <div>
                <div className="font-bold text-white text-sm flex items-center gap-2">
                  {mode === 'bot' ? `Bot (${botLevel.name})` : (opponentName || 'Rəqib gözlənilir...')}
                  {isAiThinking && (
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-mono animate-pulse">
                      Düşünür... 🧠
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-500">
                  {mode === 'bot' ? `~ ${botLevel.elo} ELO` : `${opponentElo} ELO`}
                </div>
              </div>
            </div>
            {/* Black Clock */}
            <div className={`font-mono font-black text-2xl px-4 py-1.5 rounded-xl border transition-all ${
              blackTime < 30 ? 'text-red-400 border-red-500/50 bg-red-500/10 animate-pulse' :
              game.turn() === 'b' && clockRunning ? 'text-white border-purple-500/50 bg-purple-500/10' : 'text-zinc-500 border-zinc-800'
            }`}>
              {formatTime(blackTime)}
              {increment > 0 && <span className="text-[10px] text-zinc-600 block text-right font-sans font-bold">+{increment}s</span>}
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

            <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(139,92,246,0.15)] ring-2 ring-zinc-800/80 bg-zinc-900 touch-none select-none">
              {mounted ? (
                <Chessboard
                  options={{
                    position: game.fen(),
                    boardOrientation: myColor === 'w' ? 'white' : 'black',
                    darkSquareStyle: { backgroundColor: THEMES[theme].dark },
                    lightSquareStyle: { backgroundColor: THEMES[theme].light },
                    squareStyles: combinedSquares,
                    animationDurationInMs: 150,
                    onPieceDrop: ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare?: string | null }) => onPieceDrop(sourceSquare, targetSquare ?? ''),
                    onSquareClick: ({ square }: { square: string }) => onSquareClick(square),
                  }}
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
              {increment > 0 && <span className="text-[10px] text-zinc-600 block text-right font-sans font-bold">+{increment}s</span>}
            </div>
          </div>
        </div>

        {/* ═══════ SIDEBAR CONTROLS ═══════ */}
        <div className="w-full lg:w-80 flex flex-col gap-4">

          {/* Status & Options Card */}
          <div className="tdv-card p-5 flex flex-col gap-4">
            {/* Time Control Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="tdv-section-label">Vaxt Nəzarəti</span>
                <button
                  onClick={() => setShowCustomModal(true)}
                  disabled={clockRunning}
                  className="text-[11px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition disabled:opacity-50"
                >
                  <Sliders className="w-3.5 h-3.5" /> Xüsusi ({activeTcLabel})
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {PRESET_TIME_CONTROLS.map(tc => {
                  const isSelected = activeTcLabel === tc.label;
                  return (
                    <button
                      key={tc.label}
                      onClick={() => handleSelectPresetTime(tc)}
                      disabled={clockRunning}
                      className={`py-1.5 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-50'
                      }`}
                    >
                      <span>{tc.label}</span>
                      {isSelected && <Check className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>

              {increment > 0 && (
                <div className="mt-1.5 text-[10px] text-zinc-500 font-mono">
                  ⏱️ Hər gedişdə saatınıza +{increment} saniyə artım verilir
                </div>
              )}
            </div>

            {/* Game Status */}
            <div>
              <div className="tdv-section-label mb-1">Oyun Statusu</div>
              <div className={`text-base font-black ${status.includes('ŞAH') ? 'text-red-400' : 'text-white'}`}>
                {status}
              </div>
            </div>

            {/* AI Difficulty Selector (Bot Mode) */}
            {mode === 'bot' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="tdv-section-label">AI Gücü (Səviyyə)</span>
                  <span className="text-xs font-mono font-bold text-purple-400">~{botLevel.elo}</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  {BOT_LEVELS.slice(0, 4).map(bl => {
                    const isSelected = botLevel.level === bl.level;
                    return (
                      <button
                        key={bl.level}
                        onClick={() => {
                          setBotLevel(bl);
                          toast.success(`AI: ${bl.name} (${bl.elo} ELO) seçildi`);
                        }}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all text-left flex items-center gap-2 border ${
                          isSelected
                            ? 'bg-purple-600/30 border-purple-500 text-white shadow-md'
                            : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                        }`}
                      >
                        <span className="text-base">{bl.icon}</span>
                        <div className="truncate">
                          <div className="leading-tight font-black">{bl.name}</div>
                          <div className="text-[10px] text-zinc-500 font-mono">{bl.elo}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Grandmaster option */}
                <button
                  onClick={() => {
                    setBotLevel(BOT_LEVELS[4]);
                    toast.success('Maksimum Stockfish gücü aktivdir! 🤖');
                  }}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between border ${
                    botLevel.level === 5
                      ? 'bg-red-950/40 border-red-500 text-red-200 shadow-md shadow-red-500/20'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🤖</span>
                    <span className="font-black">Qrossmeyster (Stockfish MAX)</span>
                  </div>
                  <span className="text-[10px] font-mono text-red-400">2500+</span>
                </button>
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
            <div ref={movesContainerRef} className="flex-1 overflow-y-auto max-h-[300px] flex flex-col gap-0.5 scrollbar-hide">
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
