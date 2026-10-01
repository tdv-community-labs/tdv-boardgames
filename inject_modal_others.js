const fs = require('fs');

function injectModal(file, gameName) {
  let c = fs.readFileSync(file, 'utf8');

  if (!c.includes('EndGameModal')) {
    // Add import
    c = c.replace(/import Link from 'next\/link';/, "import Link from 'next/link';\nimport EndGameModal from '@/components/EndGameModal';");

    let userBotColor = '';
    if (gameName === 'checkers') userBotColor = 'w';
    if (gameName === 'othello') userBotColor = 'b';
    if (gameName === 'go') userBotColor = 'b';

    const resultLogic = `
  let gameResult: 'win' | 'loss' | 'draw' | null = null;
  if (engine.winner) {
    if (engine.winner === 'draw') {
      gameResult = 'draw';
    } else {
      if (mode === 'multiplayer') {
        gameResult = engine.winner === myColor ? 'win' : 'loss';
      } else {
        gameResult = engine.winner === '${userBotColor}' ? 'win' : 'loss';
      }
    }
  }
  `;

    const mainReturnRegex = /return \(\s*<div className="max-w-7xl/m;
    
    if (mainReturnRegex.test(c)) {
       c = c.replace(mainReturnRegex, resultLogic + '\n  return (\n    <div className="max-w-7xl');
       
       c = c.replace(/<div className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8 relative z-10 pt-24">/, `<div className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8 relative z-10 pt-24">\n      <EndGameModal isOpen={gameResult !== null} result={gameResult} onRematch={() => { setMode("bot"); resetGame(); }} />`);
    }

    fs.writeFileSync(file, c, 'utf8');
  }
}

injectModal('src/app/checkers/page.tsx', 'checkers');
injectModal('src/app/othello/page.tsx', 'othello');
injectModal('src/app/go/page.tsx', 'go');
