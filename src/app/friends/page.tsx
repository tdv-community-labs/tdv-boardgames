'use client';

import React, { useEffect, useState } from 'react';
import { ref, onValue, get, remove, push } from 'firebase/database';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { motion } from 'framer-motion';
import { Users, Swords, UserX, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { Navbar } from '@/components/Navbar';

interface Friend {
  uid: string;
  displayName: string;
  avatar?: string;
  elo?: number;
  online?: boolean;
  banner?: string;
}

const GAME_LIST = [
  { id: 'chess',    name: 'Şahmat',            icon: '♟️' },
  { id: 'checkers', name: 'Dama',              icon: '🔴' },
  { id: 'connect4', name: 'Dördünü Birləşdir', icon: '🟡' },
  { id: 'othello',  name: 'Othello',           icon: '⚪' },
  { id: 'go',       name: 'Qo',               icon: '⚫' },
];

const BANNER_STYLES: Record<string, string> = {
  default: 'bg-zinc-900 border-zinc-800',
  matrix:  'bg-gradient-to-br from-green-900/40 to-black border-green-500/40',
  galaxy:  'bg-gradient-to-br from-purple-900/40 via-blue-900/40 to-black border-purple-500/40',
  blood:   'bg-gradient-to-br from-red-900/40 to-black border-red-500/40',
  gold:    'bg-gradient-to-br from-yellow-900/40 to-black border-yellow-500/40',
};

export default function FriendsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [challengeMenu, setChallengeMenu] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const friendsRef = ref(db, `friends/${user.uid}`);
    const unsubFriends = onValue(friendsRef, async (snap) => {
      if (!snap.exists()) { setFriends([]); setLoading(false); return; }
      const uids = Object.keys(snap.val());
      const friendData = await Promise.all(uids.map(async uid => {
        const [uSnap, presSnap] = await Promise.all([
          get(ref(db, `users/${uid}`)),
          get(ref(db, `presence/${uid}`))
        ]);
        const data = uSnap.val() || {};
        return {
          uid,
          displayName: data.displayName || 'Oyunçu',
          avatar: data.avatar || '😎',
          elo: data.elo || 1200,
          banner: data.banner || 'default',
          online: presSnap.exists()
        };
      }));
      setFriends(friendData.sort((a, b) => Number(b.online) - Number(a.online)));
      setLoading(false);
    });
    return () => unsubFriends();
  }, [user]);

  const removeFriend = async (uid: string, name: string) => {
    if (!user || !confirm(`${name} dostlar siyahısından çıxarılsın?`)) return;
    await Promise.all([
      remove(ref(db, `friends/${user.uid}/${uid}`)),
      remove(ref(db, `friends/${uid}/${user.uid}`))
    ]);
    toast.success(`${name} dostlar siyahısından çıxarıldı`);
  };

  const challengeFriend = async (friend: Friend, game: string, gameName: string) => {
    if (!user) return;
    const newRoomRef = push(ref(db, `games/${game}`));
    const mySnap = await get(ref(db, `users/${user.uid}`));
    const me = mySnap.val();
    await push(ref(db, `notifications/${friend.uid}`), {
      type: 'challenge',
      fromUid: user.uid,
      fromName: me?.displayName || 'Oyunçu',
      fromAvatar: me?.avatar || '😎',
      game,
      roomId: newRoomRef.key,
      timestamp: Date.now()
    });
    setChallengeMenu(null);
    toast.success(`${friend.displayName}-ə ${gameName} dueli göndərildi! ⚔️`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-28 pb-16">
        <div className="flex items-center gap-3 mb-8">
          <Users className="w-6 h-6 text-blue-400" />
          <h1 className="text-2xl font-black text-white">Dostlarım</h1>
          <span className="ml-auto text-sm text-zinc-500">{friends.filter(f => f.online).length} onlayn / {friends.length} ümumi</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">👥</div>
            <h2 className="text-xl font-black text-white mb-2">Hələ dostunuz yoxdur</h2>
            <p className="text-zinc-500 text-sm mb-6">Liderlər Cədvəlindən oyunçulara dost sorğusu göndərin!</p>
            <Link href="/leaderboard" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-white transition">
              Liderlər Cədvəlinə Get →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {friends.map((friend, i) => (
              <motion.div
                key={friend.uid}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`tdv-card relative p-4 flex items-center gap-4 transition-all hover:scale-[1.01] ${BANNER_STYLES[friend.banner || 'default']}`}
              >
                {/* Avatar + online indicator */}
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-800/50 flex items-center justify-center text-3xl shadow-inner">
                    {friend.avatar}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-zinc-950 ${friend.online ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-black text-white truncate">{friend.displayName}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-zinc-400">🏆 {friend.elo}</span>
                    <span className={`text-[10px] font-bold flex items-center gap-1 ${friend.online ? 'text-emerald-400' : 'text-zinc-600'}`}>
                      {friend.online ? <><Wifi className="w-3 h-3"/>Onlayn</> : <><WifiOff className="w-3 h-3"/>Oflayn</>}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="relative">
                    <button
                      onClick={() => setChallengeMenu(challengeMenu === friend.uid ? null : friend.uid)}
                      disabled={!friend.online}
                      className="p-2.5 bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl transition-all active:scale-95"
                      title="Duel göndər"
                    >
                      <Swords className="w-4 h-4" />
                    </button>
                    {challengeMenu === friend.uid && (
                      <div className="absolute right-0 bottom-12 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-30 w-44">
                        {GAME_LIST.map(g => (
                          <button
                            key={g.id}
                            onClick={() => challengeFriend(friend, g.id, g.name)}
                            className="w-full px-4 py-2.5 hover:bg-zinc-800 text-left text-sm font-bold text-white flex items-center gap-2 transition-colors"
                          >
                            <span>{g.icon}</span> {g.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeFriend(friend.uid, friend.displayName)}
                    className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-500 hover:text-red-400 rounded-xl transition-all"
                    title="Dostlardan çıxar"
                  >
                    <UserX className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

