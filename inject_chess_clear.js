const fs = require('fs');
let c = fs.readFileSync('src/app/chess/page.tsx', 'utf8');

if (!c.includes('setOptionSquares({}); // clear')) {
  c = c.replace(/if \(move\.captured\) playCaptureSound\(\);/, "if (move.captured) playCaptureSound();\n        setOptionSquares({}); // clear\n        setMoveFrom(null);");
  fs.writeFileSync('src/app/chess/page.tsx', c, 'utf8');
}
