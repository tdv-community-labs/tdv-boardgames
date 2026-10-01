'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, XCircle, Minus, RefreshCcw, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface EndGameModalProps {
  isOpen: boolean;
  result: 'win' | 'loss' | 'draw' | null;
  onRematch: () => void;
}

export default function EndGameModal({ isOpen, result, onRematch }: EndGameModalProps) {
  if (!isOpen || !result) return null;

  const config = {
    win: { title: 'Qələbə!', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: Trophy, message: '+25 Elo qazandınız' },
    loss: { title: 'Məğlubiyyət', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: XCircle, message: '-25 Elo itirdiniz' },
    draw: { title: 'Heç-heçə', color: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/30', icon: Minus, message: 'Xallar dəyişmədi' }
  }[result];

  const Icon = config.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
        
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }} 
          animate={{ scale: 1, opacity: 1, y: 0 }} 
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className={`relative w-full max-w-sm rounded-3xl border ${config.border} ${config.bg} p-8 backdrop-blur-xl flex flex-col items-center text-center shadow-2xl`}
        >
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 border ${config.border} bg-black/50 shadow-lg`}>
            <Icon className={`w-10 h-10 ${config.color}`} />
          </div>
          
          <h2 className={`text-4xl font-black mb-2 ${config.color}`}>{config.title}</h2>
          <p className="text-zinc-300 font-bold mb-8">{config.message}</p>
          
          <div className="flex flex-col gap-3 w-full">
            <button onClick={onRematch} className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition bg-white text-black hover:scale-105 active:scale-95`}>
              <RefreshCcw className="w-5 h-5" /> Yenidən Oyna
            </button>
            <Link href="/" className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition bg-zinc-900 border border-zinc-700 text-white hover:bg-zinc-800">
              <ArrowRight className="w-4 h-4" /> Əsas Səhifə
            </Link>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

