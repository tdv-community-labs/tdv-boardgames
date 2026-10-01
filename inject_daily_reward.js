const fs = require('fs');

// 1. Update Profile coins formula
let p = fs.readFileSync('src/app/profile/page.tsx', 'utf8');
p = p.replace(/const totalCoins = \(\(stats\.wins \|\| 0\) \* 15\) \+ \(\(stats\.losses \|\| 0\) \* 2\);/, "const totalCoins = ((stats.wins || 0) * 15) + ((stats.losses || 0) * 2) + (stats.bonusCoins || 0);");
fs.writeFileSync('src/app/profile/page.tsx', p, 'utf8');

// 2. Update Leaderboard coins formula
let l = fs.readFileSync('src/app/leaderboard/page.tsx', 'utf8');
l = l.replace(/const totalCoins = \(\(u\.wins \|\| 0\) \* 15\) \+ \(\(u\.losses \|\| 0\) \* 2\);/, "const totalCoins = ((u.wins || 0) * 15) + ((u.losses || 0) * 2) + (u.bonusCoins || 0);");
fs.writeFileSync('src/app/leaderboard/page.tsx', l, 'utf8');

// 3. Update Navbar coins formula and inject Daily Reward Modal
let n = fs.readFileSync('src/components/Navbar.tsx', 'utf8');
n = n.replace(/const totalCoins = \(\(snap\.val\(\)\.wins \|\| 0\) \* 15\) \+ \(\(snap\.val\(\)\.losses \|\| 0\) \* 2\);/, "const totalCoins = ((snap.val().wins || 0) * 15) + ((snap.val().losses || 0) * 2) + (snap.val().bonusCoins || 0);");

// Inject imports
n = n.replace(/import \{ auth, db \} from '@\/lib\/firebase';/, "import { auth, db } from '@/lib/firebase';\nimport { motion, AnimatePresence } from 'framer-motion';\nimport confetti from 'canvas-confetti';\nimport { toast } from 'react-hot-toast';");

// Inject Daily Reward logic in Navbar
const rewardState = `
  const [showDailyReward, setShowDailyReward] = useState(false);

  useEffect(() => {
    if (user) {
      const today = new Date().toDateString();
      const lastReward = localStorage.getItem('tdv-last-reward');
      if (lastReward !== today) {
        setTimeout(() => setShowDailyReward(true), 1500); // show shortly after load
      }
    }
  }, [user]);

  const claimDailyReward = async () => {
    if (!user) return;
    try {
      const snap = await get(ref(db, \`users/\${user.uid}\`));
      const currentBonus = snap.val()?.bonusCoins || 0;
      await set(ref(db, \`users/\${user.uid}/bonusCoins\`), currentBonus + 50);
      localStorage.setItem('tdv-last-reward', new Date().toDateString());
      setShowDailyReward(false);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      toast.success('Gündəlik mükafat alındı! +50 🪙');
    } catch(e){}
  };
`;
n = n.replace(/const \[soundTheme, setSoundThemeState\] = useState\<'classic' \| 'arcade' \| 'zen'\>\('classic'\);/, "const [soundTheme, setSoundThemeState] = useState<'classic' | 'arcade' | 'zen'>('classic');\n" + rewardState);

// Inject Daily Reward UI inside Navbar render (before <header>)
const rewardUI = `
      <AnimatePresence>
        {showDailyReward && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-zinc-900 border border-yellow-500/30 p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center"
            >
              <div className="text-6xl mb-4 drop-shadow-lg">🎁</div>
              <h2 className="text-2xl font-black text-white mb-2">Gündəlik Mükafat</h2>
              <p className="text-zinc-400 text-sm mb-6">Bu gün üçün hədiyyəniz hazırdır! Hər gün sayta daxil olaraq pulsuz qəpiklər qazanın.</p>
              
              <div className="bg-yellow-500/10 border border-yellow-500/20 px-6 py-4 rounded-2xl mb-6 w-full">
                <div className="text-4xl font-black text-yellow-400 mb-1">+50 🪙</div>
                <div className="text-xs font-bold text-yellow-500/50 uppercase tracking-widest">TDV Coins</div>
              </div>

              <button 
                onClick={claimDailyReward}
                className="w-full py-4 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-white font-black rounded-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-95"
              >
                Mükafatı Götür
              </button>
              <button 
                onClick={() => setShowDailyReward(false)}
                className="mt-4 text-xs font-bold text-zinc-500 hover:text-zinc-400 uppercase tracking-widest"
              >
                Bağla
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
`;
n = n.replace(/return \(\n\s*<header/, rewardUI + '\n    return (\n      <header');

fs.writeFileSync('src/components/Navbar.tsx', n, 'utf8');
