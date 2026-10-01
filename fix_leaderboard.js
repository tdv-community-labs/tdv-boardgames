const fs = require('fs');

let c = fs.readFileSync('src/app/leaderboard/page.tsx', 'utf8');

if (!c.includes('canvas-confetti')) {
  // Add imports
  c = c.replace(/import \{ ref, onValue \} from 'firebase\/database';/, "import { ref, onValue } from 'firebase/database';\nimport { getRank } from '@/utils/ranks';\nimport confetti from 'canvas-confetti';");
  
  // Add confetti
  const confettiLogic = `
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#fbbf24', '#f59e0b', '#d97706']
        });
      }, 500);
    }
  }, []);
  `;
  c = c.replace(/useEffect\(\(\) => \{/, confettiLogic + '\n  useEffect(() => {');
  
  // Inject getRank rendering
  if (c.includes('<div className="font-bold text-white text-lg">{u.displayName}</div>')) {
     c = c.replace(/<div className="font-bold text-white text-lg">\{u.displayName\}<\/div>/g, `{(() => { const r = getRank(u.elo || 1200); return <div className="flex flex-col"><div className="font-bold text-white text-lg flex items-center gap-2">{u.displayName} <span title={r.name} className="text-sm">{r.icon}</span></div><div className={\`text-xs font-black uppercase tracking-widest \${r.color}\`}>{r.name}</div></div>; })()}`);
  }

  if (c.includes('<div className="font-bold text-white truncate px-2">{u.displayName}</div>')) {
     c = c.replace(/<div className="font-bold text-white truncate px-2">\{u.displayName\}<\/div>/g, `{(() => { const r = getRank(u.elo || 1200); return <div className="font-bold text-white truncate px-2 flex items-center justify-center gap-1">{u.displayName} <span title={r.name} className="text-xs">{r.icon}</span></div>; })()}`);
  }

  fs.writeFileSync('src/app/leaderboard/page.tsx', c, 'utf8');
}
