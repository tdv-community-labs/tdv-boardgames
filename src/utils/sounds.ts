// src/utils/sounds.ts

export const isMuted = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('tdv-muted') === 'true';
  }
  return false;
};

export const toggleMute = () => {
  if (typeof window !== 'undefined') {
    const muted = localStorage.getItem('tdv-muted') === 'true';
    localStorage.setItem('tdv-muted', (!muted).toString());
    return !muted;
  }
  return false;
};

export const getSoundTheme = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('tdv-sound-theme') || 'classic';
  }
  return 'classic';
};

export const setSoundTheme = (theme: 'classic' | 'arcade' | 'zen') => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('tdv-sound-theme', theme);
  }
};

/* ── Preloaded Audio Pool for zero-latency playback ── */
let moveAudioPool: HTMLAudioElement[] = [];
let captureAudioPool: HTMLAudioElement[] = [];
let checkAudioPool: HTMLAudioElement[] = [];
let audioPoolInitialized = false;

function initAudioPool() {
  if (typeof window === 'undefined' || audioPoolInitialized) return;
  try {
    for (let i = 0; i < 4; i++) {
      const m = new Audio('/sounds/move.wav');
      m.volume = 0.85;
      m.preload = 'auto';
      moveAudioPool.push(m);

      const c = new Audio('/sounds/capture.wav');
      c.volume = 0.9;
      c.preload = 'auto';
      captureAudioPool.push(c);

      const ch = new Audio('/sounds/check.wav');
      ch.volume = 0.8;
      ch.preload = 'auto';
      checkAudioPool.push(ch);
    }
    audioPoolInitialized = true;
  } catch (e) {
    // Audio element not supported
  }
}

let movePoolIdx = 0;
let capturePoolIdx = 0;
let checkPoolIdx = 0;

/* ── Shared Web Audio Context Fallback (Singleton) ── */
let sharedAudioCtx: AudioContext | null = null;
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!sharedAudioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        sharedAudioCtx = new AudioCtxClass();
      }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume();
    }
    return sharedAudioCtx;
  } catch (e) {
    return null;
  }
}

/* ── Play Move Sound ── */
export const playMoveSound = () => {
  if (isMuted()) return;
  initAudioPool();

  const theme = getSoundTheme();

  // If classic wooden theme, use high-fidelity acoustic wooden piece audio
  if (theme === 'classic') {
    if (moveAudioPool.length > 0) {
      try {
        const audio = moveAudioPool[movePoolIdx];
        movePoolIdx = (movePoolIdx + 1) % moveAudioPool.length;
        audio.currentTime = 0;
        const promise = audio.play();
        if (promise) {
          promise.catch(() => playSynthesizedMove());
        }
        return;
      } catch (e) {}
    }
    playSynthesizedMove();
    return;
  }

  // Synthesized Arcade or Zen themes
  playSynthesizedMove(theme);
};

/* ── Play Capture Sound ── */
export const playCaptureSound = () => {
  if (isMuted()) return;
  initAudioPool();

  const theme = getSoundTheme();

  if (theme === 'classic') {
    if (captureAudioPool.length > 0) {
      try {
        const audio = captureAudioPool[capturePoolIdx];
        capturePoolIdx = (capturePoolIdx + 1) % captureAudioPool.length;
        audio.currentTime = 0;
        const promise = audio.play();
        if (promise) {
          promise.catch(() => playSynthesizedCapture());
        }
        return;
      } catch (e) {}
    }
    playSynthesizedCapture();
    return;
  }

  playSynthesizedCapture(theme);
};

/* ── Play Check Sound ── */
export const playCheckSound = () => {
  if (isMuted()) return;
  initAudioPool();

  if (checkAudioPool.length > 0) {
    try {
      const audio = checkAudioPool[checkPoolIdx];
      checkPoolIdx = (checkPoolIdx + 1) % checkAudioPool.length;
      audio.currentTime = 0;
      const promise = audio.play();
      if (promise) {
        promise.catch(() => {});
      }
      return;
    } catch (e) {}
  }
};

/* ── Synthesizer Fallback ── */
function playSynthesizedMove(theme: string = 'classic') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (theme === 'arcade') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.setValueAtTime(800, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (theme === 'zen') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } else {
      // Acoustic wooden thud simulation via Web Audio
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(240, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    }
  } catch (e) {}
}

function playSynthesizedCapture(theme: string = 'classic') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (theme === 'arcade') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (theme === 'zen') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(392, ctx.currentTime); // G4
      osc.frequency.linearRampToValueAtTime(784, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.6, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    }
  } catch (e) {}
}
