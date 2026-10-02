import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VsScreenProps {
  show: boolean;
  player1Name: string;
  player2Name: string;
  player1Avatar?: string;
  player2Avatar?: string;
  onComplete: () => void;
}

export default function VsScreen({ show, player1Name, player2Name, player1Avatar = "😎", player2Avatar = "🤖", onComplete }: VsScreenProps) {
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    if (show) {
      // Trigger glitch effects randomly during the VS screen
      const i1 = setInterval(() => setGlitch(true), 800);
      const i2 = setInterval(() => setGlitch(false), 950);
      
      const timeout = setTimeout(() => {
        onComplete();
      }, 3500); // 3.5 seconds epic animation
      
      return () => {
        clearInterval(i1);
        clearInterval(i2);
        clearTimeout(timeout);
      };
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[9999999] flex items-center justify-center bg-black overflow-hidden pointer-events-none"
        >
          {/* Cyberpunk Grid Background */}
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#06b6d4 1px, transparent 1px), linear-gradient(90deg, #06b6d4 1px, transparent 1px)', backgroundSize: '50px 50px', transform: 'perspective(500px) rotateX(60deg) translateY(-100px) translateZ(-200px)', animation: 'gridMove 5s linear infinite' }}></div>
          <style>{`@keyframes gridMove { from { background-position: 0 0; } to { background-position: 0 50px; } }`}</style>
          
          {/* Scanning Laser */}
          <motion.div 
            initial={{ top: "-10%" }}
            animate={{ top: "110%" }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-1 bg-cyan-400 shadow-[0_0_20px_#22d3ee] z-0"
          />

          <div className="relative z-10 w-full max-w-6xl flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 px-4">
            
            {/* Player 1 */}
            <motion.div
              initial={{ x: -300, opacity: 0, skewX: -10 }}
              animate={{ x: 0, opacity: 1, skewX: 0 }}
              transition={{ type: "spring", damping: 12, delay: 0.1 }}
              className="flex flex-col items-center"
            >
              <div className="w-32 h-32 md:w-48 md:h-48 rounded-3xl bg-blue-900/40 border-4 border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.5)] flex items-center justify-center text-6xl md:text-8xl mb-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-500/20 mix-blend-overlay"></div>
                {player1Avatar}
              </div>
              <div className={`text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-cyan-200 uppercase tracking-widest ${glitch ? 'translate-x-1' : ''}`}>
                {player1Name}
              </div>
              <div className="text-blue-500 font-mono tracking-[0.3em] mt-2 text-sm md:text-base">GÖY KOMANDA</div>
            </motion.div>

            {/* VS Badge */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", bounce: 0.5, delay: 0.6 }}
              className="relative z-20 flex-shrink-0"
            >
              <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full bg-zinc-950 border-4 border-yellow-500 flex items-center justify-center shadow-[0_0_60px_#eab308] ${glitch ? 'scale-110 blur-[1px]' : ''} transition-all`}>
                <span className="text-4xl md:text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 to-red-600">VS</span>
              </div>
              <div className="absolute inset-0 rounded-full border border-yellow-300 animate-ping opacity-50"></div>
            </motion.div>

            {/* Player 2 */}
            <motion.div
              initial={{ x: 300, opacity: 0, skewX: 10 }}
              animate={{ x: 0, opacity: 1, skewX: 0 }}
              transition={{ type: "spring", damping: 12, delay: 0.3 }}
              className="flex flex-col items-center"
            >
              <div className="w-32 h-32 md:w-48 md:h-48 rounded-3xl bg-red-900/40 border-4 border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.5)] flex items-center justify-center text-6xl md:text-8xl mb-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-red-500/20 mix-blend-overlay"></div>
                {player2Avatar}
              </div>
              <div className={`text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-red-400 to-orange-200 uppercase tracking-widest ${glitch ? '-translate-x-1' : ''}`}>
                {player2Name}
              </div>
              <div className="text-red-500 font-mono tracking-[0.3em] mt-2 text-sm md:text-base">QIRMIZI KOMANDA</div>
            </motion.div>

          </div>

          {/* Glitch Overlay Effect */}
          {glitch && (
            <div className="absolute inset-0 mix-blend-difference pointer-events-none opacity-30">
              <div className="w-full h-2 bg-white absolute top-1/4"></div>
              <div className="w-full h-1 bg-white absolute top-1/2"></div>
              <div className="w-full h-4 bg-white absolute bottom-1/3"></div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
