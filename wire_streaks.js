const fs = require('fs');
// Wire up streaks into Chess page after updateElo call
let c = fs.readFileSync('src/app/chess/page.tsx', 'utf8');
if (!c.includes('updateStreakAndQuests')) {
  c = c.replace(
    /import \{ ref, get, set, remove, onValue, push, serverTimestamp, onDisconnect, update \} from 'firebase\/database';/,
    "import { ref, get, set, remove, onValue, push, serverTimestamp, onDisconnect, update } from 'firebase/database';\nimport { updateStreakAndQuests } from '@/utils/streaks';"
  );
  c = c.replace(
    /await writeActivityFeed\(winnerId, loserId\);/,
    "await writeActivityFeed(winnerId, loserId);\n      await updateStreakAndQuests(winnerId, true);\n      await updateStreakAndQuests(loserId, false);"
  );
  fs.writeFileSync('src/app/chess/page.tsx', c, 'utf8');
}

// Wire up streaks into Connect4 page
let c4 = fs.readFileSync('src/app/connect4/page.tsx', 'utf8');
if (!c4.includes('updateStreakAndQuests')) {
  c4 = c4.replace(
    /import \{ auth, db \} from '@\/lib\/firebase';/,
    "import { auth, db } from '@/lib/firebase';\nimport { updateStreakAndQuests } from '@/utils/streaks';"
  );
  // Call after local win detection in bot mode
  c4 = c4.replace(
    /if \(mode === 'bot' && engine\.winner\) \{/,
    `if (mode === 'bot' && engine.winner && user) {
        if (engine.winner === 'r') updateStreakAndQuests(user.uid, true);
        else if (engine.winner === 'y') updateStreakAndQuests(user.uid, false);
      }
      if (mode === 'bot' && engine.winner) {`
  );
  fs.writeFileSync('src/app/connect4/page.tsx', c4, 'utf8');
}
