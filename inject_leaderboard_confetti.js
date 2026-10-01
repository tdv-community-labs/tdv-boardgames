const fs = require('fs');

let c = fs.readFileSync('src/app/leaderboard/page.tsx', 'utf8');

if (!c.includes('canvas-confetti')) {
  // Add import
  c = c.replace(/import \{ getRank \} from '@\/utils\/ranks';/, "import { getRank } from '@/utils/ranks';\nimport confetti from 'canvas-confetti';");

  // Fire confetti on load
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

  fs.writeFileSync('src/app/leaderboard/page.tsx', c, 'utf8');
}
