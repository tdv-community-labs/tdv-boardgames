const fs = require('fs');

let c = fs.readFileSync('src/app/profile/page.tsx', 'utf8');

if (!c.includes('Nailiyyətlər')) {
  const badgesLogic = `
  const BADGES = [
    { id: 'first_win', name: 'İlk Uğur', desc: 'İlk oyununuzu qazanın', icon: '🎯', unlocked: (stats.wins || 0) >= 1 },
    { id: 'veteran', name: 'Veteran', desc: '10-dan çox oyun oynayın', icon: '⚔️', unlocked: totalMatches >= 10 },
    { id: 'unstoppable', name: 'Məğlubedilməz', desc: '5 dəfə qalib gəlin', icon: '🔥', unlocked: (stats.wins || 0) >= 5 },
    { id: 'tactician', name: 'Taktik', desc: '20 dəfə qalib gəlin', icon: '🧠', unlocked: (stats.wins || 0) >= 20 },
    { id: 'rising_star', name: 'Parlayan Ulduz', desc: '1300 Elo-nu keçin', icon: '⭐', unlocked: (stats.elo || 1200) >= 1300 },
    { id: 'master', name: 'Böyük Usta', desc: '1600 Elo-nu keçin', icon: '👑', unlocked: (stats.elo || 1200) >= 1600 },
  ];
  `;

  // Insert logic before `return (` which is preceded by `const rank = getRank(stats.elo || 1200);`
  c = c.replace(/const rank = getRank\(stats\.elo \|\| 1200\);\s*return \(/, 'const rank = getRank(stats.elo || 1200);\n' + badgesLogic + '\n  return (');

  const badgesUI = `
          {/* Achievements Section */}
          <div className="md:col-span-3 mt-4">
            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
              🏆 Nailiyyətlər Nişanları
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {BADGES.map((badge: any) => (
                <div 
                  key={badge.id} 
                  className={\`relative flex flex-col items-center text-center p-4 rounded-3xl border transition-all \${badge.unlocked ? 'bg-zinc-900/80 border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)]' : 'bg-zinc-950/50 border-zinc-900 opacity-50 grayscale'}\`}
                >
                  <div className="text-4xl mb-2 filter drop-shadow-lg">{badge.icon}</div>
                  <div className={\`text-sm font-bold mb-1 \${badge.unlocked ? 'text-yellow-400' : 'text-zinc-500'}\`}>{badge.name}</div>
                  <div className="text-[10px] text-zinc-500 leading-tight">{badge.desc}</div>
                  
                  {!badge.unlocked && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] rounded-3xl flex items-center justify-center">
                      <span className="text-2xl opacity-30">🔒</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
  `;

  // We need to inject badgesUI inside the main max-w-4xl grid.
  // Profile is wrapped in <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
  // We can just append it before the final closing divs.
  // Specifically, find `</div>\n          </div>\n        </div>\n      </div>\n    </div>`
  
  c = c.replace(/<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\);/g, '</div>\n' + badgesUI + '\n        </div>\n      </div>\n    </div>\n  );');

  fs.writeFileSync('src/app/profile/page.tsx', c, 'utf8');
}
