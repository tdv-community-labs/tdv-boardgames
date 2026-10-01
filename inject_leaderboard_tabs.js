const fs = require('fs');
let c = fs.readFileSync('src/app/leaderboard/page.tsx', 'utf8');

if (!c.includes('sortBy')) {
  // Add state
  c = c.replace(/const \[players, setPlayers\] = useState<Player\[\]>\(\[\]\);/, "const [players, setPlayers] = useState<Player[]>([]);\n  const [sortBy, setSortBy] = useState<'elo' | 'wins' | 'coins' | 'level'>('elo');");

  // Modify sorting logic
  const sortLogic = `
        const sorted = Object.keys(data).map(uid => {
          const u = data[uid];
          const totalMatches = (u.wins || 0) + (u.losses || 0);
          const level = Math.floor(Math.sqrt(totalMatches)) + 1;
          const totalCoins = ((u.wins || 0) * 15) + ((u.losses || 0) * 2);
          const currentCoins = totalCoins - (u.spentCoins || 0);
          return { uid, displayName: u.displayName || 'Oyunçu', avatar: u.avatar, elo: u.elo || 1200, wins: u.wins || 0, losses: u.losses || 0, level, coins: currentCoins };
        }).sort((a, b) => b[sortBy] - a[sortBy]);
        
        sorted.forEach((p, i) => p.rank = i + 1);
  `;
  c = c.replace(/const sorted = Object\.keys\(data\)[\s\S]*?sorted\.forEach\(\(p, i\) => p\.rank = i \+ 1\);/, sortLogic);

  // Re-run effect when sortBy changes
  c = c.replace(/}, \[\]\);/g, "}, [sortBy]);");

  // Inject Tabs UI
  const tabsUI = `
        {/* Sorting Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8 relative z-10">
          {(['elo', 'wins', 'coins', 'level'] as const).map(tab => (
            <button 
              key={tab} 
              onClick={() => setSortBy(tab)}
              className={\`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all \${sortBy === tab ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-zinc-900/80 text-zinc-400 hover:bg-zinc-800 hover:text-white'}\`}
            >
              {tab === 'elo' && '🏆 Reytinq'}
              {tab === 'wins' && '⚔️ Qələbələr'}
              {tab === 'coins' && '🪙 Zənginlər'}
              {tab === 'level' && '📈 Səviyyə'}
            </button>
          ))}
        </div>
  `;
  c = c.replace(/\{\/\* Top 3 Podium \*\/\}/, tabsUI + '\n        {/* Top 3 Podium */}');

  // Change sub-stats based on sortBy
  // For podium:
  c = c.replace(/<div className="text-sm text-white\/50 font-medium">\{u\.wins\} Q \| \{u\.losses\} M<\/div>/g, 
    `<div className="text-sm text-white/50 font-medium">
                  {sortBy === 'elo' ? \`\${u.wins} Q | \${u.losses} M\` : ''}
                  {sortBy === 'wins' ? \`\${u.wins} Qələbə\` : ''}
                  {sortBy === 'coins' ? \`\${u.coins} 🪙\` : ''}
                  {sortBy === 'level' ? \`Lvl \${u.level}\` : ''}
                </div>`);

  // For the rest of the list:
  // "<div>{u.wins} Q</div><div>{u.losses} M</div>"
  c = c.replace(/<div>\{u\.wins\} Q<\/div>\n\s*<div>\{u\.losses\} M<\/div>/g, 
    `<div className="col-span-2 text-right">
                  {sortBy === 'elo' ? \`\${u.wins} Q | \${u.losses} M\` : ''}
                  {sortBy === 'wins' ? \`\${u.wins} Qələbə\` : ''}
                  {sortBy === 'coins' ? \`\${u.coins} 🪙\` : ''}
                  {sortBy === 'level' ? \`Səviyyə \${u.level}\` : ''}
                </div>`);

  fs.writeFileSync('src/app/leaderboard/page.tsx', c, 'utf8');
}
