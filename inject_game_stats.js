const fs = require('fs');

// 1. Add per-game stats writing to Chess
let chess = fs.readFileSync('src/app/chess/page.tsx', 'utf8');
if (!chess.includes('gameStats')) {
  // Add after updateElo call
  chess = chess.replace(
    /await updateStreakAndQuests\(winnerId, true\);\n\s*await updateStreakAndQuests\(loserId, false\);/,
    `await updateStreakAndQuests(winnerId, true);
      await updateStreakAndQuests(loserId, false);
      // Per-game stats
      const [wSnap2, lSnap2] = await Promise.all([
        get(ref(db, \`users/\${winnerId}/gameStats/chess\`)),
        get(ref(db, \`users/\${loserId}/gameStats/chess\`))
      ]);
      const wStats = wSnap2.val() || { wins: 0, losses: 0 };
      const lStats = lSnap2.val() || { wins: 0, losses: 0 };
      await update(ref(db, \`users/\${winnerId}/gameStats/chess\`), { wins: wStats.wins + 1 });
      await update(ref(db, \`users/\${loserId}/gameStats/chess\`), { losses: lStats.losses + 1 });`
  );
  fs.writeFileSync('src/app/chess/page.tsx', chess, 'utf8');
}

// 2. Add per-game stats to Connect4
let c4 = fs.readFileSync('src/app/connect4/page.tsx', 'utf8');
if (!c4.includes('gameStats/connect4') && c4.includes('updateStreakAndQuests')) {
  c4 = c4.replace(
    /if \(engine\.winner === 'r'\) updateStreakAndQuests\(user\.uid, true\);/,
    `if (engine.winner === 'r') {
          updateStreakAndQuests(user.uid, true);
          get(ref(db, \`users/\${user.uid}/gameStats/connect4\`)).then(s => {
            const st = s.val() || { wins: 0, losses: 0 };
            update(ref(db, \`users/\${user.uid}/gameStats/connect4\`), { wins: st.wins + 1 });
          });
        }`
  );
  c4 = c4.replace(
    /else if \(engine\.winner === 'y'\) updateStreakAndQuests\(user\.uid, false\);/,
    `else if (engine.winner === 'y') {
          updateStreakAndQuests(user.uid, false);
          get(ref(db, \`users/\${user.uid}/gameStats/connect4\`)).then(s => {
            const st = s.val() || { wins: 0, losses: 0 };
            update(ref(db, \`users/\${user.uid}/gameStats/connect4\`), { losses: st.losses + 1 });
          });
        }`
  );
  fs.writeFileSync('src/app/connect4/page.tsx', c4, 'utf8');
}

// 3. Enhance profile page with per-game stats table
let p = fs.readFileSync('src/app/profile/page.tsx', 'utf8');
if (!p.includes('gameStats')) {
  // In the useEffect that fetches stats, also fetch gameStats
  p = p.replace(
    /const statsData = snap\.val\(\);/,
    `const statsData = snap.val();
          const gameStatsSnap = await get(ref(db, \`users/\${u.uid}/gameStats\`));
          const gameStatsData = gameStatsSnap.val() || {};
          statsData.gameStats = gameStatsData;`
  );

  const gameStatsUI = `
              {/* Per-Game Breakdown */}
              <div className="md:col-span-2 mt-2 mb-4">
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">🎮 Oyun Statistikası</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { key: 'chess',    name: 'Şahmat',             icon: '♟️' },
                    { key: 'checkers', name: 'Dama',               icon: '🔴' },
                    { key: 'go',       name: 'Qo',                 icon: '⚫' },
                    { key: 'othello',  name: 'Othello',            icon: '⚪' },
                    { key: 'connect4', name: 'Dördünü Birləşdir',  icon: '🟡' },
                  ].map(g => {
                    const gs = stats.gameStats?.[g.key] || { wins: 0, losses: 0 };
                    const total = gs.wins + gs.losses;
                    const winPct = total > 0 ? Math.round((gs.wins / total) * 100) : 0;
                    return (
                      <div key={g.key} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 flex flex-col gap-1.5 hover:border-zinc-700 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{g.icon}</span>
                          <span className="text-xs font-black text-white truncate">{g.name}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-emerald-400 font-bold">{gs.wins}Q</span>
                          <span className="text-red-400 font-bold">{gs.losses}M</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: \`\${winPct}%\` }}
                          />
                        </div>
                        <div className="text-[10px] text-zinc-600 text-right">{total > 0 ? \`\${winPct}% qələbə\` : 'Oynanmayıb'}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
  `;
  p = p.replace(
    /\{\/\* Level & EXP Progress \*\/\}/,
    gameStatsUI + '\n            {/* Level & EXP Progress */}'
  );
  fs.writeFileSync('src/app/profile/page.tsx', p, 'utf8');
}
