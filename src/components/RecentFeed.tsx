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

const DEFAULT_FEED: FeedItem[] = [];

export default function RecentFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);

  useEffect(() => {
    try {
      const feedRef = query(ref(db, 'activity_feed'), orderByChild('timestamp'), limitToLast(8));
      const unsub = onValue(feedRef, (snap) => {
        if (snap.exists()) {
          const data = snap.val();
          const parsed: FeedItem[] = Object.keys(data).map(k => ({ id: k, ...data[k] }));
          if (parsed.length > 0) {
            setItems(parsed.reverse());
          }
        }
      }, () => {});
      return () => unsub();
    } catch (e) {}
  }, []);

  return (
    <div className="w-full h-full flex flex-col justify-between overflow-hidden">
      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-zinc-500 my-auto">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl mb-3 text-emerald-400">
            ⚔️
          </div>
          <p className="text-xs font-bold text-zinc-300">Hələlik oyun qeydi yoxdur</p>
          <p className="text-[10px] text-zinc-500 mt-1 max-w-[200px] leading-relaxed">
            Real duellər və ya turnir oyunları başa çatdıqda nəticələr burada canlı görünəcək.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar max-h-[350px] pr-1">
          <AnimatePresence initial={false}>
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800/80 px-3.5 py-2.5 rounded-2xl text-xs backdrop-blur-md hover:border-emerald-500/40 transition-colors"
              >
                <span className="text-xl flex-shrink-0">{GAME_ICONS[item.game] || '🎮'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-black text-white">{item.winnerAvatar || '😎'} {item.winnerName}</span>
                    <span className="text-emerald-400 font-bold">qələbə</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                    Məğlub: {item.loserAvatar || '👤'} {item.loserName} • {GAME_NAMES[item.game] || item.game}
                  </div>
                </div>
                <span className="text-emerald-400 font-black flex-shrink-0 text-xs px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  +{item.eloChange || 25}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <div className="pt-2 text-center text-[10px] text-zinc-600 font-mono flex items-center justify-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
        CANLI REYTİNQ QEYDİYYATI AKTİVDİR
      </div>
    </div>
  );
}
