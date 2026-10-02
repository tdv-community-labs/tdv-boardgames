'use client';
import { useEffect, useState, useRef } from 'react';

export default function GlobalUXEngine() {
  const [radioActive, setRadioActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioCtxRef = useRef<any>(null);
  const osc1Ref = useRef<any>(null);
  const osc2Ref = useRef<any>(null);
  const lfoRef = useRef<any>(null);
  const visualizerIntervalRef = useRef<any>(null);
  const widgetTimeoutRef = useRef<any>(null);
  const [heights, setHeights] = useState([4, 4, 4, 4, 4]);

  useEffect(() => {
    // 1. RIPPLE ENGINE
    const handleMouseDown = (e: MouseEvent) => {
      const target = (e.target as Element).closest('button, .glass-card, .ui-card, a');
      if (!target) return;
      
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
      if (konamiActivated) return;
      if (e.key === konamiCode[konamiIndex] || e.key.toLowerCase() === konamiCode[konamiIndex].toLowerCase()) {
        konamiIndex++;
        if (konamiIndex === konamiCode.length) {
          konamiActivated = true;
          activateMatrix();
        }
      } else {
        konamiIndex = 0;
      }
    };

    function activateMatrix() {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
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

    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);
    
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
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
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
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes tdvRippleAnim { to { transform: scale(4); opacity: 0; } }
        .tdv-glitch-text { position: relative; display: inline-block; }
        .tdv-glitch-text::before, .tdv-glitch-text::after { content: attr(data-text); position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0.8; pointer-events: none; }
        .tdv-glitch-text::before { left: 2px; text-shadow: -2px 0 #ff00c1; clip: rect(44px, 450px, 56px, 0); animation: tdvGlitchAnim 5s infinite linear alternate-reverse; }
        .tdv-glitch-text::after { left: -2px; text-shadow: -2px 0 #00fff9, 2px 2px #ff00c1; animation: tdvGlitchAnim2 5s infinite linear alternate-reverse; }
        @keyframes tdvGlitchAnim { 0% { clip: rect(10px, 9999px, 83px, 0); } 20% { clip: rect(48px, 9999px, 25px, 0); } 100% { clip: rect(1px, 9999px, 100px, 0); } }
        @keyframes tdvGlitchAnim2 { 0% { clip: rect(65px, 9999px, 100px, 0); } 20% { clip: rect(38px, 9999px, 85px, 0); } 100% { clip: rect(51px, 9999px, 30px, 0); } }
      `}} />
      
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
            <div key={i} className="w-1 bg-purple-500 rounded-sm shadow-[0_0_5px_#a855f7] transition-all duration-100" style={{ height: \`\${h}px\` }}></div>
          ))}
        </div>
        <div className="text-[11px] font-bold text-purple-200 tracking-wide whitespace-nowrap">
          TDV FM - Synthwave
        </div>
      </div>
    </>
  );
}
