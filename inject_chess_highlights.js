const fs = require('fs');

let c = fs.readFileSync('src/app/chess/page.tsx', 'utf8');

c = c.replace(/import \{ ref, get, set, remove, onValue, push, serverTimestamp, onDisconnect \} from 'firebase\/database';/, "import { ref, get, set, remove, onValue, push, serverTimestamp, onDisconnect, update } from 'firebase/database';");

c = c.replace(/const \[moves, setMoves\] = useState<Move\[\]>\(\[\]\);/, "const [moves, setMoves] = useState<Move[]>([]);\n  const [optionSquares, setOptionSquares] = useState<{ [square: string]: { background: string; borderRadius?: string } }>({});\n  const [moveFrom, setMoveFrom] = useState<string | null>(null);");

const squareClickFn = `
  const onSquareClick = (square: string) => {
    if (isSpectator) return;
    if (game.isGameOver() || engineWinner) return;
    if (mode === 'multiplayer' && game.turn() !== myColor) return;
    if (mode === 'bot' && game.turn() === 'b') return;

    if (!moveFrom) {
      const hasMoveOptions = getMoveOptions(square);
      if (hasMoveOptions) setMoveFrom(square);
      return;
    }

    const movesObj = game.moves({ square: moveFrom as any, verbose: true }) as Move[];
    const foundMove = movesObj.find((m) => m.to === square);

    if (!foundMove) {
      const hasMoveOptions = getMoveOptions(square);
      setMoveFrom(hasMoveOptions ? square : null);
      return;
    }

    try {
      const move = game.move({ from: moveFrom, to: square, promotion: 'q' });
      if (move) {
        setMoves(game.history({ verbose: true }) as Move[]);
        updateStatus(game);
        setOptionSquares({});
        setMoveFrom(null);
        playMoveSound();
        if (move.captured) playCaptureSound();
        
        if (mode === 'multiplayer' && roomId) {
          update(ref(db, \`games/chess/\${roomId}\`), { fen: game.fen() });
        }
      }
    } catch (e) {
      setMoveFrom(null);
      setOptionSquares({});
    }
  };

  const getMoveOptions = (square: string) => {
    const movesObj = game.moves({ square: square as any, verbose: true }) as Move[];
    if (movesObj.length === 0) {
      setOptionSquares({});
      return false;
    }
    const newSquares: any = {};
    movesObj.forEach((m) => {
      newSquares[m.to] = {
        background: game.get(m.to as any) && game.get(m.to as any)?.color !== game.get(square as any)?.color
          ? 'radial-gradient(circle, rgba(0,0,0,.3) 85%, transparent 85%)'
          : 'radial-gradient(circle, rgba(0,0,0,.3) 25%, transparent 25%)',
        borderRadius: '50%'
      };
    });
    newSquares[square] = { background: 'rgba(255, 255, 0, 0.4)' };
    setOptionSquares(newSquares);
    return true;
  };
`;
c = c.replace(/const updateStatus = /, squareClickFn + '\n  const updateStatus = ');

c = c.replace(/customDarkSquareStyle=\{\{ backgroundColor: themes\[theme\]\.dark \}\}/, "customDarkSquareStyle={{ backgroundColor: themes[theme].dark }}\n                  customSquareStyles={optionSquares}\n                  onSquareClick={onSquareClick}");

c = c.replace(/setGame\(newGame\);\n\s*setMoves\(newGame\.history\(\{ verbose: true \}\) as Move\[\]\);/g, "setGame(newGame);\n            setMoves(newGame.history({ verbose: true }) as Move[]);\n            setOptionSquares({});\n            setMoveFrom(null);");

c = c.replace(/setGame\(new Chess\(\)\);\n\s*setMoves\(\[\]\);/g, "setGame(new Chess());\n    setMoves([]);\n    setOptionSquares({});\n    setMoveFrom(null);");

c = c.replace(/if \(move\.captured\) playCaptureSound\(\);/g, "if (move.captured) playCaptureSound();\n        setOptionSquares({});\n        setMoveFrom(null);");

fs.writeFileSync('src/app/chess/page.tsx', c, 'utf8');
