const fs = require('fs');
const file = 'src/app/go/page.tsx';
let c = fs.readFileSync(file, 'utf8');

// 2. Add Firebase imports
if (!c.includes('firebase/auth')) {
  c = c.replace(
    "import { playMoveSound, playCaptureSound } from '@/utils/sounds';",
    "import { playMoveSound, playCaptureSound } from '@/utils/sounds';\nimport { auth, db } from '@/lib/firebase';\nimport { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';\nimport { ref, get, set, remove, onValue, push, onDisconnect, serverTimestamp } from 'firebase/database';"
  );
}

// 3. Add State variables
if (!c.includes('mode, setMode')) {
  c = c.replace(
    "const [board, setBoard] = useState<BoardState>(engine.board);",
    "const [board, setBoard] = useState<BoardState>(engine.board);\n  const [mode, setMode] = useState<'bot' | 'multiplayer'>('bot');\n  const [user, setUser] = useState<FirebaseUser | null>(null);\n  const [isSearching, setIsSearching] = useState(false);\n  const [roomId, setRoomId] = useState<string | null>(null);\n  const [myColor, setMyColor] = useState<'b' | 'w'>('b');\n"
  );
}

// 4. Update UI info
c = c.replace(
  /const whitePlayer = \{ name: ".*?", elo: 1520 \};/,
  "const whitePlayer = { name: mode === 'multiplayer' ? (myColor === 'w' ? user?.displayName || 'Siz' : 'Rəqib') : 'Bot (Ağ)', elo: 1520 };"
);
c = c.replace(
  /const blackPlayer = \{ name: ".*?", elo: 1450 \};/,
  "const blackPlayer = { name: mode === 'multiplayer' ? (myColor === 'b' ? user?.displayName || 'Siz' : 'Rəqib') : 'Sən (Qara)', elo: 1450 };"
);

// 5. Add Firebase Matchmaking logic
if (!c.includes('onAuthStateChanged(auth')) {
  const matchmaking = `
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (mode === 'multiplayer' && user && roomId) {
      const gameRef = ref(db, \`games/go/\${roomId}\`);
      const unsubscribe = onValue(gameRef, (snap) => {
        const data = snap.val();
        if (data && data.state && data.state !== engine.serialize()) {
          const newEngine = new GoEngine(BOARD_SIZE);
          newEngine.load(data.state);
          setEngine(newEngine);
          setBoard(newEngine.board);
          
          if (newEngine.winner) {
            if (newEngine.winner === 'draw') setStatus('Heç-heçə!');
            else setStatus(newEngine.winner === myColor ? 'Siz Qalib Gəldiniz!' : 'Rəqib Qalib Gəldi!');
          } else {
            setStatus(\`Gediş sırası: \${newEngine.turn === 'w' ? 'Ağlar' : 'Qaralar'}\`);
          }
        }
      });
      return () => unsubscribe();
    }
  }, [mode, roomId, user, engine, myColor]);

  const findMatch = async () => {
    if (!user) {
      alert('Multiplayer oynamaq üçün hesabınıza daxil olmalısınız!');
      return;
    }
    setIsSearching(true);
    setStatus('Rəqib axtarılır...');

    const waitingRef = ref(db, 'matchmaking/go/waiting');
    const snap = await get(waitingRef);

    if (snap.exists()) {
      const opponentId = snap.val();
      if (opponentId === user.uid) return;

      await remove(waitingRef);
      const newRoomRef = push(ref(db, 'games/go'));
      const newRoomId = newRoomRef.key;

      await set(newRoomRef, {
        white: user.uid, // Opponent was waiting, let them be black
        black: opponentId,
        state: new GoEngine(BOARD_SIZE).serialize(),
        status: 'playing',
        timestamp: serverTimestamp()
      });

      await set(ref(db, \`users/\${opponentId}/currentMatch\`), newRoomId);
      
      setRoomId(newRoomId);
      setMyColor('w');
      resetGame();
      setStatus('Oyun Başladı! Uğurlar.');
      setIsSearching(false);
    } else {
      await set(waitingRef, user.uid);
      onDisconnect(waitingRef).remove();

      const matchRef = ref(db, \`users/\${user.uid}/currentMatch\`);
      onValue(matchRef, (snapMatch) => {
        const foundRoomId = snapMatch.val();
        if (foundRoomId) {
          setRoomId(foundRoomId);
          setMyColor('b');
          resetGame();
          setStatus('Oyun Başladı! Uğurlar.');
          setIsSearching(false);
          remove(matchRef);
        }
      });
    }
  };
  `;
  c = c.replace(/const BOARD_SIZE = 19;/s, "$&\n" + matchmaking);
}

