'use client';

import React, { useEffect, useState } from 'react';
import { ref, onValue, set, remove, get, push } from 'firebase/database';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, UserPlus, Check, Swords } from 'lucide-react';
import Link from 'next/link';

interface Notification {
  id: string;
  type: 'friend_request' | 'friend_accepted' | 'challenge';
  fromUid: string;
  fromName: string;
  fromAvatar?: string;
  game?: string;
  roomId?: string;
  timestamp: number;
  read?: boolean;
}

export default function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setUid(u.uid);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!uid) return;
    const nRef = ref(db, `notifications/${uid}`);
    const unsubN = onValue(nRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const parsed: Notification[] = Object.keys(data).map(k => ({ id: k, ...data[k] })).sort((a, b) => b.timestamp - a.timestamp);
        setNotifs(parsed);
        setUnreadCount(parsed.filter(n => !n.read).length);
      } else {
        setNotifs([]);
        setUnreadCount(0);
      }
    });
    return () => unsubN();
  }, [uid]);

  const markAllRead = () => {
    if (!uid) return;
    notifs.forEach(n => {
      if (!n.read) set(ref(db, `notifications/${uid}/${n.id}/read`), true);
    });
  };

  const dismiss = (id: string) => {
    if (!uid) return;
    remove(ref(db, `notifications/${uid}/${id}`));
  };

  const acceptFriend = async (n: Notification) => {
    if (!uid) return;
    // Add each other as friends
    await Promise.all([
      set(ref(db, `friends/${uid}/${n.fromUid}`), true),
      set(ref(db, `friends/${n.fromUid}/${uid}`), true)
    ]);
    // Notify the requester
    const mySnap = await get(ref(db, `users/${uid}`));
    const me = mySnap.val();
    await push(ref(db, `notifications/${n.fromUid}`), {
      type: 'friend_accepted',
      fromUid: uid,
      fromName: me?.displayName || 'Oyunçu',
      fromAvatar: me?.avatar || '😎',
      timestamp: Date.now()
    });
    dismiss(n.id);
  };

  const handleOpen = () => {
    setOpen(!open);
    if (!open) markAllRead();
  };

  if (!uid) return null;

  const GAME_NAMES: Record<string, string> = { chess: 'Şahmat', checkers: 'Dama', go: 'Qo', othello: 'Othello', connect4: 'Dördünü Birləşdir' };

  return (
    <div className="relative">
      <button onClick={handleOpen} className="relative p-2 rounded-full hover:bg-white/10 transition-colors text-zinc-400 hover:text-white">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 top-12 w-80 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                <span className="font-black text-white text-sm">Bildirişlər</span>
                {notifs.length > 0 && (
                  <button onClick={() => notifs.forEach(n => dismiss(n.id))} className="text-[10px] text-zinc-500 hover:text-zinc-300 uppercase tracking-widest">Hamısını sil</button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto">
                {notifs.length === 0 ? (
                  <div className="p-8 text-center text-zinc-600 text-sm italic">Heç bir bildiriş yoxdur</div>
                ) : (
                  notifs.map(n => (
                    <div key={n.id} className={`flex gap-3 p-4 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ${!n.read ? 'bg-blue-500/5' : ''}`}>
                      <div className="text-2xl flex-shrink-0">{n.fromAvatar || '😎'}</div>
                      <div className="flex-1 min-w-0">
                        {n.type === 'friend_request' && (
                          <>
                            <div className="text-sm text-white"><span className="font-bold">{n.fromName}</span> sizi dosta əlavə etmək istəyir</div>
                            <div className="flex gap-2 mt-2">
                              <button onClick={() => acceptFriend(n)} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-lg flex items-center gap-1"><Check className="w-3 h-3"/> Qəbul</button>
                              <button onClick={() => dismiss(n.id)} className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-black rounded-lg">Rədd</button>
                            </div>
                          </>
                        )}
                        {n.type === 'friend_accepted' && (
                          <div className="text-sm text-white"><span className="font-bold">{n.fromName}</span> dost sorğunuzu qəbul etdi! 🎉</div>
                        )}
                        {n.type === 'challenge' && (
                          <>
                            <div className="text-sm text-white"><span className="font-bold">{n.fromName}</span> sizi <span className="text-red-400 font-bold">{GAME_NAMES[n.game || ''] || n.game}</span> dueline çağırır!</div>
                            {n.roomId && n.game && (
                              <Link href={`/${n.game}?room=${n.roomId}`} onClick={() => dismiss(n.id)} className="mt-2 flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-lg w-fit">
                                <Swords className="w-3 h-3"/> Qəbul et
                              </Link>
                            )}
                          </>
                        )}
                        <div className="text-[10px] text-zinc-600 mt-1">{new Date(n.timestamp).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                      <button onClick={() => dismiss(n.id)} className="flex-shrink-0 text-zinc-700 hover:text-zinc-400 self-start mt-0.5"><X className="w-3 h-3"/></button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
