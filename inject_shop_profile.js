const fs = require('fs');

let c = fs.readFileSync('src/app/profile/page.tsx', 'utf8');

if (!c.includes('🪙')) {
  // Add Coins calculation logic
  const coinsLogic = `
  const totalCoins = ((stats.wins || 0) * 15) + ((stats.losses || 0) * 2);
  const currentCoins = totalCoins - (stats.spentCoins || 0);
  const unlockedAvatars = stats.unlockedAvatars || [];
  
  const PREMIUM_AVATARS = [
    { icon: '💎', cost: 100 },
    { icon: '🚀', cost: 200 },
    { icon: '🔥', cost: 400 },
    { icon: '🦅', cost: 800 },
    { icon: '🧿', cost: 1500 }
  ];

  const handleBuyAvatar = async (icon: string, cost: number) => {
    if (currentCoins >= cost) {
      if (confirm(\`Bu avatarı \${cost} 🪙 müqabilində almaq istədiyinizə əminsiniz?\`)) {
        await update(ref(db, \`users/\${user!.uid}\`), {
          spentCoins: (stats.spentCoins || 0) + cost,
          unlockedAvatars: [...unlockedAvatars, icon],
          avatar: icon
        });
        setAvatar(icon);
        toast.success('Avatar uğurla alındı!');
      }
    } else {
      toast.error('Kifayət qədər qəpiyiniz yoxdur!');
    }
  };
  `;
  c = c.replace(/const totalMatches =/, coinsLogic + '\n  const totalMatches =');

  // Inject Shop UI
  const shopUI = `
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-left">Premium Avatarlar (Mağaza)</label>
                    <div className="text-sm font-black text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-lg flex items-center gap-1">
                      {currentCoins} 🪙
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {PREMIUM_AVATARS.map(pa => {
                      const isUnlocked = unlockedAvatars.includes(pa.icon);
                      return (
                        <div 
                          key={pa.icon} 
                          onClick={() => {
                            if (isUnlocked) setAvatar(pa.icon);
                            else handleBuyAvatar(pa.icon, pa.cost);
                          }}
                          className={\`aspect-square flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all \${avatar === pa.icon ? 'bg-yellow-500 shadow-lg scale-110' : (isUnlocked ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-950 border border-zinc-800 hover:border-yellow-500/50')}\`}
                        >
                          <span className="text-2xl">{pa.icon}</span>
                          {!isUnlocked && <span className="text-[9px] font-bold text-yellow-500 mt-1">{pa.cost} 🪙</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
  `;
  c = c.replace(/<div className="grid grid-cols-6 gap-2">/, shopUI + '\n                  <div className="grid grid-cols-6 gap-2">');

  fs.writeFileSync('src/app/profile/page.tsx', c, 'utf8');
}
