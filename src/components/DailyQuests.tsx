'use client';

import React, { useEffect, useState } from 'react';
import { ref, get, set, update } from 'firebase/database';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, CheckCircle2, Circle, Trophy } from 'lucide-react';
import { toast } from 'react-hot-toast';
import confetti from 'canvas-confetti';

interface Quest {
  id: string;
  title: string;
  desc: string;
  icon: string;
  target: number;
  reward: number;
  type: 'wins' | 'matches' | 'streak';
}

const DAILY_QUESTS: Quest[] = [
  { id: 'win_1',     title: '1 Qələbə',         desc: 'Bu gün 1 oyun qazan',          icon: '⚔️',  target: 1,  reward: 30,  type: 'wins' },
  { id: 'win_3',     title: 'Üçlü Zəfər',       desc: 'Bu gün 3 oyun qazan',          icon: '🏆',  target: 3,  reward: 80,  type: 'wins' },
  { id: 'match_5',   title: '5 Oyun',            desc: 'Bu gün 5 oyun oyna',           icon: '🎮',  target: 5,  reward: 50,  type: 'matches' },
  { id: 'streak_2',  title: 'İki Üstüstə',      desc: '2 oyunu üst-üstə qazan',       icon: '🔥',  target: 2,  reward: 100, type: 'streak' },
];

export default function DailyQuests() {
  const [uid, setUid] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [questData, setQuestData] = useState<any>({});
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { if (u) setUid(u.uid); });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!uid) return;
    const today = new Date().toDateString();
    get(ref(db, `users/${uid}`)).then(snap => {
      const data = snap.val() || {};
      setStreak(data.currentStreak || 0);
      
      // Initialize daily quests if new day
      if (!data.dailyQuestDate || data.dailyQuestDate !== today) {
        const freshQuests: any = {};
        DAILY_QUESTS.forEach(q => { freshQuests[q.id] = { progress: 0, claimed: false }; });
        update(ref(db, `users/${uid}`), { dailyQuestDate: today, dailyQuests: freshQuests });
        setQuestData(freshQuests);
      } else {
        setQuestData(data.dailyQuests || {});
      }
    });
  }, [uid]);

  const claimReward = async (quest: Quest) => {
    if (!uid) return;
    const snap = await get(ref(db, `users/${uid}`));
    const data = snap.val() || {};
    const current = data.dailyQuests?.[quest.id];
    if (!current || current.claimed || current.progress < quest.target) return;

    const newBonus = (data.bonusCoins || 0) + quest.reward;
    await update(ref(db, `users/${uid}`), {
      bonusCoins: newBonus,
      [`dailyQuests/${quest.id}/claimed`]: true
    });
    setQuestData((prev: any) => ({ ...prev, [quest.id]: { ...prev[quest.id], claimed: true } }));
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    toast.success(`+${quest.reward} 🪙 qazandınız!`);
  };

  if (!uid) return null;

  const totalCompleted = DAILY_QUESTS.filter(q => {
    const d = questData[q.id];
    return d && d.progress >= q.target;
  }).length;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex flex-col items-center group"
      >
        <div className="relative w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-2xl flex items-center justify-center group-hover:scale-110 transition-all">
          <Flame className="w-7 h-7 text-white" />
          {totalCompleted > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-emerald-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-zinc-950">
              {totalCompleted}
            </span>
          )}
        </div>
        <div className="mt-1 text-[10px] font-black text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity">
          {streak > 0 ? `🔥 ${streak} seriya` : 'Tapşırıqlar'}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }}
              className="relative w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-600/30 to-red-600/30 border-b border-orange-500/20 p-5 flex items-center justify-between">
                <div>
                  <h2 className="font-black text-white text-lg flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-400" /> Gündəlik Tapşırıqlar
                  </h2>
                  <p className="text-xs text-orange-400/70 mt-0.5">{totalCompleted}/{DAILY_QUESTS.length} tamamlandı</p>
                </div>
                {streak > 0 && (
                  <div className="flex flex-col items-center bg-orange-500/20 border border-orange-500/30 px-3 py-2 rounded-xl">
                    <span className="text-2xl">🔥</span>
                    <span className="text-orange-400 font-black text-sm">{streak} gün</span>
                    <span className="text-orange-500/70 text-[10px] uppercase tracking-widest">Seriya</span>
                  </div>
                )}
              </div>

              {/* Quests */}
              <div className="p-4 flex flex-col gap-3">
                {DAILY_QUESTS.map(quest => {
                  const d = questData[quest.id] || { progress: 0, claimed: false };
                  const progress = Math.min(d.progress || 0, quest.target);
                  const completed = progress >= quest.target;
                  const claimed = d.claimed;
                  const pct = (progress / quest.target) * 100;

                  return (
                    <div key={quest.id} className={`p-4 rounded-2xl border transition-all ${claimed ? 'bg-emerald-500/5 border-emerald-500/20' : completed ? 'bg-zinc-800/80 border-zinc-600' : 'bg-zinc-950 border-zinc-800'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <span className="text-2xl flex-shrink-0">{quest.icon}</span>
                          <div className="min-w-0">
                            <div className="font-black text-white text-sm">{quest.title}</div>
                            <div className="text-xs text-zinc-500">{quest.desc}</div>
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className="text-xs font-black text-yellow-400">+{quest.reward} 🪙</div>
                          {claimed ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-1 ml-auto" />
                          ) : completed ? (
                            <button
                              onClick={() => claimReward(quest)}
                              className="mt-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-lg transition-all active:scale-95"
                            >
                              Al!
                            </button>
                          ) : (
                            <Circle className="w-5 h-5 text-zinc-700 mt-1 ml-auto" />
                          )}
                        </div>
                      </div>
                      <div className="mt-2.5 w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                          className={`h-full rounded-full ${claimed ? 'bg-emerald-500' : completed ? 'bg-orange-500' : 'bg-zinc-600'}`}
                        />
                      </div>
                      <div className="text-[10px] text-zinc-600 mt-1">{progress}/{quest.target}</div>
                    </div>
                  );
                })}
              </div>

              <div className="px-4 pb-4">
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-center">
                  <p className="text-xs text-zinc-500">Tapşırıqlar hər gün yenilənir. Hər gün oynayaraq seriya rekordunuzu qoruyun! 🔥</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
