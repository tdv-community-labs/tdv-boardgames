'use client';

import React, { useEffect, useState } from 'react';
import { ref, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { db } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';

interface FeedItem {
  id: string;
  winnerName: string;
  loserName: string;
  game: string;
  eloChange: number;
  timestamp: number;
  winnerAvatar?: string;
  loserAvatar?: string;
}

const GAME_ICONS: Record<string, string> = {
  chess: '♟️',
  checkers: '🔴',
  go: '⚫',
  othello: '⚪',
  connect4: '🟡'
};

const GAME_NAMES: Record<string, string> = {
  chess: 'Şahmat',
  checkers: 'Dama',
  go: 'Qo',
  othello: 'Othello',
  connect4: 'Dördünü Birləşdir'
};

export default function RecentFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);

  useEffect(() => {
    const feedRef = query(ref(db, 'activity_feed'), orderByChild('timestamp'), limitToLast(8));
    const unsub = onValue(feedRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const parsed: FeedItem[] = Object.keys(data).map(k => ({ id: k, ...data[k] }));
        setItems(parsed.reverse());
      }
    });
    return () => unsub();
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="w-full max-w-md mx-auto">
      <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        Canlı Nəticə Lenti
      </h3>
      <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20, height: 0 }}
              animate={{ opacity: 1, x: 0, height: 'auto' }}
              exit={{ opacity: 0, x: 20, height: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800 px-4 py-2.5 rounded-xl text-sm backdrop-blur-md"
            >
              <span className="text-xl flex-shrink-0">{GAME_ICONS[item.game] || '🎮'}</span>
              <div className="flex-1 min-w-0">
                <span className="font-black text-white">{item.winnerAvatar || '😎'} {item.winnerName}</span>
                <span className="text-zinc-500 mx-1">→</span>
                <span className="text-zinc-400">{item.loserAvatar || '😎'} {item.loserName}</span>
                <span className="text-zinc-600 ml-1 text-xs">{GAME_NAMES[item.game]}</span>
              </div>
              <span className="text-emerald-400 font-black flex-shrink-0 text-xs">+{item.eloChange || 25}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
