const fs = require('fs');

let c = fs.readFileSync('src/app/chess/page.tsx', 'utf8');

if (!c.includes('isSpectator')) {
  // 1. Add spectator state
  c = c.replace(/const \[myColor, setMyColor\] = useState<'w'\|'b'>\('w'\);/, "const [myColor, setMyColor] = useState<'w'|'b'>('w');\n  const [isSpectator, setIsSpectator] = useState(false);");

  // 2. Modify URL parameter logic
  const urlLogic = `
  useEffect(() => {
    if (typeof window !== 'undefined' && user) {
      const params = new URLSearchParams(window.location.search);
      const room = params.get('room');
      const watch = params.get('watch');
      
      if (watch && !roomId) {
        setMode('multiplayer');
        setRoomId(watch);
        setIsSpectator(true);
        setStatus('İzləyici kimi qoşuldunuz');
        toast.success('Otağa izləyici kimi qoşuldunuz!', { icon: '👁️' });
        window.history.replaceState({}, '', window.location.pathname);
      } else if (room && !roomId) {
        get(ref(db, \`games/chess/\${room}\`)).then(snap => {
          if (snap.exists()) {
             const data = snap.val();
             if (data.status === 'playing' || data.guest) {
                // Room is full, become spectator
                setMode('multiplayer');
                setRoomId(room);
                setIsSpectator(true);
                setStatus('Otaq doludur. İzləyici kimi qoşuldunuz');
                toast.success('Otaq dolu olduğu üçün izləyici oldunuz', { icon: '👁️' });
             } else {
                // Join as guest
                setMode('multiplayer');
                setRoomId(room);
                setMyColor('b');
                update(ref(db, \`games/chess/\${room}\`), { status: 'playing', guest: user.uid });
                setStatus('Otağa qoşuldunuz! Oyun Başladı.');
                toast.success('Dostunuzun otağına qoşuldunuz!', { icon: '🤝' });
             }
             window.history.replaceState({}, '', window.location.pathname);
          }
        });
      }
    }
  }, [user, roomId]);
  `;

  // Replace old URL logic
  const oldUrlLogicStart = `useEffect(() => {
    if (typeof window !== 'undefined' && user) {
      const params = new URLSearchParams(window.location.search);`;
      
  const oldUrlLogicRegex = /useEffect\(\(\) => \{\s*if \(typeof window !== 'undefined' && user\) \{\s*const params = new URLSearchParams\(window\.location\.search\);[\s\S]*?window\.history\.replaceState\(\{\}, '', window\.location\.pathname\);\s*\}\s*\}\s*\}, \[user, roomId\]\);/;
  
  if (oldUrlLogicRegex.test(c)) {
     c = c.replace(oldUrlLogicRegex, urlLogic);
  } else {
     console.log('Regex for old URL logic failed!');
  }

  // 3. Disable moves for spectators
  c = c.replace(/if \(mode === 'bot' && game\.turn\(\) === 'b'\) return false;/, "if (isSpectator) { toast.error('İzləyicilər gediş edə bilməz!'); return false; }\n    if (mode === 'bot' && game.turn() === 'b') return false;");

  // Disable resign for spectators
  c = c.replace(/<button onClick=\{resign\} className="flex-1/, `{isSpectator ? <div className="flex-1 py-2 rounded-xl bg-zinc-800 text-sm font-bold text-zinc-500 flex items-center justify-center gap-2"><Eye className="w-4 h-4"/> İzləyici</div> : <button onClick={resign} className="flex-1`);

  // Fix the closing bracket for the resign button ternary
  c = c.replace(/<Flag className="w-4 h-4" \/> Təslim ol\n\s*<\/button>/, `<Flag className="w-4 h-4" /> Təslim ol\n                </button>}`);

  // Import Eye icon
  c = c.replace(/import \{([^}]+)\} from 'lucide-react';/, (match, p1) => {
    return `import { ${p1}, Eye } from 'lucide-react';`;
  });

  // EndGameModal logic for spectators
  c = c.replace(/gameResult = finalWinner === myColor \? 'win' : 'loss';/, `gameResult = isSpectator ? null : (finalWinner === myColor ? 'win' : 'loss');`);

  // Add "İzləmə Linki Kopyala" button
  const specBtn = `
              <button onClick={() => {
                const link = \`\${window.location.origin}/chess?watch=\${roomId}\`;
                navigator.clipboard.writeText(link).then(() => toast.success('İzləyici linki kopyalandı!'));
              }} className="w-full py-2 mb-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-white transition flex items-center justify-center gap-2">
                <Eye className="w-4 h-4" /> İzləyici Linki
              </button>
  `;
  c = c.replace(/<button onClick=\{createPrivateRoom\}/, specBtn + '\n              <button onClick={createPrivateRoom}');

  fs.writeFileSync('src/app/chess/page.tsx', c, 'utf8');
}
