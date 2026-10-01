const fs = require('fs');
let c = fs.readFileSync('src/app/chess/page.tsx', 'utf8');

// Simple targeted replacement of the Chessboard element
const oldBoard = `          {/* @ts-ignore */}
          <Chessboard 
            position={game.fen()} 
            onPieceDrop={onDrop}
            boardOrientation={myColor === 'w' ? 'white' : 'black'}
            customDarkSquareStyle={{ backgroundColor: '#27272a' }}
            customLightSquareStyle={{ backgroundColor: '#e4e4e7' }}
            animationDuration={200}
          />`;

const newBoard = `          {/* @ts-ignore */}
          {/* @ts-ignore */}
          <Chessboard 
            {...({} as any)}
            position={game.fen()} 
            onPieceDrop={onDrop}
            onSquareClick={onSquareClick}
            boardOrientation={myColor === 'w' ? 'white' : 'black'}
            customDarkSquareStyle={{ backgroundColor: themes[theme]?.dark || '#27272a' }}
            customLightSquareStyle={{ backgroundColor: themes[theme]?.light || '#e4e4e7' }}
            customSquareStyles={optionSquares}
            animationDuration={200}
          />`;

if (c.includes('position={game.fen()}') && !c.includes('{...({} as any)}')) {
  // Just add the spread and suppress properly
  c = c.replace(
    /<Chessboard \n\s*position=\{game\.fen\(\)\}/,
    `<Chessboard \n            {...({} as any)}\n            position={game.fen()}`
  );
  // Add onSquareClick and customSquareStyles if missing
  if (!c.includes('onSquareClick={onSquareClick}')) {
    c = c.replace('onPieceDrop={onDrop}', 'onPieceDrop={onDrop}\n            onSquareClick={onSquareClick}');
  }
  if (!c.includes('customSquareStyles={optionSquares}')) {
    c = c.replace('animationDuration={200}', 'customSquareStyles={optionSquares}\n            animationDuration={200}');
  }
  // Apply board theme colors
  c = c.replace(
    "customDarkSquareStyle={{ backgroundColor: '#27272a' }}",
    "customDarkSquareStyle={{ backgroundColor: themes[theme]?.dark || '#27272a' }}"
  );
  c = c.replace(
    "customLightSquareStyle={{ backgroundColor: '#e4e4e7' }}",
    "customLightSquareStyle={{ backgroundColor: themes[theme]?.light || '#e4e4e7' }}"
  );
}

fs.writeFileSync('src/app/chess/page.tsx', c, 'utf8');
