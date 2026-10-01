const fs = require('fs');
let c = fs.readFileSync('src/app/chess/page.tsx', 'utf8');

if (!c.includes('timeControl')) {
  // Add states
  c = c.replace(
    /const \[incomingDraw, setIncomingDraw\] = useState\(false\);/,
    `const [incomingDraw, setIncomingDraw] = useState(false);
  const [timeControl, setTimeControl] = useState<number>(300); // seconds
  const [whiteTime, setWhiteTime] = useState<number>(300);
  const [blackTime, setBlackTime] = useState<number>(300);
  const [clockRunning, setClockRunning] = useState(false);`
  );

  // Add clock effect after existing useEffects
  const clockEffect = `
  // Chess clock countdown
  useEffect(() => {
    if (!clockRunning || game.isGameOver() || engineWinner) return;
    const interval = setInterval(() => {
      const turn = game.turn();
      if (turn === 'w') {
        setWhiteTime(t => {
          if (t <= 1) {
            clearInterval(interval);
            setEngineWinner('b');
            setClockRunning(false);
            if (mode === 'multiplayer' && roomId) {
              update(ref(db, \`games/chess/\${roomId}\`), { state: 'timeout_w' });
            }
            return 0;
          }
          return t - 1;
        });
      } else {
        setBlackTime(t => {
          if (t <= 1) {
            clearInterval(interval);
            setEngineWinner('w');
            setClockRunning(false);
            if (mode === 'multiplayer' && roomId) {
              update(ref(db, \`games/chess/\${roomId}\`), { state: 'timeout_b' });
            }
            return 0;
          }
          return t - 1;
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [clockRunning, game, engineWinner, mode, roomId]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return \`\${m}:\${s}\`;
  };

  const startClock = () => {
    setWhiteTime(timeControl);
    setBlackTime(timeControl);
    setClockRunning(true);
  };
  `;
  c = c.replace(
    /\/\/ Chess clock countdown/,
    "// PLACEHOLDER_CLOCK"
  );
  if (!c.includes('PLACEHOLDER_CLOCK')) {
    c = c.replace(
      /const drawHandlers = /,
      clockEffect + '\n  const drawHandlers = '
    );
  }

  // Reset clock on game reset
  c = c.replace(
    /setOptionSquares\(\{\}\);\n\s*setMoveFrom\(null\);/,
    `setOptionSquares({});
    setMoveFrom(null);
    setWhiteTime(timeControl);
    setBlackTime(timeControl);
    setClockRunning(false);`
  );

  // Start clock on first move
  c = c.replace(
    /playMoveSound\(\);\n\s*if \(move\.captured\) playCaptureSound\(\);\n\s*setOptionSquares\(\{\}\); \/\/ clear/,
    `playMoveSound();
        if (move.captured) playCaptureSound();
        setOptionSquares({}); // clear
        if (!clockRunning) setClockRunning(true);`
  );

  // Inject Clock UI above the board in the sidebar
  const clockUI = `
          {/* Chess Clock */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className={\`relative p-4 rounded-2xl border-2 text-center transition-all \${game.turn() === 'b' && clockRunning ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'border-zinc-800 bg-zinc-950'}\`}>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                {mode === 'multiplayer' ? (myColor === 'b' ? 'Siz' : 'Rəqib') : 'Bot'}
              </div>
              <div className={\`text-3xl font-mono font-black \${blackTime < 30 ? 'text-red-400 animate-pulse' : 'text-white'}\`}>
                {formatTime(blackTime)}
              </div>
              <div className="text-xl mt-1">⚫</div>
            </div>
            <div className={\`relative p-4 rounded-2xl border-2 text-center transition-all \${game.turn() === 'w' && clockRunning ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'border-zinc-800 bg-zinc-950'}\`}>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                {mode === 'multiplayer' ? (myColor === 'w' ? 'Siz' : 'Rəqib') : 'Siz'}
              </div>
              <div className={\`text-3xl font-mono font-black \${whiteTime < 30 ? 'text-red-400 animate-pulse' : 'text-white'}\`}>
                {formatTime(whiteTime)}
              </div>
              <div className="text-xl mt-1">⚪</div>
            </div>
          </div>

          {/* Time Control Selector */}
          {!clockRunning && (
            <div className="mb-4">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Vaxt Nəzarəti</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[{label:'1 dəq', secs:60},{label:'3 dəq', secs:180},{label:'5 dəq', secs:300},{label:'10 dəq', secs:600}].map(tc => (
                  <button key={tc.secs} onClick={() => { setTimeControl(tc.secs); setWhiteTime(tc.secs); setBlackTime(tc.secs); }}
                    className={\`py-1.5 rounded-lg text-xs font-black transition-all \${timeControl === tc.secs ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}\`}>
                    {tc.label}
                  </button>
                ))}
              </div>
            </div>
          )}
  `;
  c = c.replace(
    /<h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Oyun Statusu<\/h2>/,
    clockUI + '\n          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Oyun Statusu</h2>'
  );

  fs.writeFileSync('src/app/chess/page.tsx', c, 'utf8');
}
