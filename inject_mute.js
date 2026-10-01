const fs = require('fs');

let c = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

if (!c.includes('toggleMute')) {
  // Add imports
  c = c.replace(/import \{([^}]+)\} from 'lucide-react';/, (match, p1) => {
    return `import { ${p1}, Volume2, VolumeX } from 'lucide-react';`;
  });
  
  // Add state and effect
  c = c.replace(/const \[isFullscreen, setIsFullscreen\] = useState\(false\);/, `const [isFullscreen, setIsFullscreen] = useState(false);\n  const [isMutedState, setIsMutedState] = useState(false);\n  useEffect(() => { if (typeof window !== 'undefined') setIsMutedState(localStorage.getItem('tdv-muted') === 'true'); }, []);`);

  // Add toggle function
  c = c.replace(/const toggleFullscreen = \(\) => \{/, `const handleToggleMute = () => {\n    const muted = localStorage.getItem('tdv-muted') === 'true';\n    localStorage.setItem('tdv-muted', (!muted).toString());\n    setIsMutedState(!muted);\n  };\n\n  const toggleFullscreen = () => {`);

  // Add button in UI
  const btnStr = `<button \n              onClick={toggleFullscreen}`;
  c = c.replace(btnStr, `<button onClick={handleToggleMute} className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors hidden sm:block" title="Səs">
              {isMutedState ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>\n            <button \n              onClick={toggleFullscreen}`);

  fs.writeFileSync('src/components/Navbar.tsx', c, 'utf8');
}
