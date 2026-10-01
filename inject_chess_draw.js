const fs = require('fs');

let c = fs.readFileSync('src/app/chess/page.tsx', 'utf8');

if (!c.includes('handleDrawOffer')) {
  // Add drawOffer state
  c = c.replace(/const \[moveFrom, setMoveFrom\] = useState<string \| null>\(null\);/, "const [moveFrom, setMoveFrom] = useState<string | null>(null);\n  const [incomingDraw, setIncomingDraw] = useState(false);\n  const [drawOfferedByMe, setDrawOfferedByMe] = useState(false);");

  // Modify onValue to detect draw offers
  const drawLogic = `
        if (data.drawOffer) {
          if (data.drawOffer !== myColor && data.state !== 'draw') {
            setIncomingDraw(true);
          } else if (data.drawOffer === myColor) {
            setDrawOfferedByMe(true);
          }
        } else {
          setIncomingDraw(false);
          setDrawOfferedByMe(false);
        }

        if (data.state === 'draw') {
          setEngineWinner('draw');
          setIncomingDraw(false);
          setDrawOfferedByMe(false);
        }
  `;
  c = c.replace(/if \(data\.state\.startsWith\('resigned_'\)\) \{/g, drawLogic + "\n        if (data.state === 'resigned_w' || data.state === 'resigned_b' || data.state.startsWith('resigned_')) {");

  // Add handlers
  const drawHandlers = `
  const offerDraw = () => {
    if (mode === 'multiplayer' && roomId && !isSpectator) {
      update(ref(db, \`games/chess/\${roomId}\`), { drawOffer: myColor });
      toast.success('Heç-heçə təklifi göndərildi!');
    } else {
      toast.error('Bota qarşı heç-heçə təklif edə bilməzsiniz (Təslim olun)');
    }
  };

  const acceptDraw = () => {
    if (roomId) update(ref(db, \`games/chess/\${roomId}\`), { state: 'draw', drawOffer: null });
  };

  const rejectDraw = () => {
    if (roomId) {
      update(ref(db, \`games/chess/\${roomId}\`), { drawOffer: null });
      setIncomingDraw(false);
      toast.success('Təklif rədd edildi.');
    }
  };
  `;
  c = c.replace(/const resetGame = \(\) => \{/, drawHandlers + '\n  const resetGame = () => {');

  // Inject Incoming Draw UI
  const incomingUI = `
      <AnimatePresence>
        {incomingDraw && (
          <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }} className="absolute top-24 left-1/2 transform -translate-x-1/2 z-50 bg-blue-900 border border-blue-500 p-4 rounded-2xl shadow-2xl flex flex-col items-center gap-3 w-80">
            <div className="text-white font-bold text-center">Rəqib heç-heçə təklif edir!</div>
            <div className="flex gap-2 w-full">
              <button onClick={acceptDraw} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl text-sm font-black">Qəbul Et</button>
              <button onClick={rejectDraw} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-xl text-sm font-black">Rədd Et</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
  `;
  c = c.replace(/<EndGameModal /, incomingUI + '\n      <EndGameModal ');

  // Update Draw Button
  c = c.replace(/<button className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-white transition flex items-center justify-center gap-2">\s*<Shield className="w-4 h-4" \/> Heç-heçə\s*<\/button>/, 
    `<button onClick={offerDraw} disabled={drawOfferedByMe} className={\`flex-1 py-2 rounded-xl text-sm font-bold text-white transition flex items-center justify-center gap-2 \${drawOfferedByMe ? 'bg-zinc-900 text-zinc-600' : 'bg-zinc-800 hover:bg-zinc-700'}\`}>
                  <Shield className="w-4 h-4" /> {drawOfferedByMe ? 'Gözlənilir...' : 'Heç-heçə'}
                </button>`);

  fs.writeFileSync('src/app/chess/page.tsx', c, 'utf8');
}
