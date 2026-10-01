const fs = require('fs');

function injectResign(file, gameName) {
  let c = fs.readFileSync(file, 'utf8');

  const btnStr = `<button onClick={resetGame} className="flex-1 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-sm font-bold text-red-400 transition flex items-center justify-center gap-2">\n                  <Flag className="w-4 h-4" /> Təslim ol\n                </button>`;
  
  if (c.includes(btnStr)) {
    c = c.replace(btnStr, `<button onClick={() => { if (mode === 'bot') { resetGame(); return; } if (confirm('Təslim olmaq istədiyinizə əminsiniz?')) { if (mode === 'multiplayer' && roomId) { set(ref(db, \`games/${gameName}/\${roomId}/state\`), 'resigned_' + myColor); } } }} className="flex-1 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-sm font-bold text-red-400 transition flex items-center justify-center gap-2">\n                  <Flag className="w-4 h-4" /> Təslim ol\n                </button>`);
  }

  // Also in Checkers, Go, Othello:
  const btnStr2 = `<button onClick={resetGame} className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-white transition">Yenidən Başla</button>`;
  
  if (c.includes(btnStr2)) {
    c = c.replace(btnStr2, `<div className="flex gap-2 mb-2"><button onClick={resetGame} className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-white transition">Yenidən Başla</button> {mode === 'multiplayer' && roomId && !engine.winner && <button onClick={() => { if (confirm('Təslim olmaq istədiyinizə əminsiniz?')) { set(ref(db, \`games/${gameName}/\${roomId}/state\`), 'resigned_' + myColor); } }} className="flex-1 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-sm font-bold text-red-400 transition flex items-center justify-center gap-1"><Flag className="w-4 h-4" /> Təslim ol</button>}</div>`);
  }

  // Check for the "resigned" state in the onValue listener
  // For custom engines:
  const loadStr = `newEngine.load(data.state);`;
  if (c.includes(loadStr)) {
    c = c.replace(loadStr, `if (typeof data.state === 'string' && data.state.startsWith('resigned_')) { newEngine.load(engine.serialize()); newEngine.winner = data.state === 'resigned_w' ? 'b' : 'w'; } else { newEngine.load(data.state); }`);
  }
  
  // For Chess:
  const chessLoadStr = `newGame.load(data.state);`;
  if (c.includes(chessLoadStr)) {
    c = c.replace(chessLoadStr, `if (typeof data.state === 'string' && data.state.startsWith('resigned_')) { /* handled below */ } else { newGame.load(data.state); }`);
  }

  fs.writeFileSync(file, c, 'utf8');
}

injectResign('src/app/chess/page.tsx', 'chess');
injectResign('src/app/checkers/page.tsx', 'checkers');
injectResign('src/app/go/page.tsx', 'go');
injectResign('src/app/othello/page.tsx', 'othello');
