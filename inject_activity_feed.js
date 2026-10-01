const fs = require('fs');

// Create a new RecentFeed component
const feedCode = `'use client';

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
`;

fs.writeFileSync('src/components/RecentFeed.tsx', feedCode, 'utf8');

// 2. Inject activity feed writes into Chess after Elo update
// (We'll look for where elo update happens in chess page)
let c = fs.readFileSync('src/app/chess/page.tsx', 'utf8');

if (!c.includes('activity_feed')) {
  c = c.replace(/import \{ ref, get, set, remove, onValue, push, serverTimestamp, onDisconnect, update \} from 'firebase\/database';/,
    "import { ref, get, set, remove, onValue, push, serverTimestamp, onDisconnect, update } from 'firebase/database';");

  // After the Elo update block, add activity feed write
  const feedWrite = `
  const writeActivityFeed = async (winnerUid: string, loserUid: string) => {
    try {
      const [wSnap, lSnap] = await Promise.all([
        get(ref(db, \`users/\${winnerUid}\`)),
        get(ref(db, \`users/\${loserUid}\`))
      ]);
      const winner = wSnap.val();
      const loser = lSnap.val();
      await push(ref(db, 'activity_feed'), {
        winnerName: winner?.displayName || 'Oyunçu',
        loserName: loser?.displayName || 'Oyunçu',
        winnerAvatar: winner?.avatar || '😎',
        loserAvatar: loser?.avatar || '😎',
        game: 'chess',
        eloChange: 25,
        timestamp: Date.now()
      });
    } catch(e) {}
  };
  `;
  c = c.replace(/const writeActivityFeed[\s\S]*?};/, '');  // remove if already exists (idempotent)
  c = c.replace(/const resetGame = \(\) => \{/, feedWrite + '\n  const resetGame = () => {');

  // Call writeActivityFeed after Elo update
  c = c.replace(/await updateElo\(winnerId, loserId\);/, "await updateElo(winnerId, loserId);\n      await writeActivityFeed(winnerId, loserId);");

  fs.writeFileSync('src/app/chess/page.tsx', c, 'utf8');
}

// 3. Inject RecentFeed into homepage
let page = fs.readFileSync('src/app/page.tsx', 'utf8');
if (!page.includes('RecentFeed')) {
  page = page.replace(/import GlobalChat from '@\/components\/GlobalChat';/, "import GlobalChat from '@/components/GlobalChat';\nimport RecentFeed from '@/components/RecentFeed';");
  
  // Inject below GlobalChat in the layout
  page = page.replace(/<GlobalChat \/>/, "<GlobalChat />\n          <RecentFeed />");
  
  fs.writeFileSync('src/app/page.tsx', page, 'utf8');
}
