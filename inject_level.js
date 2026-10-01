const fs = require('fs');

let c = fs.readFileSync('src/app/profile/page.tsx', 'utf8');

if (!c.includes('Təcrübə Xalı')) {
  // Add Level logic
  const lvlLogic = `
  const totalMatches = (stats.wins || 0) + (stats.losses || 0);
  const currentLevel = Math.floor(Math.sqrt(totalMatches)) + 1;
  const nextLevelMatches = Math.pow(currentLevel, 2);
  const currentLevelMatches = Math.pow(currentLevel - 1, 2);
  const progressPercent = ((totalMatches - currentLevelMatches) / (nextLevelMatches - currentLevelMatches)) * 100;
  `;
  c = c.replace(/const totalMatches = \(stats\.wins \|\| 0\) \+ \(stats\.losses \|\| 0\);/, lvlLogic);

  // Add Level UI
  const lvlUI = `
            {/* Level & EXP Progress */}
            <div className="md:col-span-2 mt-2 mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-lg text-xs">Səviyyə {currentLevel}</span>
                  <span className="text-zinc-400 text-xs">Təcrübə Xalı (EXP)</span>
                </div>
                <div className="text-xs font-bold text-zinc-400">
                  {totalMatches} / {nextLevelMatches} Oyun
                </div>
              </div>
              <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000 ease-out relative"
                  style={{ width: \`\${Math.max(5, progressPercent)}%\` }}
                >
                  <div className="absolute top-0 right-0 bottom-0 w-4 bg-white/20 animate-pulse" />
                </div>
              </div>
              <div className="text-[10px] text-zinc-500 mt-2 text-right">Növbəti səviyyəyə: {nextLevelMatches - totalMatches} oyun</div>
            </div>
  `;
  
  // Inject Level UI right after the "Oynanılan Oyunlar" Grid
  c = c.replace(/<\/div>\s*\{\/\* Achievements Section \*\/\}/, '</div>\n' + lvlUI + '\n          {/* Achievements Section */}');

  fs.writeFileSync('src/app/profile/page.tsx', c, 'utf8');
}
