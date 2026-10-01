'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess, Move } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Shield, Flag, Swords, ArrowLeft, Cpu, Users, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import { playMoveSound, playCaptureSound } from '@/utils/sounds';

export default function ChessArena() {
  const [game, setGame] = useState(new Chess());
  const [moves, setMoves] = useState<Move[]>([]);
  const [status, setStatus] = useState<string>('Oyun Başladı');
  const [mode, setMode] = useState<'bot' | 'multiplayer'>('bot');
  const [difficulty, setDifficulty] = useState<number>(10); // 1-20
  
  // Multiplayer State
  const [socket, setSocket] = useState<Socket | null>(null);
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

  // Socket.IO Effect
  useEffect(() => {
    if (mode === 'multiplayer') {
      const newSocket = io();
      setSocket(newSocket);

      newSocket.on('waiting_for_match', () => {
        setIsSearching(true);
        setStatus('Rəqib axtarılır...');
      });

      newSocket.on('match_found', (data) => {
        setIsSearching(false);
        setRoomId(data.roomId);
        setMyColor(data.whiteId === newSocket.id ? 'w' : 'b');
        resetGame();
        setStatus('Oyun Başladı! Uğurlar.');
      });

      newSocket.on('opponent_moved', (move) => {
        setGame((g) => {
          const newGame = new Chess(g.fen());
          const moveResult = newGame.move(move);
          
          if (moveResult) {
            if (moveResult.captured) playCaptureSound();
            else playMoveSound();
          }

          setMoves(newGame.history({ verbose: true }) as Move[]);
          updateStatus(newGame);
          return newGame;
        });
      });

      return () => {
        newSocket.disconnect();
      };
    } else {
      if (socket) socket.disconnect();
      setSocket(null);
      setRoomId(null);
      setIsSearching(false);
      setMyColor('w');
    }
  }, [mode]);

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
            engine.current.postMessage(\`position fen \${newGame.fen()}\`);
            engine.current.postMessage(\`setoption name Skill Level value \${difficulty}\`);
            engine.current.postMessage(\`go depth 15\`);
          }
        } else if (mode === 'multiplayer' && roomId && socket) {
          socket.emit('make_move', { roomId, move });
        }
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  }, [game, mode, difficulty, roomId, socket]);

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

  const updateStatus = (g: Chess) => {
    if (g.isCheckmate()) setStatus('Şah və Mat! Oyun Bitdi.');
    else if (g.isDraw()) setStatus('Heç-heçə!');
    else if (g.isStalemate()) setStatus('Pat! Heç-heçə.');
    else if (g.isCheck()) setStatus('ŞAH!');
    else setStatus(\`Gediş sırası: \${g.turn() === 'w' ? 'Ağlar' : 'Qaralar'}\`);
  };

  const resetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setMoves([]);
    setStatus('Oyun Başladı');
  };

  const findMatch = () => {
    if (socket) {
      socket.emit('find_match');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8 relative z-10 pt-24">
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
            className={\`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition \${mode === 'bot' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'}\`}
          >
            <Cpu className="w-4 h-4" /> Stockfish AI (Bot)
          </button>
          <button 
            onClick={() => { setMode('multiplayer'); resetGame(); }}
            className={\`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition \${mode === 'multiplayer' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}\`}
          >
            <Users className="w-4 h-4" /> Canlı (Multiplayer)
          </button>
        </div>

        {/* Opponent Info */}
        <div className="w-full max-w-[600px] flex items-center justify-between mb-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
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
          className="w-full max-w-[600px] aspect-square rounded-lg overflow-hidden shadow-[0_0_50px_rgba(139,92,246,0.15)] ring-4 ring-zinc-800/50"
        >
          <Chessboard 
            position={game.fen()} 
            onPieceDrop={onDrop}
            boardOrientation={myColor === 'w' ? 'white' : 'black'}
            customDarkSquareStyle={{ backgroundColor: '#27272a' }}
            customLightSquareStyle={{ backgroundColor: '#e4e4e7' }}
            animationDuration={200}
          />
        </motion.div>

        {/* My Info */}
        <div className="w-full max-w-[600px] flex items-center justify-between mt-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
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
              <button className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-white transition flex items-center justify-center gap-2">
                <Shield className="w-4 h-4" /> Heç-heçə
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
