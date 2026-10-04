'use client';
import { useEffect, useState, useRef } from 'react';
import { uiAudio } from '@/utils/sfx';

export default function GlobalUXEngine() {
  const [radioActive, setRadioActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  
  const audioCtxRef = useRef<any>(null);
  const osc1Ref = useRef<any>(null);
  const osc2Ref = useRef<any>(null);
  const lfoRef = useRef<any>(null);
  const visualizerIntervalRef = useRef<any>(null);
  const widgetTimeoutRef = useRef<any>(null);
  const [heights, setHeights] = useState([4, 4, 4, 4, 4]);

  const cmdLinks = [
    { name: "Şahmat (Chess)", path: "/chess", icon: "♚" },
    { name: "Dama (Checkers)", path: "/checkers", icon: "⛃" },
    { name: "Dördünü Birləşdir (Connect4)", path: "/connect4", icon: "🔴" },
    { name: "Othello", path: "/othello", icon: "☯" },
    { name: "Qo (Go)", path: "/go", icon: "⚪" },
    { name: "Liderlər lövhəsi", path: "/leaderboard", icon: "🏆" },
    { name: "Profil", path: "/profile", icon: "👤" },
    { name: "Mərkəzi Hub", path: "https://tdv-community-hubs.vercel.app", icon: "🌌" },
    { name: "TDV Games", path: "https://tdv-games.vercel.app", icon: "🎮" },
    { name: "E-School", path: "https://tdv-e-school.vercel.app", icon: "📚" }
  ];

  useEffect(() => {
    // 1. RIPPLE ENGINE
    const handleMouseDown = (e: MouseEvent) => {
      const target = (e.target as Element).closest('button, .glass-card, .ui-card, a');
      if (!target) return;
      uiAudio.init();
      uiAudio.click();
      
      const el = target as HTMLElement;
      const style = window.getComputedStyle(el);
      if (style.position === 'static') {
        el.style.position = 'relative';
      }
      
      let container = el.querySelector('.tdv-ripple-container');
      if (!container) {
        container = document.createElement('div');
        container.className = 'tdv-ripple-container absolute inset-0 overflow-hidden rounded-inherit pointer-events-none z-0';
        el.appendChild(container);
      }
      
      const rect = el.getBoundingClientRect();
      const ripple = document.createElement('span');
      
      const diameter = Math.max(rect.width, rect.height);
      const radius = diameter / 2;
      
      ripple.style.position = 'absolute';
      ripple.style.borderRadius = '50%';
      ripple.style.transform = 'scale(0)';
      ripple.style.animation = 'tdvRippleAnim 0.6s linear';
      
      ripple.style.width = ripple.style.height = `${diameter}px`;
      ripple.style.left = `${e.clientX - rect.left - radius}px`;
      ripple.style.top = `${e.clientY - rect.top - radius}px`;
      
      if (el.classList.contains('bg-amber-600') || el.classList.contains('bg-purple-600')) {
        ripple.style.backgroundColor = 'rgba(255,255,255,0.4)';
      } else {
        ripple.style.backgroundColor = 'rgba(168,85,247,0.3)';
      }
      
      container.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    };

    // 2. GLITCH ENGINE
    const applyGlitch = () => {
      document.querySelectorAll('h1').forEach(h1 => {
        if (!h1.classList.contains('tdv-glitch-text') && h1.innerText.trim().length > 0) {
          h1.classList.add('tdv-glitch-text');
          h1.setAttribute('data-text', h1.innerText);
        }
      });
    };

    // 3. KONAMI CODE
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let konamiIndex = 0;
    let konamiActivated = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      // CMD PALETTE (Ctrl+K)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen(prev => !prev);
      }
      if (e.key === 'Escape') setCmdOpen(false);

      if (e.key === konamiCode[konamiIndex] || e.key.toLowerCase() === konamiCode[konamiIndex].toLowerCase()) {
        konamiIndex++;
        if (konamiIndex === konamiCode.length) {
          if (konamiActivated) {
            deactivateMatrix();
            konamiActivated = false;
          } else {
            activateMatrix();
            konamiActivated = true;
          }
          konamiIndex = 0;
        }
      } else {
        konamiIndex = 0;
      }
    };

    
    function deactivateMatrix() {
      const c = document.getElementById('tdv-matrix-canvas');
      if (c) {
        c.style.opacity = '0';
        setTimeout(() => c.remove(), 2000);
      }
    }

    function activateMatrix() {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const actx = new AudioContextClass();
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(50, actx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, actx.currentTime + 2);
        gain.gain.setValueAtTime(0, actx.currentTime);
        gain.gain.linearRampToValueAtTime(0.5, actx.currentTime + 1);
        gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 3);
        osc.connect(gain); gain.connect(actx.destination);
        osc.start(); osc.stop(actx.currentTime + 3);
      }

      const c = document.createElement('canvas');
        c.id = 'tdv-matrix-canvas';
      c.style.position = 'fixed';
      c.style.top = '0'; c.style.left = '0';
      c.style.width = '100vw'; c.style.height = '100vh';
      c.style.zIndex = '9999990';
      c.style.pointerEvents = 'none';
      c.style.opacity = '0';
      c.style.transition = 'opacity 2s ease';
      document.body.appendChild(c);
      
      setTimeout(() => c.style.opacity = '0.7', 100);

      const ctx = c.getContext('2d')!;
      c.width = window.innerWidth;
      c.height = window.innerHeight;

      const alphabet = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレゲゼデベペオォコソトノホモヨョロゴゾドボポヴッンABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const fontSize = 16;
      const columns = c.width / fontSize;
      const drops: number[] = [];
      for(let x = 0; x < columns; x++) drops[x] = 1;

      setInterval(() => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.fillStyle = '#0F0';
        ctx.font = fontSize + 'px monospace';

        for(let i = 0; i < drops.length; i++) {
          const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
          ctx.fillText(text, i * fontSize, drops[i] * fontSize);
          if(drops[i] * fontSize > c.height && Math.random() > 0.975) drops[i] = 0;
          drops[i]++;
        }
      }, 30);
    }

    // 4. MOUSE GLOW
    const handleMouseMove = (e: MouseEvent) => {
      const glow = document.getElementById('tdv-mouse-glow');
      if (glow) {
        glow.style.left = `${e.clientX}px`;
        glow.style.top = `${e.clientY}px`;
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousemove', handleMouseMove);
    
    applyGlitch();
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(m => {
        if(m.addedNodes.length) applyGlitch();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Initial show of radio
    setRadioActive(true);
    widgetTimeoutRef.current = setTimeout(() => setRadioActive(false), 3000);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousemove', handleMouseMove);
      observer.disconnect();
    };
  }, []);

  const handleRadioTriggerEnter = () => {
    setRadioActive(true);
    clearTimeout(widgetTimeoutRef.current);
  };

  const handleRadioLeave = () => {
    if (!isPlaying) {
      widgetTimeoutRef.current = setTimeout(() => setRadioActive(false), 2000);
    }
  };

  const toggleRadio = () => {
    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!isPlaying) {
      const actx = new AudioContextClass();
      audioCtxRef.current = actx;
      
      const osc1 = actx.createOscillator();
      const osc2 = actx.createOscillator();
      const lfo = actx.createOscillator();
      const filter = actx.createBiquadFilter();
      const gainNode = actx.createGain();
      
      osc1.type = 'sawtooth'; osc1.frequency.value = 55;
      osc2.type = 'square'; osc2.frequency.value = 55.5;
      lfo.type = 'sine'; lfo.frequency.value = 0.2;
      
      const lfoGain = actx.createGain();
      lfoGain.gain.value = 300;
      lfo.connect(lfoGain); lfoGain.connect(filter.detune);
      
      filter.type = 'lowpass'; filter.frequency.value = 400; filter.Q.value = 5;
      gainNode.gain.value = 0.05;
      
      osc1.connect(filter); osc2.connect(filter);
      filter.connect(gainNode); gainNode.connect(actx.destination);
      
      osc1.start(); osc2.start(); lfo.start();
      
      osc1Ref.current = osc1; osc2Ref.current = osc2; lfoRef.current = lfo;
      
      visualizerIntervalRef.current = setInterval(() => {
        setHeights([
          Math.random() * 16 + 4, Math.random() * 16 + 4, Math.random() * 16 + 4,
          Math.random() * 16 + 4, Math.random() * 16 + 4
        ]);
      }, 150);
      
      setIsPlaying(true);
    } else {
      if (osc1Ref.current) osc1Ref.current.stop();
      if (osc2Ref.current) osc2Ref.current.stop();
      if (lfoRef.current) lfoRef.current.stop();
      if (audioCtxRef.current) audioCtxRef.current.close();
      clearInterval(visualizerIntervalRef.current);
      setHeights([4, 4, 4, 4, 4]);
      setIsPlaying(false);
    }
  };

  return (
    <div>
      <style>{`
        @keyframes tdvRippleAnim { to { transform: scale(4); opacity: 0; } }
        .tdv-glitch-text { 
          text-shadow: 0 0 10px rgba(168, 85, 247, 0.4), 0 0 20px rgba(168, 85, 247, 0.2);
          animation: tdvNeonPulse 3s infinite alternate ease-in-out;
        }
        @keyframes tdvNeonPulse {
          0% { text-shadow: 0 0 5px rgba(168, 85, 247, 0.2), 0 0 10px rgba(168, 85, 247, 0.1); }
          100% { text-shadow: 0 0 10px rgba(168, 85, 247, 0.6), 0 0 20px rgba(168, 85, 247, 0.4), 0 0 30px rgba(168, 85, 247, 0.2); }
        }
        
        #tdv-mouse-glow {
          position: fixed;
          top: 0; left: 0;
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, rgba(0, 0, 0, 0) 70%);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
          z-index: -1;
          transition: width 0.3s, height 0.3s;
        }
      `}</style>
      
      <div id="tdv-mouse-glow"></div>
      
      <div 
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-40 h-3 z-[9999994] cursor-pointer"
        onMouseEnter={handleRadioTriggerEnter}
      ></div>
      
      <div 
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999995] bg-zinc-900/70 backdrop-blur-md border border-purple-500/20 rounded-full px-4 py-2 flex items-center gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(168,85,247,0.1)] transition-transform duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] ${radioActive ? 'translate-y-0' : 'translate-y-[100px]'}`}
        onMouseEnter={() => clearTimeout(widgetTimeoutRef.current)}
        onMouseLeave={handleRadioLeave}
      >
        <button 
          onClick={toggleRadio}
          className="w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/40 text-purple-300 flex items-center justify-center cursor-pointer transition-all hover:bg-purple-500 hover:text-white hover:scale-110 hover:shadow-[0_0_15px_#a855f7]"
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <div className="flex items-end gap-1 h-5">
          {heights.map((h, i) => (
            <div key={i} className="w-1 bg-purple-500 rounded-sm shadow-[0_0_5px_#a855f7] transition-all duration-100" style={{ height: `${h}px` }}></div>
          ))}
        </div>
        <div className="text-[11px] font-bold text-purple-200 tracking-wide whitespace-nowrap">
          TDV FM - Synthwave
        </div>
      </div>

                    {/* Cyber Command Palette (Terminal Override) */}
      {cmdOpen && (
        <div className="fixed inset-0 z-[9999999] flex items-start justify-center pt-[15vh] px-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setCmdOpen(false)}>
            {/* Background Grid */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#06b6d4 1px, transparent 1px), linear-gradient(90deg, #06b6d4 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
          </div>
          
          <div className="relative w-full max-w-3xl bg-zinc-950/90 backdrop-blur-2xl border-2 border-cyan-500/50 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.2)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Terminal Header */}
            <div className="bg-cyan-950/40 border-b-2 border-cyan-500/30 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                </div>
                <span className="text-cyan-500/80 text-xs font-mono tracking-[0.2em] uppercase font-black ml-2">SİSTEM TERMINALI</span>
              </div>
              <div className="flex gap-2">
                <span className="text-cyan-500/50 text-[10px] font-mono border border-cyan-500/30 px-2 py-0.5 rounded animate-pulse">CTRL+K</span>
                <span className="text-red-500/50 text-[10px] font-mono border border-red-500/30 px-2 py-0.5 rounded cursor-pointer hover:bg-red-500/20" onClick={() => setCmdOpen(false)}>ESC</span>
              </div>
            </div>

            {/* Input Area */}
            <div className="flex items-center px-6 py-6 border-b border-zinc-800/50 bg-black/50 relative">
              <span className="text-cyan-400 mr-4 font-mono text-2xl font-black">root@tdv:~#</span>
              <input 
                autoFocus
                type="text" 
                placeholder="_əmr və ya istiqamət daxil edin..." 
                className="w-full bg-transparent border-none outline-none text-white placeholder-zinc-700 text-2xl font-mono"
                value={cmdQuery}
                onChange={(e) => setCmdQuery(e.target.value)}
              />
              {/* Scanline overlay over input */}
              <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px]"></div>
            </div>

            {/* Results */}
            <div className="max-h-[50vh] overflow-y-auto p-4 custom-scrollbar bg-black/20">
              <div className="text-[10px] text-zinc-500 font-mono mb-3 px-2 uppercase tracking-widest">Aktiv Modullar:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {cmdLinks.filter(l => l.name.toLowerCase().includes(cmdQuery.toLowerCase())).map((link, i) => (
                  <a 
                    key={i} 
                    href={link.path}
                    onClick={() => setCmdOpen(false)}
                    className="group flex items-center gap-4 px-4 py-4 rounded-2xl bg-zinc-900/50 hover:bg-cyan-950/50 border border-transparent hover:border-cyan-500/30 transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-black border border-zinc-800 group-hover:border-cyan-500/50 flex items-center justify-center text-2xl shadow-lg group-hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all">
                      {link.icon}
                    </div>
                    <div>
                      <div className="font-bold text-zinc-200 group-hover:text-cyan-400 transition-colors text-lg">{link.name}</div>
                      <div className="text-[10px] text-zinc-600 font-mono mt-1 group-hover:text-cyan-600 transition-colors">&gt;&gt; EXECUTE_PROTOCOL</div>
                    </div>
                  </a>
                ))}
              </div>
              {cmdLinks.filter(l => l.name.toLowerCase().includes(cmdQuery.toLowerCase())).length === 0 && (
                <div className="py-12 flex flex-col items-center justify-center text-zinc-600">
                  <span className="text-4xl mb-2">📡</span>
                  <span className="font-mono text-sm uppercase tracking-widest">Təyinat Tapılmadı</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
