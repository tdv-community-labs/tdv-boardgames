const fs = require('fs');

// 1. Update Profile Page (Shop + Own Profile rendering)
let p = fs.readFileSync('src/app/profile/page.tsx', 'utf8');

if (!p.includes('BANNERS')) {
  // Add banner state
  p = p.replace(/const \[avatar, setAvatar\] = useState\('😎'\);/, "const [avatar, setAvatar] = useState('😎');\n  const [banner, setBanner] = useState('default');");

  // Load banner state
  p = p.replace(/if \(statsData\.avatar\) setAvatar\(statsData\.avatar\);/, "if (statsData.avatar) setAvatar(statsData.avatar);\n          if (statsData.banner) setBanner(statsData.banner);");

  // Define Banners
  const bannerLogic = `
  const BANNERS = [
    { id: 'default', name: 'Standart', style: 'bg-zinc-900 border-zinc-800', cost: 0 },
    { id: 'matrix', name: 'Matrix', style: 'bg-gradient-to-br from-green-900/50 to-black border-green-500/50', cost: 500 },
    { id: 'galaxy', name: 'Qalaktika', style: 'bg-gradient-to-br from-purple-900/50 via-blue-900/50 to-black border-purple-500/50', cost: 1000 },
    { id: 'blood', name: 'Qan Seli', style: 'bg-gradient-to-br from-red-900/50 to-black border-red-500/50', cost: 1500 },
    { id: 'gold', name: 'Kraliyet', style: 'bg-gradient-to-br from-yellow-900/50 via-amber-900/50 to-black border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.2)]', cost: 3000 }
  ];

  const handleBuyBanner = async (bannerId: string, cost: number) => {
    if (currentCoins >= cost) {
      if (confirm(\`Bu arxaplanı \${cost} 🪙 müqabilində almaq istədiyinizə əminsiniz?\`)) {
        await update(ref(db, \`users/\${user!.uid}\`), {
          spentCoins: (stats.spentCoins || 0) + cost,
          unlockedBanners: [...(stats.unlockedBanners || []), bannerId],
          banner: bannerId
        });
        setBanner(bannerId);
        toast.success('Arxaplan uğurla alındı!');
      }
    } else {
      toast.error('Kifayət qədər qəpiyiniz yoxdur!');
    }
  };
  `;
  p = p.replace(/const PREMIUM_AVATARS = \[/, bannerLogic + '\n  const PREMIUM_AVATARS = [');

  // Update Profile Card Background
  p = p.replace(/className="bg-zinc-900\/80 border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden"/, 
    `className={\`rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md border \${BANNERS.find(b => b.id === banner)?.style || 'bg-zinc-900/80 border-zinc-800'}\`}`);

  // Inject Banners Shop UI below Avatars Shop
  const bannersUI = `
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-left">Premium Arxaplanlar</label>
                  </div>
                  <div className="flex flex-col gap-2">
                    {BANNERS.map(b => {
                      if (b.id === 'default') return null;
                      const isUnlocked = (stats.unlockedBanners || []).includes(b.id);
                      return (
                        <div 
                          key={b.id} 
                          onClick={() => {
                            if (isUnlocked) {
                               update(ref(db, \`users/\${user!.uid}\`), { banner: b.id });
                               setBanner(b.id);
                            }
                            else handleBuyBanner(b.id, b.cost);
                          }}
                          className={\`w-full p-3 rounded-xl cursor-pointer transition-all border flex items-center justify-between \${b.style} \${banner === b.id ? 'ring-2 ring-white scale-[1.02]' : 'hover:scale-[1.01]'}\`}
                        >
                          <span className="font-bold text-white text-sm">{b.name}</span>
                          {!isUnlocked ? (
                            <span className="text-xs font-black text-yellow-400 bg-black/50 px-2 py-1 rounded-md">{b.cost} 🪙</span>
                          ) : (
                            <span className="text-xs font-black text-emerald-400 bg-black/50 px-2 py-1 rounded-md">Mənimdir</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
  `;
  p = p.replace(/<\/div>\n\s*<\/div>\n\s*<\/form>/, '</div>\n                </div>\n' + bannersUI + '\n              </form>');

  fs.writeFileSync('src/app/profile/page.tsx', p, 'utf8');
}

// 2. Update Leaderboard Public Profiles to use the banner!
let l = fs.readFileSync('src/app/leaderboard/page.tsx', 'utf8');
if (!l.includes('BANNERS')) {
  // Add Banners definition inside the modal render
  const lBanners = `
              {(() => {
                const BANNERS = {
                  default: 'bg-zinc-900 border-zinc-700',
                  matrix: 'bg-gradient-to-br from-green-900/80 to-black border-green-500',
                  galaxy: 'bg-gradient-to-br from-purple-900/80 via-blue-900/80 to-black border-purple-500',
                  blood: 'bg-gradient-to-br from-red-900/80 to-black border-red-500',
                  gold: 'bg-gradient-to-br from-yellow-900/80 via-amber-900/80 to-black border-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.3)]'
                };
                const userStyle = BANNERS[(selectedUser.banner as keyof typeof BANNERS)] || BANNERS.default;
                return (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className={\`relative w-full max-w-md p-8 rounded-3xl shadow-2xl flex flex-col items-center border \${userStyle}\`}
                  >
  `;
  l = l.replace(/<motion\.div\s*initial=\{\{ opacity: 0, scale: 0\.9, y: 20 \}\}[\s\S]*?className="relative w-full max-w-md bg-zinc-900 border border-zinc-700 p-8 rounded-3xl shadow-2xl flex flex-col items-center"\s*>/, lBanners);
  
  l = l.replace(/<\/div>\n\s*\{\/\* Top 3 Podium \*\/\}/, '  })();\n              </div>\n        {/* Top 3 Podium */}');
  // Wait, the regex above for the end of motion.div is wrong. I need to close the `})()`!
  // I will just replace the exact motion.div and add the closing tag after `</motion.div>`.
  
  l = fs.readFileSync('src/app/leaderboard/page.tsx', 'utf8');
  
  l = l.replace(/<motion\.div \n\s*initial=\{\{ opacity: 0, scale: 0\.9, y: 20 \}\}[\s\S]*?className="relative w-full max-w-md bg-zinc-900 border border-zinc-700 p-8 rounded-3xl shadow-2xl flex flex-col items-center"\n\s*>/, 
    `{(() => {
                const BANNERS: Record<string, string> = {
                  default: 'bg-zinc-900 border-zinc-700',
                  matrix: 'bg-gradient-to-br from-green-900/80 to-black border-green-500',
                  galaxy: 'bg-gradient-to-br from-purple-900/80 via-blue-900/80 to-black border-purple-500',
                  blood: 'bg-gradient-to-br from-red-900/80 to-black border-red-500',
                  gold: 'bg-gradient-to-br from-yellow-900/80 via-amber-900/80 to-black border-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.3)]'
                };
                const userStyle = BANNERS[selectedUser.banner] || BANNERS.default;
                return (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className={\`relative w-full max-w-md p-8 rounded-3xl shadow-2xl flex flex-col items-center border \${userStyle}\`}
                  >`);
                  
  l = l.replace(/<\/motion\.div>\n\s*<\/div>\n\s*\)\}\n\s*<\/AnimatePresence>/, 
    `</motion.div>\n                );\n              })()}\n          </div>\n        )}\n      </AnimatePresence>`);

  fs.writeFileSync('src/app/leaderboard/page.tsx', l, 'utf8');
}
