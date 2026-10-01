const fs = require('fs');
let c = fs.readFileSync('src/app/chess/page.tsx', 'utf8');

c = c.replace(/import \{ ref, get, set, remove, onValue, push, serverTimestamp, onDisconnect \} from 'firebase\/database';/, "import { ref, get, set, remove, onValue, push, serverTimestamp, onDisconnect, update } from 'firebase/database';");

c = c.replace(/square: moveFrom,/g, "square: moveFrom as any,");
c = c.replace(/square,/g, "square: square as any,");

fs.writeFileSync('src/app/chess/page.tsx', c, 'utf8');
