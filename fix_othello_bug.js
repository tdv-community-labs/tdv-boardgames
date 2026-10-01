const fs = require('fs');

function fixOthello() {
  const file = 'src/app/othello/page.tsx';
  let c = fs.readFileSync(file, 'utf8');

  // 1. Fix Multiplayer Sync
  c = c.replace(
    /engine\.move\(r, c\);\n\s*setBoard/,
    "engine.move(r, c);\n        if (mode === 'multiplayer' && roomId) { const { set, ref } = require('firebase/database'); set(ref(db, \`games/othello/\${roomId}/state\`), engine.serialize()); }\n        setBoard"
  );
  
  // 2. Fix AI bot setTimeout closure
  if (c.includes('setTimeout(() => {')) {
    const aiReplacement = `
    // AI Bot Logic
    let timeoutId: any;
    if (mode === 'bot' && engine.turn === 'w' && !engine.winner) {
      timeoutId = setTimeout(() => {
        const bestMove = engine.getBestMove();
        if (bestMove) {
          engine.move(bestMove.r, bestMove.c);
          setBoard([...engine.board.map(r => [...r])]);
          updateStatus();
          playCaptureSound();
        }
      }, 800);
    }
    return () => { if (timeoutId) clearTimeout(timeoutId); };
  }, [board, engine.turn, mode, engine.winner]);
    `;
    
    // Replace everything from "// AI Bot Logic" to the end of useEffect
    c = c.replace(
      /\/\/\s*AI Bot Logic[\s\S]*?\}, \[board, engine\.turn\]\);/,
      aiReplacement.trim()
    );
  }
  
  fs.writeFileSync(file, c, 'utf8');
}

fixOthello();
