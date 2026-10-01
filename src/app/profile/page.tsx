'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Trophy, Swords, Target, Edit2, LogOut, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, updateProfile, signOut } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { getRank } from '@/utils/ranks';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({ elo: 1200, wins: 0, losses: 0, winRate: '0%' });
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        setNewName(u.displayName || '');
        const snap = await get(ref(db, `users/${u.uid}`));
        if (snap.exists()) {
          setStats(snap.val());
        }
      } else {
        router.push('/login');
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !user) return;
    try {
      await updateProfile(user, { displayName: newName.trim() });
      toast.success('Profil yeniləndi!');
      setIsEditing(false);
      setUser({ ...user, displayName: newName.trim() });
    } catch (err) {
      toast.error('Xəta baş verdi.');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Yüklənir...</div>;
  if (!user) return null;

  const totalMatches = (stats.wins || 0) + (stats.losses || 0);
  const rank = getRank(stats.elo || 1200);

  const BADGES = [
    { id: 'first_win', name: 'İlk Uğur', desc: 'İlk oyununuzu qazanın', icon: '🎯', unlocked: (stats.wins || 0) >= 1 },
    { id: 'veteran', name: 'Veteran', desc: '10-dan çox oyun oynayın', icon: '⚔️', unlocked: totalMatches >= 10 },
    { id: 'unstoppable', name: 'Məğlubedilməz', desc: '5 dəfə qalib gəlin', icon: '🔥', unlocked: (stats.wins || 0) >= 5 },
    { id: 'tactician', name: 'Taktik', desc: '20 dəfə qalib gəlin', icon: '🧠', unlocked: (stats.wins || 0) >= 20 },
    { id: 'rising_star', name: 'Parlayan Ulduz', desc: '1300 Elo-nu keçin', icon: '⭐', unlocked: (stats.elo || 1200) >= 1300 },
    { id: 'master', name: 'Böyük Usta', desc: '1600 Elo-nu keçin', icon: '👑', unlocked: (stats.elo || 1200) >= 1600 },
  ];
  
  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 pt-24 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition mb-8">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-bold uppercase tracking-widest">Geri Qayıt</span>
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Profile Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:col-span-1 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 backdrop-blur-xl flex flex-col items-center text-center"
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 p-1 mb-4">
              <div className="w-full h-full bg-zinc-950 rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-white" />
              </div>
            </div>
            
            {isEditing ? (
              <form onSubmit={handleUpdateName} className="w-full mb-4">
                <input 
                  type="text" 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)} 
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2 text-white mb-2 focus:outline-none focus:border-blue-500 text-center"
                  placeholder="Ləqəbiniz"
                />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-bold">Yadda saxla</button>
                  <button type="button" onClick={() => setIsEditing(false)} className="flex-1 bg-zinc-800 text-white rounded-lg py-2 text-sm font-bold">Ləğv et</button>
                </div>
              </form>
            ) : (
              <div className="mb-4">
                <h1 className="text-2xl font-black text-white flex items-center justify-center gap-2">
                  {user.displayName || 'Oyunçu'}
                  <button onClick={() => setIsEditing(true)} className="text-zinc-500 hover:text-white transition">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </h1>
                <p className="text-sm text-zinc-500 mt-1">{user.email}</p>
                <div className={`mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-950 border border-zinc-800 font-black text-sm ${rank.color}`}>
                  {rank.icon} {rank.name}
                </div>
              </div>
            )}

            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold transition mt-auto">
              <LogOut className="w-4 h-4" /> Hesabdan Çıx
            </button>
          </motion.div>

          {/* Stats Grid */}
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 backdrop-blur-xl flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Trophy className="w-24 h-24" /></div>
              <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-1">Qlobal Reytinq</h3>
              <div className="text-5xl font-black text-white">{stats.elo || 1200} <span className="text-xl text-yellow-500">Elo</span></div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 backdrop-blur-xl flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Target className="w-24 h-24" /></div>
              <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-1">Qələbə Faizi</h3>
              <div className="text-5xl font-black text-white">{stats.winRate || '0%'}</div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="sm:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between">
              <div className="flex items-center gap-4 mb-4 sm:mb-0">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                  <Swords className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Oynanılan Oyunlar</h3>
                  <div className="text-3xl font-black text-white">{totalMatches} Oyun</div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="text-2xl font-black text-emerald-500">{stats.wins || 0}</div>
                  <div className="text-xs font-bold text-zinc-500 uppercase">Qələbə</div>
                </div>
                <div className="w-px h-10 bg-zinc-800 my-auto" />
                <div className="text-center">
                  <div className="text-2xl font-black text-red-500">{stats.losses || 0}</div>
                  <div className="text-xs font-bold text-zinc-500 uppercase">Məğlubiyyət</div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Achievements Section */}
          <div className="md:col-span-3 mt-4">
            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
              🏆 Nailiyyətlər Nişanları
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {BADGES.map((badge: any) => (
                <div 
                  key={badge.id} 
                  className={`relative flex flex-col items-center text-center p-4 rounded-3xl border transition-all ${badge.unlocked ? 'bg-zinc-900/80 border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)]' : 'bg-zinc-950/50 border-zinc-900 opacity-50 grayscale'}`}
                >
                  <div className="text-4xl mb-2 filter drop-shadow-lg">{badge.icon}</div>
                  <div className={`text-sm font-bold mb-1 ${badge.unlocked ? 'text-yellow-400' : 'text-zinc-500'}`}>{badge.name}</div>
                  <div className="text-[10px] text-zinc-500 leading-tight">{badge.desc}</div>
                  
                  {!badge.unlocked && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] rounded-3xl flex items-center justify-center">
                      <span className="text-2xl opacity-30">🔒</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
  
        </div>
      </div>
    </div>
  );
}

