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

const DEFAULT_FEED: FeedItem[] = [
  { id: 'f-1', winnerName: 'Kiber_Qılınc', loserName: 'Murad_Master', game: 'chess', eloChange: 32, timestamp: Date.now() - 300000, winnerAvatar: '😎', loserAvatar: '🦁' },
  { id: 'f-2', winnerName: 'Tahir_Usta', loserName: 'Rəşad_99', game: 'checkers', eloChange: 25, timestamp: Date.now() - 720000, winnerAvatar: '🧙‍♂️', loserAvatar: '🥊' },
  { id: 'f-3', winnerName: 'Aysel_Chess', loserName: 'Elmir_TDV', game: 'chess', eloChange: 28, timestamp: Date.now() - 1200000, winnerAvatar: '👑', loserAvatar: '⚡' },
  { id: 'f-4', winnerName: 'Kiber_Sürət', loserName: 'Fərid_TDV', game: 'connect4', eloChange: 20, timestamp: Date.now() - 1900000, winnerAvatar: '⚡', loserAvatar: '🎮' },
  { id: 'f-5', winnerName: 'Orxan_BTL', loserName: 'Leyla_T', game: 'othello', eloChange: 30, timestamp: Date.now() - 2600000, winnerAvatar: '🦅', loserAvatar: '🎯' }
];

export default function RecentFeed() {
  const [items, setItems] = useState<FeedItem[]>(DEFAULT_FEED);

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

      <div className="pt-2 text-center text-[10px] text-zinc-600 font-mono flex items-center justify-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
        CANLI REYTİNQ QEYDİYYATI AKTİVDİR
      </div>
    </div>
  );
}
