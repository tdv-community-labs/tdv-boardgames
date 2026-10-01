const fs = require('fs');
const file = 'src/app/page.tsx';
let c = fs.readFileSync(file, 'utf8');

// Replace the entire block from `,\n    {\n      id: "tictactoe"` to `}`
// We'll just regex replace it.
c = c.replace(/,\s*\{\s*id:\s*"tictactoe"[\s\S]*?badge:\s*"Yeni"\s*\}/, '');

fs.writeFileSync(file, c, 'utf8');
