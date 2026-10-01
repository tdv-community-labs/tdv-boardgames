const fs = require('fs');

function addLastMoveUI(file, gameName) {
  let c = fs.readFileSync(file, 'utf8');

  if (gameName === 'checkers') {
    if (!c.includes('isLastMoveFrom')) {
      c = c.replace(/const isPossibleMove =/g, `const isLastMoveFrom = engine.lastMove && engine.lastMove.from.r === rIndex && engine.lastMove.from.c === cIndex;\n              const isLastMoveTo = engine.lastMove && engine.lastMove.to.r === rIndex && engine.lastMove.to.c === cIndex;\n              const isPossibleMove =`);
      
      c = c.replace(/className=\{\`w-full h-full flex items-center justify-center relative cursor-pointer transition-all/g, `className={\`w-full h-full flex items-center justify-center relative cursor-pointer transition-all \${isLastMoveFrom || isLastMoveTo ? 'after:content-[""] after:absolute after:inset-0 after:bg-yellow-400/30 after:z-0' : ''}`);
    }
  }
  
  if (gameName === 'othello') {
    if (!c.includes('isLastMove =')) {
      c = c.replace(/const isMove = /g, `const isLastMove = engine.lastMove && engine.lastMove.to.r === r && engine.lastMove.to.c === c;\n              const isMove = `);
      
      c = c.replace(/className="w-full h-full border border-\[#15803d\] flex items-center justify-center relative cursor-pointer"/g, 'className={`w-full h-full border border-[#15803d] flex items-center justify-center relative cursor-pointer ${isLastMove ? \'bg-yellow-400/30\' : \'\'}`}');
    }
  }

  if (gameName === 'go') {
    if (!c.includes('isLastMove =')) {
      c = c.replace(/return \(\n                <div/g, `const isLastMove = engine.lastMove && engine.lastMove.to.r === r && engine.lastMove.to.c === c;\n              return (\n                <div`);
      
      c = c.replace(/className="relative w-full h-full"/g, 'className={`relative w-full h-full ${isLastMove ? \'after:content-[""] after:absolute after:w-full after:h-full after:bg-yellow-400/40 after:rounded-full after:scale-[1.3] after:z-0\' : \'\'}`}');
    }
  }

  fs.writeFileSync(file, c, 'utf8');
}

addLastMoveUI('src/app/checkers/page.tsx', 'checkers');
addLastMoveUI('src/app/othello/page.tsx', 'othello');
addLastMoveUI('src/app/go/page.tsx', 'go');
