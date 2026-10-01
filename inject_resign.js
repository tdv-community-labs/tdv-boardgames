const fs = require('fs');

function injectResign(file, gameName) {
  let c = fs.readFileSync(file, 'utf8');

  // Find the reset button or similar block
  if (!c.includes('Təslim Ol') && !c.includes('T\\uFFFDtslim ol')) {
     // If it's Othello
     if (c.includes('>Yenidən Başla</button>')) {
       c = c.replace(
         />Yenidən Başla<\/button>/,
         `>Yenidən Başla</button>\n          {mode === 'multiplayer' && roomId && !engine.winner && (\n            <button onClick={() => { if(confirm('Təslim olmaq istədiyinizə əminsiniz?')) { engine.winner = myColor === 'w' ? 'b' : 'w'; set(ref(db, \`games/${gameName}/\${roomId}/state\`), engine.serialize()); updateStatus(engine); } }} className="w-full py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-sm font-bold text-red-400 transition flex items-center justify-center gap-2 mt-2">\n              <Flag className="w-4 h-4" /> Təslim Ol\n            </button>\n          )}`
       );
     }
  }

  fs.writeFileSync(file, c, 'utf8');
}

injectResign('src/app/othello/page.tsx', 'othello');
