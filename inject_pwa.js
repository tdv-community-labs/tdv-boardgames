const fs = require('fs');

let c = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

if (!c.includes('beforeinstallprompt')) {
  // Add Download icon to imports
  c = c.replace(/import \{([^}]+)\} from 'lucide-react';/, (match, p1) => {
    return `import { ${p1}, Download } from 'lucide-react';`;
  });
  
  // Add state and effect
  const effectStr = `
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }
  }, []);
  
  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          setDeferredPrompt(null);
        }
      });
    }
  };
  `;
  c = c.replace(/useEffect\(\(\) => \{/, effectStr + '\n  useEffect(() => {');

  // Add Button in UI (if deferredPrompt is available)
  const btnUI = `
            {deferredPrompt && (
              <button 
                onClick={handleInstallClick} 
                className="hidden md:flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all shadow-lg hover:shadow-emerald-500/25 active:scale-95"
                title="Tətbiqi Yüklə"
              >
                <Download className="w-4 h-4" /> Yüklə
              </button>
            )}
  `;

  c = c.replace(/<button onClick=\{handleToggleMute\}/, btnUI + '\n            <button onClick={handleToggleMute}');

  fs.writeFileSync('src/components/Navbar.tsx', c, 'utf8');
}
