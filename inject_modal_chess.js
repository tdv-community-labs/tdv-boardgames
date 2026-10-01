const fs = require('fs');

let c = fs.readFileSync('src/app/chess/page.tsx', 'utf8');

if (!c.includes('EndGameModal')) {
  c = c.replace(/import Link from 'next\/link';/, "import Link from 'next/link';\nimport EndGameModal from '@/components/EndGameModal';");

  const resultLogic = `
  let gameResult: 'win' | 'loss' | 'draw' | null = null;
  if (game.isGameOver() || (typeof engineWinner === 'string' && engineWinner.startsWith('resigned_'))) {
    if (game.isDraw() || game.isStalemate() || game.isThreefoldRepetition() || game.isInsufficientMaterial()) {
      gameResult = 'draw';
    } else {
      let finalWinner = '';
      if (typeof engineWinner === 'string' && engineWinner.startsWith('resigned_')) {
        finalWinner = engineWinner === 'resigned_w' ? 'b' : 'w';
      } else {
        finalWinner = game.turn() === 'w' ? 'b' : 'w';
      }
      
      if (mode === 'multiplayer') {
        gameResult = finalWinner === myColor ? 'win' : 'loss';
      } else {
        gameResult = finalWinner === 'w' ? 'win' : 'loss';
      }
    }
  }
  `;

  const mainReturnRegex = /return \(\s*<div className="max-w-7xl/m;
  
  if (mainReturnRegex.test(c)) {
     c = c.replace(mainReturnRegex, resultLogic + '\n  return (\n    <div className="max-w-7xl');
     
     c = c.replace(/<div className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8 relative z-10 pt-24">/, '<div className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8 relative z-10 pt-24">\n      <EndGameModal isOpen={gameResult !== null} result={gameResult} onRematch={() => { setMode("bot"); resetGame(); }} />');
  }

  fs.writeFileSync('src/app/chess/page.tsx', c, 'utf8');
}
