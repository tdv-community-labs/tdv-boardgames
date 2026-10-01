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

export const playMoveSound = () => {
  if (isMuted()) return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    const theme = getSoundTheme();

    if (theme === 'arcade') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.setValueAtTime(800, ctx.currentTime + 0.05);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
    } else if (theme === 'zen') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
    } else {
      // Classic
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    }

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (theme === 'zen' ? 0.8 : 0.1));
  } catch (e) {}
};

export const playCaptureSound = () => {
  if (isMuted()) return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    const theme = getSoundTheme();

    if (theme === 'arcade') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
    } else if (theme === 'zen') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    } else {
      // Classic
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    }

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (theme === 'zen' ? 0.6 : 0.2));
  } catch (e) {}
};
