const fs = require('fs');
let c = fs.readFileSync('src/app/leaderboard/page.tsx', 'utf8');
// Fix: make sure firebase/auth import is on its own line cleanly
if (!c.includes("from 'firebase/auth'")) {
  c = c.replace("from 'firebase/database';", "from 'firebase/database';\nimport { onAuthStateChanged, User } from 'firebase/auth';");
  fs.writeFileSync('src/app/leaderboard/page.tsx', c, 'utf8');
}
