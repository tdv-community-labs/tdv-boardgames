const fs = require('fs');

const eloLogic = `
  const [eloUpdated, setEloUpdated] = useState(false);

  useEffect(() => {
    if (mode === 'multiplayer' && engine.winner && user && !eloUpdated) {
      setEloUpdated(true);
      const userRef = ref(db, \`users/\${user.uid}\`);
      get(userRef).then(snap => {
        const u = snap.val();
        if (u) {
          let newWins = u.wins || 0;
          let newLosses = u.losses || 0;
          let newElo = u.elo || 1200;
          
          let isWin = false;
          let isDraw = engine.winner === 'draw';
          
          // In Chess, winner is usually myColor (w or b) or draw
          if (engine.winner === myColor) isWin = true;
          
          if (isWin) { newWins++; newElo += 25; }
          else if (!isDraw) { newLosses++; newElo = Math.max(0, newElo - 25); }

          const total = newWins + newLosses;
          const winRate = total > 0 ? Math.round((newWins / total) * 100) + "%" : "0%";

          const { update } = require('firebase/database');
          update(userRef, {
            wins: newWins,
            losses: newLosses,
            elo: newElo,
            winRate: winRate
          });
        }
      });
    }
  }, [engine.winner, mode, user, eloUpdated, myColor]);
`;

function injectElo(file) {
  let c = fs.readFileSync(file, 'utf8');

  // Add `update` to firebase/database imports
  if (!c.includes('update } from')) {
    c = c.replace(/import \{ ref, get, set, remove, onValue, push, onDisconnect, serverTimestamp \} from 'firebase\/database';/, "import { ref, get, set, update, remove, onValue, push, onDisconnect, serverTimestamp } from 'firebase/database';");
  }

  // Add eloUpdated to resetGame
  c = c.replace(/setWhiteTime\(600\);\n\s*setBlackTime\(600\);/g, "setWhiteTime(600);\n    setBlackTime(600);\n    setEloUpdated(false);");

  // Insert Elo Logic after findMatch
  if (!c.includes('const [eloUpdated')) {
    c = c.replace(/const findMatch = async \(\) => \{/s, eloLogic + "\n  const findMatch = async () => {");
  }

  fs.writeFileSync(file, c, 'utf8');
  console.log('Injected Elo into', file);
}

['src/app/checkers/page.tsx', 'src/app/go/page.tsx', 'src/app/othello/page.tsx'].forEach(injectElo);
