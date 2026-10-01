'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, Mail, ArrowRight, UserPlus, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
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
          setError('Ləqəb daxil etməlisiniz!');
          setLoading(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });
        router.push('/');
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') setError('Bu e-poçt artıq qeydiyyatdan keçib.');
      else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') setError('E-poçt və ya şifrə səhvdir.');
      else if (err.code === 'auth/weak-password') setError('Şifrə ən azı 6 simvol olmalıdır.');
      else setError('Xəta baş verdi. Zəhmət olmasa yenidən yoxlayın.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4 relative z-10">
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-zinc-900/50 backdrop-blur-2xl border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
      >
        {/* Glow effect */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px]" />
        
        <div className="relative z-10">
          <div className="w-12 h-12 bg-white text-black rounded-2xl flex items-center justify-center mb-6 shadow-xl">
            {isLogin ? <KeyRound className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
          </div>
          
          <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
            {isLogin ? 'Xoş Gəlmişsiniz' : 'Yeni Hesab Yarat'}
          </h2>
          <p className="text-zinc-400 text-sm font-medium mb-8">
            TDV İntellektual Liqasına qoşulmaq üçün {isLogin ? 'daxil olun' : 'qeydiyyatdan keçin'}.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/50 text-red-400 text-sm font-bold text-center">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {!isLogin && (
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1 block">İstifadəçi Adı (Ləqəb)</label>
                <input 
                  type="text" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Məsələn: Rəqib_Usta" 
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                  required={!isLogin}
                />
              </div>
            )}
            <div>
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1 block">E-Poçt Ünvanı</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="adiniz@example.com" 
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1 block">Şifrə</label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-bold rounded-xl py-3 mt-4 hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Daxil Ol' : 'Qeydiyyatdan Keç'}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
            <p className="text-sm text-zinc-400">
              {isLogin ? "Hesabınız yoxdur? " : "Artıq hesabınız var? "}
              <button 
                type="button"
                onClick={() => { setIsLogin(!isLogin); setError(''); }} 
                className="text-white font-bold hover:underline"
              >
                {isLogin ? 'Qeydiyyatdan keçin' : 'Daxil olun'}
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
