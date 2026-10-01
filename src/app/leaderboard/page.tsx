'use client';
import { toast } from 'react-hot-toast';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, UserPlus } from 'lucide-react';
import { db, auth } from '@/lib/firebase';
import { ref, onValue, get, push } from 'firebase/database';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getRank } from '@/utils/ranks';
import confetti from 'canvas-confetti';

interface Player {
  uid: string;
  rank?: number;
  displayName: string;
    avatar?: string;
  elo: number;
  winRate: string;
  wins: number;
  losses: number;
  coins: number;
  level: number;
}

export default function LeaderboardPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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
    setSelectedUser(null);
  };
  
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [rawUsers, setRawUsers] = useState<any>({});
  const [sortBy, setSortBy] = useState<'elo' | 'wins' | 'coins' | 'level'>('elo');
  const [loading, setLoading] = useState(true);

  
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#fbbf24', '#f59e0b', '#d97706']
        });
      }, 500);
    }
  }, [sortBy]);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#fbbf24', '#f59e0b', '#d97706']
        });
      }, 500);
    }
  }, [sortBy]);
  
  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, (snap) => {
      const data = snap.val();
      if (data) {
        const parsed: Player[] = Object.values(data);
        parsed.sort((a, b) => b.elo - a.elo);
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
    <div className="max-w-4xl mx-auto p-4 md:p-8 relative z-10">
      
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-12">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center text-white mb-6 shadow-xl shadow-amber-500/20">
          <Trophy className="w-8 h-8" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
          Qlobal Reytinq Cədvəli
        </h1>
        <p className="text-zinc-400 font-medium max-w-lg">
          Bütün TDV oyunçuları arasında ən yüksək xal (Elo) toplayan ustalar. 
          Canlı yenilənir (Firebase).
        </p>
      </div>

      {loading ? (
        <div className="text-center text-zinc-500 font-bold animate-pulse">
          Yüklənir...
        </div>
      ) : players.length === 0 ? (
        <div className="text-center text-zinc-500 font-bold">
          Hələ heç bir oyunçu yoxdur.
        </div>
      ) : (
        <>
          
        {/* Sorting Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8 relative z-10">
          {(['elo', 'wins', 'coins', 'level'] as const).map(tab => (
            <button 
              key={tab} 
              onClick={() => setSortBy(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${sortBy === tab ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-zinc-900/80 text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
            >
              {tab === 'elo' && '🏆 Reytinq'}
              {tab === 'wins' && '⚔️ Qələbələr'}
              {tab === 'coins' && '🪙 Zənginlər'}
              {tab === 'level' && '📈 Səviyyə'}
            </button>
          ))}
        </div>

        {/* Top 3 Podium */}
          <div className="flex items-end justify-center gap-4 mb-12 h-48">
            {/* Rank 2 */}
            {players[1] && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="w-1/4 max-w-[140px] flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-zinc-800 border-2 border-zinc-500 flex items-center justify-center font-bold text-lg mb-2 relative text-white">
                  {players[1].displayName.charAt(0).toUpperCase()}
                  <div className="absolute -bottom-2 w-6 h-6 rounded-full bg-zinc-500 text-white text-[10px] flex items-center justify-center font-black border-2 border-zinc-950">2</div>
                </div>
                <div className="text-sm font-bold text-white truncate w-full text-center">{players[1].displayName}</div>
                <div className="text-xs text-zinc-400 mb-2">{players[1].elo}</div>
                <div className="w-full h-24 bg-gradient-to-t from-zinc-800/80 to-zinc-800/40 rounded-t-xl border-t border-zinc-700/50" />
              </motion.div>
            )}

            {/* Rank 1 */}
            {players[0] && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="w-1/4 max-w-[140px] flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center font-bold text-2xl text-amber-500 mb-2 relative">
                  {players[0].displayName.charAt(0).toUpperCase()}
                  <div className="absolute -bottom-3 w-8 h-8 rounded-full bg-amber-500 text-black text-[12px] flex items-center justify-center font-black border-2 border-zinc-950 shadow-lg shadow-amber-500/50">1</div>
                </div>
                <div className="text-sm font-bold text-amber-500 truncate w-full text-center">{players[0].displayName}</div>
                <div className="text-xs text-amber-500/80 mb-2 font-black">{players[0].elo}</div>
                <div className="w-full h-32 bg-gradient-to-t from-amber-500/20 to-amber-500/5 rounded-t-xl border-t border-amber-500/30" />
              </motion.div>
            )}

            {/* Rank 3 */}
            {players[2] && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="w-1/4 max-w-[140px] flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-orange-900/40 border-2 border-orange-700 flex items-center justify-center font-bold text-lg text-orange-600 mb-2 relative">
                  {players[2].displayName.charAt(0).toUpperCase()}
                  <div className="absolute -bottom-2 w-6 h-6 rounded-full bg-orange-700 text-white text-[10px] flex items-center justify-center font-black border-2 border-zinc-950">3</div>
                </div>
                <div className="text-sm font-bold text-white truncate w-full text-center">{players[2].displayName}</div>
                <div className="text-xs text-zinc-400 mb-2">{players[2].elo}</div>
                <div className="w-full h-20 bg-gradient-to-t from-zinc-800/80 to-zinc-800/40 rounded-t-xl border-t border-zinc-700/50" />
              </motion.div>
            )}
          </div>

          {/* List */}
          <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-zinc-800 text-xs font-bold text-zinc-500 uppercase tracking-widest">
              <div className="col-span-2 md:col-span-1 text-center">Sıra</div>
              <div className="col-span-6 md:col-span-5">İstifadəçi</div>
              <div className="col-span-4 md:col-span-3 text-right">Qələbə %</div>
              <div className="hidden md:block col-span-3 text-right">Elo Xalı</div>
            </div>
            
            {players.map((player, i) => (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                key={player.uid} 
                className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors items-center"
              >
                <div className="col-span-2 md:col-span-1 text-center font-black text-zinc-500">
                  #{player.rank}
                </div>
                <div className="col-span-6 md:col-span-5 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs \${
                    player.rank === 1 ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50' :
                    player.rank === 2 ? 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/50' :
                    player.rank === 3 ? 'bg-orange-700/20 text-orange-500 border border-orange-700/50' :
                    'bg-zinc-800 text-zinc-400'
                  }`}>
                    {player.displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-bold text-white text-sm truncate">{player.displayName}</span>
                </div>
                <div className="col-span-4 md:col-span-3 text-right text-sm text-zinc-300 font-medium">
                  {player.winRate}
                </div>
                <div className="hidden md:block col-span-3 text-right font-mono font-bold text-amber-400">
                  {player.elo}
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

