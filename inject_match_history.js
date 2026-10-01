const fs = require('fs');

// 1. Write match history on chess game end
let chess = fs.readFileSync('src/app/chess/page.tsx', 'utf8');
if (!chess.includes('match_history')) {
  chess = chess.replace(
    /await update\(ref\(db, `users\/\${winnerId}\/gameStats\/chess`\), \{ wins: wStats\.wins \+ 1 \}\);\n\s*await update\(ref\(db, `users\/\${loserId}\/gameStats\/chess`\), \{ losses: lStats\.losses \+ 1 \}\);/,
    `await update(ref(db, \`users/\${winnerId}/gameStats/chess\`), { wins: wStats.wins + 1 });
      await update(ref(db, \`users/\${loserId}/gameStats/chess\`), { losses: lStats.losses + 1 });
      // Match history
      const histEntry = { game: 'chess', winnerId, loserId, timestamp: Date.now() };
      await Promise.all([
        push(ref(db, \`match_history/\${winnerId}\`), { ...histEntry, result: 'win',  eloChange: +25 }),
        push(ref(db, \`match_history/\${loserId}\`),  { ...histEntry, result: 'loss', eloChange: -25 })
      ]);`
  );
  fs.writeFileSync('src/app/chess/page.tsx', chess, 'utf8');
}

// 2. Enhance Profile page with Match History section
let p = fs.readFileSync('src/app/profile/page.tsx', 'utf8');
if (!p.includes('matchHistory')) {
  // Add state
  p = p.replace(
    /const \[avatar, setAvatar\] = useState\('😎'\);/,
    `const [avatar, setAvatar] = useState('😎');
  const [matchHistory, setMatchHistory] = useState<any[]>([]);`
  );

  // Fetch match history
  p = p.replace(
    /const gameStatsSnap = await get\(ref\(db, `users\/\${u\.uid}\/gameStats`\)\);/,
    `const gameStatsSnap = await get(ref(db, \`users/\${u.uid}/gameStats\`));
          // Fetch recent matches
          const histSnap = await get(query(ref(db, \`match_history/\${u.uid}\`), orderByChild('timestamp'), limitToLast(10)));
          if (histSnap.exists()) {
            const histData = histSnap.val();
            const parsed = Object.keys(histData).map(k => ({ id: k, ...histData[k] })).reverse();
            setMatchHistory(parsed);
          }`
  );

  // Add firebase query imports
  p = p.replace(
    /import \{ ref, get, update \} from 'firebase\/database';/,
    "import { ref, get, update, query, orderByChild, limitToLast } from 'firebase/database';"
  );

  // Inject Match History UI after achievements section
  const histUI = `
              {/* Match History */}
              {matchHistory.length > 0 && (
                <div className="md:col-span-3 mt-2">
                  <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2">
                    📜 Son Oyunlar
                  </h3>
                  <div className="flex flex-col gap-2">
                    {matchHistory.map((m: any) => {
                      const GAME_ICONS: Record<string, string> = { chess: '♟️', checkers: '🔴', go: '⚫', othello: '⚪', connect4: '🟡' };
                      const GAME_NAMES: Record<string, string> = { chess: 'Şahmat', checkers: 'Dama', go: 'Qo', othello: 'Othello', connect4: 'Dördünü Birləşdir' };
                      const isWin = m.result === 'win';
                      const date = new Date(m.timestamp);
                      return (
                        <div key={m.id} className={\`flex items-center gap-3 p-3 rounded-xl border \${isWin ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}\`}>
                          <span className="text-2xl flex-shrink-0">{GAME_ICONS[m.game] || '🎮'}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-white">{GAME_NAMES[m.game] || m.game}</div>
                            <div className="text-xs text-zinc-500">{date.toLocaleDateString('az-AZ')} {date.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                          <div className={\`flex flex-col items-end flex-shrink-0\`}>
                            <span className={\`text-sm font-black \${isWin ? 'text-emerald-400' : 'text-red-400'}\`}>{isWin ? 'Qələbə' : 'Məğlubiyyət'}</span>
                            <span className={\`text-xs font-bold \${isWin ? 'text-emerald-500' : 'text-red-500'}\`}>{isWin ? '+25' : '-25'} ELO</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
  `;
  // Inject before closing of the grid
  p = p.replace(
    /\{\/\* Achievements Section \*\/\}/,
    histUI + '\n                {/* Achievements Section */}'
  );

  fs.writeFileSync('src/app/profile/page.tsx', p, 'utf8');
}
