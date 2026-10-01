const fs = require('fs');
const file = 'src/app/chess/page.tsx';
let c = fs.readFileSync(file, 'utf8');

const eloLogic = `
  const [eloUpdated, setEloUpdated] = useState(false);

  useEffect(() => {
    if (mode === 'multiplayer' && game.isGameOver() && user && !eloUpdated) {
      setEloUpdated(true);
      const userRef = ref(db, \`users/\${user.uid}\`);
      get(userRef).then(snap => {
        const u = snap.val();
        if (u) {
          let newWins = u.wins || 0;
          let newLosses = u.losses || 0;
          let newElo = u.elo || 1200;
          
          let isWin = false;
          let isDraw = game.isDraw() || game.isStalemate();
          
          if (game.isCheckmate()) {
             const winnerColor = game.turn() === 'w' ? 'b' : 'w';
             if (winnerColor === myColor) isWin = true;
          }
          
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
  }, [game, mode, user, eloUpdated, myColor]);
`;

// Add `update` to firebase/database imports
if (!c.includes('update } from')) {
  c = c.replace(/import \{ ref, get, set, remove, onValue, push, onDisconnect, serverTimestamp \} from 'firebase\/database';/, "import { ref, get, set, update, remove, onValue, push, onDisconnect, serverTimestamp } from 'firebase/database';");
}

// Add eloUpdated to resetGame
c = c.replace(/setStatus\('Oyun Ba.*?'\);\n\s*\};/, "$&\n    setEloUpdated(false);");

// Insert Elo Logic after findMatch
if (!c.includes('const [eloUpdated')) {
  c = c.replace(/const findMatch = async \(\) => \{/s, eloLogic + "\n  const findMatch = async () => {");
}

fs.writeFileSync(file, c, 'utf8');
