const fs = require('fs');
const file = 'src/app/checkers/page.tsx';
let c = fs.readFileSync(file, 'utf8');

// 1. Add Firebase imports
if (!c.includes('firebase/auth')) {
  c = c.replace(
    "import { playMoveSound, playCaptureSound } from '@/utils/sounds';",
    "import { playMoveSound, playCaptureSound } from '@/utils/sounds';\nimport { auth, db } from '@/lib/firebase';\nimport { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';\nimport { ref, get, set, remove, onValue, push, onDisconnect, serverTimestamp } from 'firebase/database';"
  );
}

// 2. Add State variables
if (!c.includes('mode, setMode')) {
  c = c.replace(
    "const [board, setBoard] = useState<BoardState>(engine.board);",
    "const [board, setBoard] = useState<BoardState>(engine.board);\n  const [mode, setMode] = useState<'bot' | 'multiplayer'>('bot');\n  const [user, setUser] = useState<FirebaseUser | null>(null);\n  const [isSearching, setIsSearching] = useState(false);\n  const [roomId, setRoomId] = useState<string | null>(null);\n  const [myColor, setMyColor] = useState<'w' | 'b'>('w');\n"
  );
}

// 3. Add Firebase Matchmaking logic
if (!c.includes('onAuthStateChanged(auth')) {
  const matchmaking = `
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (mode === 'multiplayer' && user && roomId) {
      const gameRef = ref(db, \`games/checkers/\${roomId}\`);
      const unsubscribe = onValue(gameRef, (snap) => {
        const data = snap.val();
        if (data && data.state && data.state !== engine.serialize()) {
          const newEngine = new CheckersEngine();
          newEngine.load(data.state);
          setEngine(newEngine);
          setBoard(newEngine.board);
          
          if (newEngine.winner) {
            setStatus(newEngine.winner === myColor ? 'Siz Qalib Gəldiniz!' : 'Rəqib Qalib Gəldi!');
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

    const waitingRef = ref(db, 'matchmaking/checkers/waiting');
    const snap = await get(waitingRef);

    if (snap.exists()) {
      const opponentId = snap.val();
      if (opponentId === user.uid) return;

      await remove(waitingRef);
      const newRoomRef = push(ref(db, 'games/checkers'));
      const newRoomId = newRoomRef.key;

      await set(newRoomRef, {
        white: opponentId,
        black: user.uid,
        state: new CheckersEngine().serialize(),
        status: 'playing',
        timestamp: serverTimestamp()
      });

      await set(ref(db, \`users/\${opponentId}/currentMatch\`), newRoomId);
      
      setRoomId(newRoomId);
      setMyColor('b');
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
          setMyColor('w');
          resetGame();
          setStatus('Oyun Başladı! Uğurlar.');
          setIsSearching(false);
          remove(matchRef);
        }
      });
    }
  };
  `;
  c = c.replace(/const formatTime.*?return.*?;\s*\};/s, "$&\n" + matchmaking);
}

// 4. Update Bot logic to only run if mode === 'bot'
c = c.replace(
  "if (engine.turn === 'b' && !engine.winner)",
  "if (mode === 'bot' && engine.turn === 'b' && !engine.winner)"
);

// 5. Update handleCellClick to check myColor in multiplayer
c = c.replace(
  "if (engine.winner || engine.turn === 'b') return; // Not our turn",
  "if (engine.winner) return;\n    if (mode === 'bot' && engine.turn === 'b') return;\n    if (mode === 'multiplayer' && engine.turn !== myColor) return;"
);
c = c.replace(
  "if (piece && piece.color.toLowerCase() === 'w') {",
  "if (piece && piece.color.toLowerCase() === (mode === 'multiplayer' ? myColor : 'w')) {"
);
c = c.replace(
  "const allMoves = engine.getValidMoves('w');",
  "const allMoves = engine.getValidMoves(mode === 'multiplayer' ? myColor : 'w');"
);

// 6. Push move to DB
if (!c.includes('games/checkers/')) {
  c = c.replace(
    "if (move.jumped) playCaptureSound();",
    "if (mode === 'multiplayer' && roomId) set(ref(db, \`games/checkers/\${roomId}/state\`), engine.serialize());\n        if (move.jumped) playCaptureSound();"
  );
}

// 7. Update UI info
c = c.replace(
  "const whitePlayer = { name: \"Stn (AY)\", elo: 1450 };",
  "const whitePlayer = { name: mode === 'multiplayer' ? (myColor === 'w' ? user?.displayName || 'Siz' : 'Rəqib') : 'Sən (Ağ)', elo: 1450 };"
);
c = c.replace(
  "const blackPlayer = { name: \"Bot (Qara)\", elo: 1520 };",
  "const blackPlayer = { name: mode === 'multiplayer' ? (myColor === 'b' ? user?.displayName || 'Siz' : 'Rəqib') : 'Bot (Qara)', elo: 1520 };"
);

// 8. Add buttons to UI
if (!c.includes('Rejim Seçimi')) {
  const buttons = `
          {/* Rejim Seçimi */}
          <div className="flex gap-2 mb-6">
            <button 
              onClick={() => { setMode('bot'); resetGame(); }} 
              className={\`flex-1 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 \${mode === 'bot' ? 'bg-red-600 text-white shadow-lg shadow-red-500/20' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}\`}
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
  c = c.replace(
    /<div className="text-xl font-bold text-white mb-6">\{status\}<\/div>/,
    `<div className="text-xl font-bold text-white mb-6">{status}</div>\n${buttons}`
  );
}

fs.writeFileSync(file, c, 'utf8');
