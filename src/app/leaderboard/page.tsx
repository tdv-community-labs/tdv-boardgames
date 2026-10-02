'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, UserPlus, Star, Shield, Sword, Hexagon, Zap } from 'lucide-react';
import { db, auth } from '@/lib/firebase';
import { ref, onValue, get, push } from 'firebase/database';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getRank } from '@/utils/ranks';
import { toast } from 'react-hot-toast';

interface Player {
  uid: string;
  rank?: number;
  displayName: string;
  avatar?: string;
  elo: number;
  winRate: string;
  wins: number;
  losses: number;
  coins?: number;
  spentCoins?: number;
  level?: number;
  banner?: string;
}

export default function LeaderboardPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sortBy, setSortBy] = useState<'elo' | 'wins' | 'coins'>('elo');
  const [loading, setLoading] = useState(true);

  useEffect(() => { const u = onAuthStateChanged(auth, setCurrentUser); return u; }, []);

  const sendFriendRequest = async (toUid: string, toName: string) => {
    if (!currentUser || currentUser.uid === toUid) return;
    const mySnap = await get(ref(db, `users/${currentUser.uid}`));
    const me = mySnap.val();
    await push(ref(db, `notifications/${toUid}`), {
      type: 'friend_request',
      fromUid: currentUser.uid,
      fromName: me?.displayName || 'Oyunçu',
      fromAvatar: me?.avatar || '😎',
      timestamp: Date.now()
    });
    toast.success('Dost sorğusu göndərildi!');
  };

  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, (snap) => {
      const data = snap.val();
      if (data) {
        const parsed: Player[] = Object.entries(data).map(([uid, val]: [string, any]) => ({
          uid,
          displayName: val.displayName || 'Oyunçu',
          avatar: val.avatar || '😎',
          elo: val.elo || 1200,
          winRate: val.winRate || '0%',
          wins: val.wins || 0,
          losses: val.losses || 0,
          coins: ((val.wins || 0) * 15 + (val.losses || 0) * 2 + (val.bonusCoins || 0)) - (val.spentCoins || 0),
          level: Math.floor(Math.sqrt((val.wins || 0) + (val.losses || 0))) + 1,
          banner: val.banner || 'default'
        }));

        if (sortBy === 'elo') parsed.sort((a, b) => b.elo - a.elo);
        else if (sortBy === 'wins') parsed.sort((a, b) => b.wins - a.wins);
        else if (sortBy === 'coins') parsed.sort((a, b) => (b.coins || 0) - (a.coins || 0));

        parsed.forEach((p, i) => { p.rank = i + 1; });
        setPlayers(parsed);
      } else {
        setPlayers([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [sortBy]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-amber-600/20 via-purple-600/10 to-transparent blur-[100px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10 pt-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-16">
          <motion.div 
            initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", duration: 1.5 }}
            className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-600 flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.4)] mb-8 border border-amber-300"
          >
            <Trophy className="w-12 h-12 text-white" strokeWidth={1.5} />
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-500 tracking-tighter mb-6 drop-shadow-2xl">
            Sistem Liderləri
          </h1>
          <p className="text-zinc-400 font-medium max-w-lg text-lg">
            Qlobal sıralamada ən yüksək səviyyəli kiber-atletlər və strategiya ustaları.
          </p>
        </div>

        {/* Sorting Tabs */}
        <div className="flex flex-wrap justify-center gap-3 mb-16">
          {[
            { id: 'elo', name: 'Reytinq (Elo)', icon: <Shield className="w-4 h-4" /> },
            { id: 'wins', name: 'Qələbələr', icon: <Sword className="w-4 h-4" /> },
            { id: 'coins', name: 'Zənginlər', icon: <Hexagon className="w-4 h-4" /> }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setSortBy(tab.id as any)}
              className={`px-6 py-3 rounded-2xl text-sm font-black flex items-center gap-2 transition-all duration-300 ${sortBy === tab.id ? 'bg-amber-500 text-zinc-950 shadow-[0_0_20px_rgba(245,158,11,0.5)] scale-105' : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 border border-zinc-800'}`}
            >
              {tab.icon} {tab.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Zap className="w-8 h-8 text-amber-500 animate-pulse" /></div>
        ) : players.length === 0 ? (
          <div className="text-center text-zinc-500">Oyunçu tapılmadı.</div>
        ) : (
          <>
            {/* 3D Holographic Podium */}
            <div className="flex items-end justify-center gap-2 sm:gap-6 mb-20 h-64 sm:h-72 px-2">
              {[1, 0, 2].map((i) => {
                const player = players[i];
                if (!player) return <div key={i} className="w-1/3" />;
                
                const isFirst = i === 0;
                const isSecond = i === 1;
                const heightClass = isFirst ? 'h-full' : isSecond ? 'h-4/5' : 'h-3/5';
                const colorFrom = isFirst ? 'from-amber-400' : isSecond ? 'from-zinc-300' : 'from-orange-400';
                const colorTo = isFirst ? 'to-amber-600' : isSecond ? 'to-zinc-500' : 'to-orange-700';
                
                return (
                  <motion.div 
                    key={player.uid}
                    initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.15 }}
                    className={`relative w-28 sm:w-40 flex flex-col items-center ${heightClass}`}
                  >
                    {/* Player Info */}
                    <div className={`absolute -top-24 flex flex-col items-center ${isFirst ? 'scale-125 -top-32 z-20' : 'z-10'}`}>
                      {isFirst && <div className="absolute -top-8 text-amber-400 animate-bounce"><Trophy className="w-6 h-6" /></div>}
                      <div className={`text-4xl sm:text-5xl mb-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]`}>{player.avatar}</div>
                      <div className="text-sm font-black text-white truncate w-24 text-center drop-shadow-md">{player.displayName}</div>
                      <div className={`text-xs font-bold px-2 py-0.5 rounded-full mt-1 bg-gradient-to-r ${colorFrom} ${colorTo} text-zinc-950`}>
                        {sortBy === 'elo' ? `${player.elo} ELO` : sortBy === 'wins' ? `${player.wins} Qələbə` : `${player.coins} 🪙`}
                      </div>
                    </div>
                    
                    {/* The Holographic Pillar */}
                    <div className="absolute bottom-0 w-full h-full flex flex-col justify-end perspective-1000">
                      <div className={`w-full h-full bg-gradient-to-t ${colorFrom} ${colorTo} opacity-20 rounded-t-xl`} style={{ transform: 'rotateX(10deg)' }} />
                      <div className={`absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t ${colorFrom} opacity-40 blur-xl`} />
                      <div className="absolute inset-0 border-t-2 border-l border-r border-white/20 rounded-t-xl" />
                      
                      <div className="absolute bottom-4 w-full text-center text-4xl font-black text-white/50">{i + 1}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Glowing Leaderboard Rows */}
            <div className="flex flex-col gap-3">
              {players.slice(3).map((player, i) => {
                const rankInfo = getRank(player.elo);
                const isMe = currentUser?.uid === player.uid;

                return (
                  <motion.div 
                    key={player.uid}
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className={`relative flex items-center justify-between p-4 rounded-2xl border transition-all hover:scale-[1.01] overflow-hidden ${isMe ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 'bg-zinc-900/50 border-zinc-800/50 hover:bg-zinc-800'}`}
                  >
                    {isMe && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 shadow-[0_0_10px_#f59e0b]" />}
                    
                    <div className="flex items-center gap-4 sm:gap-6 flex-1 min-w-0">
                      <div className="w-8 text-center text-zinc-500 font-black text-xl">#{player.rank}</div>
                      
                      <div className="w-12 h-12 flex-shrink-0 bg-zinc-800 rounded-xl flex items-center justify-center text-2xl border border-zinc-700 relative">
                        {player.avatar}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="font-bold text-white text-base sm:text-lg truncate">{player.displayName} {isMe && <span className="text-[10px] bg-amber-500 text-black px-1.5 py-0.5 rounded-md ml-2 align-middle">SƏN</span>}</div>
                        <div className={`text-xs font-bold ${rankInfo.color} flex items-center gap-1`}>
                           {rankInfo.icon} {rankInfo.name} <span className="text-zinc-600 mx-1">•</span> Səviyyə {player.level}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 flex-shrink-0">
                      {/* Dynamic Stat shown based on sort */}
                      <div className="text-right hidden sm:block">
                        <div className="text-sm font-black text-white">
                          {sortBy === 'elo' ? `${player.elo}` : sortBy === 'wins' ? `${player.wins}` : `${player.coins} 🪙`}
                        </div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{sortBy.toUpperCase()}</div>
                      </div>

                      {currentUser && !isMe && (
                        <button 
                          onClick={() => sendFriendRequest(player.uid, player.displayName)}
                          className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-blue-600 text-zinc-400 hover:text-white flex items-center justify-center transition-all shadow-lg active:scale-95"
                          title="Dostluq Göndər"
                        >
                          <UserPlus className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
