const fs = require('fs');

let c = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

if (!c.includes('soundTheme')) {
  // Add imports
  c = c.replace(/import \{ isMuted, toggleMute \} from '@\/utils\/sounds';/, "import { isMuted, toggleMute, getSoundTheme, setSoundTheme } from '@/utils/sounds';");
  
  // Add state
  c = c.replace(/const \[muted, setMuted\] = useState\(false\);/, "const [muted, setMuted] = useState(false);\n  const [soundTheme, setSoundThemeState] = useState<'classic' | 'arcade' | 'zen'>('classic');");

  // Load state
  c = c.replace(/setMuted\(isMuted\(\)\);/, "setMuted(isMuted());\n    setSoundThemeState(getSoundTheme() as any);");

  // Add Cycle Function
  const cycleFn = `
  const cycleSoundTheme = () => {
    const themes: ('classic' | 'arcade' | 'zen')[] = ['classic', 'arcade', 'zen'];
    const nextIdx = (themes.indexOf(soundTheme) + 1) % themes.length;
    const nextTheme = themes[nextIdx];
    setSoundTheme(nextTheme);
    setSoundThemeState(nextTheme);
    
    // Play a test sound
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext || isMuted()) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      if (nextTheme === 'arcade') {
        osc.type = 'square'; osc.frequency.setValueAtTime(600, ctx.currentTime);
      } else if (nextTheme === 'zen') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(600, ctx.currentTime);
      } else {
        osc.type = 'sine'; osc.frequency.setValueAtTime(400, ctx.currentTime);
      }
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gainNode); gainNode.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.1);
    } catch(e){}
  };
  `;
  c = c.replace(/const handleToggleMute = \(\) => \{/, cycleFn + '\n  const handleToggleMute = () => {');

  // Add Button to UI
  const themeBtn = `
            <button 
              onClick={cycleSoundTheme} 
              className="p-2 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center text-zinc-400 hover:text-white"
              title="Səs Paketi"
            >
              {soundTheme === 'classic' ? '🎵' : soundTheme === 'arcade' ? '🕹️' : '🧘'}
            </button>
  `;
  c = c.replace(/<button onClick=\{handleToggleMute\}/, themeBtn + '\n            <button onClick={handleToggleMute}');

  fs.writeFileSync('src/components/Navbar.tsx', c, 'utf8');
}
