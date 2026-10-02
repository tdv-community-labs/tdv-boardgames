'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, Mail, Lock, User as UserIcon, ArrowRight, ScanLine, AlertCircle, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { ref, set } from 'firebase/database';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        router.push('/');
      } else {
        if (!displayName) {
          setError('Sistemə daxil olmaq üçün "Çağırış Adı" (Ləqəb) tələb olunur!');
          setLoading(false);
          return;
        }
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });
        await set(ref(db, `users/${userCredential.user.uid}`), {
          uid: userCredential.user.uid,
          displayName: displayName,
          elo: 1200,
          winRate: "0%",
          wins: 0,
          losses: 0,
          avatar: "😎",
          banner: "default"
        });
        router.push('/');
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') setError('Bu ID (e-poçt) artıq sistemdə mövcuddur.');
      else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') setError('Erişim Rədd Edildi. E-poçt və ya Şifrə yanlışdır.');
      else if (err.code === 'auth/weak-password') setError('Təhlükəsizlik xəbərdarlığı: Şifrə ən azı 6 simvol olmalıdır.');
      else setError('Bilinməyən sistem xətası. Yenidən cəhd edin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4 relative z-10 overflow-hidden">
      
      {/* Dynamic Cyber Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-black" />
        {/* Hexagon Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#00fff9 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-lg bg-zinc-950/80 backdrop-blur-3xl border border-cyan-900/50 rounded-3xl p-8 sm:p-10 shadow-[0_0_50px_rgba(6,182,212,0.1)] relative z-10 overflow-hidden"
      >
        {/* Cyberpunk Top Bar */}
        <div className="absolute top-0 inset-x-0 h-1 flex">
          <div className="h-full w-1/3 bg-cyan-500/80 shadow-[0_0_10px_#06b6d4]"></div>
          <div className="h-full w-2/3 bg-purple-500/80 shadow-[0_0_10px_#a855f7]"></div>
        </div>
        
        {/* Corner Decals */}
        <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-cyan-500/50" />
        <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-purple-500/50" />

        <div className="flex flex-col items-center mb-10 text-center">
          <motion.div 
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-20 h-20 bg-black border border-cyan-500/30 rounded-2xl flex items-center justify-center mb-6 relative group"
          >
            <div className="absolute inset-0 bg-cyan-500/20 blur-xl group-hover:bg-cyan-500/40 transition-colors" />
            <ScanLine className="w-10 h-10 text-cyan-400" />
          </motion.div>
          
          <h2 className="text-3xl font-black text-white tracking-tight uppercase">
            {isLogin ? 'Sistemə Giriş' : 'Yeni Agent'}
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
            <p className="text-cyan-500/70 text-xs font-mono tracking-widest">
              GÜVƏNLİ BAZA PROTOKOLU
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-500/50 flex items-center gap-3 overflow-hidden"
            >
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span className="text-red-400 text-sm font-bold">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form className="space-y-5 relative" onSubmit={handleSubmit}>
          {!isLogin && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <label className="text-[10px] font-black text-cyan-500/70 uppercase tracking-[0.2em] mb-2 block">Çağırış Adı</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input 
                  type="text" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Məsələn: Kiber_Qılınc" 
                  className="w-full bg-black border border-zinc-800 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-zinc-700 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono text-sm"
                  required={!isLogin}
                />
              </div>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <label className="text-[10px] font-black text-cyan-500/70 uppercase tracking-[0.2em] mb-2 block">Şəbəkə ID (E-poçt)</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agent@network.tdv" 
                className="w-full bg-black border border-zinc-800 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-zinc-700 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono text-sm"
                required 
              />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <label className="text-[10px] font-black text-cyan-500/70 uppercase tracking-[0.2em] mb-2 block">Məxfi Açar (Şifrə)</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full bg-black border border-zinc-800 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-zinc-700 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono text-sm"
                required 
                minLength={6}
              />
            </div>
          </motion.div>

          <motion.button 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            type="submit" 
            disabled={loading}
            className={`w-full py-4 mt-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black uppercase tracking-widest text-sm rounded-xl flex items-center justify-center gap-3 transition-all ${loading ? 'opacity-70 cursor-not-allowed' : 'shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:scale-[1.02] active:scale-95'}`}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                BAĞLANTI QURULUR...
              </>
            ) : (
              <>
                <Fingerprint className="w-5 h-5" />
                {isLogin ? 'SİSTEMƏ DAXİL OL' : 'KİMLİYİ TƏSDİQLƏ'}
              </>
            )}
          </motion.button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-zinc-800/50">
          <p className="text-zinc-500 text-sm font-medium">
            {isLogin ? 'TDV Şəbəkəsində yenisiniz?' : 'Artıq agent kodunuz var?'}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="ml-2 text-cyan-400 hover:text-cyan-300 font-bold hover:underline transition-all"
            >
              {isLogin ? 'Qeydiyyatdan Keç' : 'Giriş Et'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