// 6. Update Bot logic to only run if mode === 'bot'
c = c.replace(
  "if (engine.turn === 'w') {",
  "if (mode === 'bot' && engine.turn === 'w' && !engine.winner) {"
);

// 7. Update handleCellClick to check myColor in multiplayer
c = c.replace(
  "if (engine.winner || engine.turn === 'w') return;",
  "if (engine.winner) return;\n    if (mode === 'bot' && engine.turn === 'w') return;\n    if (mode === 'multiplayer' && engine.turn !== myColor) return;"
);
c = c.replace(
  "if (engine.winner || engine.turn === 'w') return; // Not our turn for Pass/Resign",
  "if (engine.winner) return;\n    if (mode === 'bot' && engine.turn === 'w') return;\n    if (mode === 'multiplayer' && engine.turn !== myColor) return;"
);

// 8. Push move to DB (for handleCellClick)
if (!c.includes('games/go/')) {
  c = c.replace(
    "if (preCount === postCount && !board[r][c]) {",
    "if (mode === 'multiplayer' && roomId) set(ref(db, \`games/go/\${roomId}/state\`), engine.serialize());\n        if (preCount === postCount && !board[r][c]) {"
  );
}

// Push move to DB (for Pass/Resign/Draw)
if (!c.includes('engine.serialize()`)')) {
  c = c.replace(
    "engine.pass();",
    "engine.pass();\n      if (mode === 'multiplayer' && roomId) set(ref(db, \`games/go/\${roomId}/state\`), engine.serialize());"
  );
  c = c.replace(
    "engine.winner = 'w';",
    "engine.winner = mode === 'multiplayer' ? (myColor === 'w' ? 'b' : 'w') : 'w';\n      if (mode === 'multiplayer' && roomId) set(ref(db, \`games/go/\${roomId}/state\`), engine.serialize());"
  );
  c = c.replace(
    "engine.winner = 'draw';",
    "engine.winner = 'draw';\n      if (mode === 'multiplayer' && roomId) set(ref(db, \`games/go/\${roomId}/state\`), engine.serialize());"
  );
}


// 9. Add buttons to UI
if (!c.includes('Rejim Seçimi')) {
  const buttons = `
          {/* Rejim Seçimi */}
          <div className="flex gap-2 mb-6">
            <button 
              onClick={() => { setMode('bot'); resetGame(); }} 
              className={\`flex-1 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 \${mode === 'bot' ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}\`}
            >
              Bot
            </button>
            <button 
              onClick={() => { setMode('multiplayer'); resetGame(); }}
              className={\`flex-1 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 \${mode === 'multiplayer' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}\`}
            >
              Canlı
            </button>
          </div>
          
          {mode === 'multiplayer' && !roomId && (
            <button onClick={findMatch} disabled={isSearching} className="w-full py-3 mb-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold text-white transition disabled:opacity-50">
              {isSearching ? 'Rəqib axtarılır...' : 'Rəqib Axtar'}
            </button>
          )}
  `;
  // Using a robust regex to find where to insert buttons
  c = c.replace(
    /<h2 className="text-xs font-black uppercase tracking-widest text-amber-500 mb-2">Qo \(Go\)<\/h2>\s*<div className="text-xl font-bold text-white mb-6">\{status\}<\/div>/,
    `<h2 className="text-xs font-black uppercase tracking-widest text-amber-500 mb-2">Qo (Go)</h2>\n          <div className="text-xl font-bold text-white mb-6">{status}</div>\n${buttons}`
  );
}

fs.writeFileSync(file, c, 'utf8');
