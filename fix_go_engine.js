const fs = require('fs');

let c = fs.readFileSync('src/app/go/engine.ts', 'utf8');
c = c.replace(/lastMove: any = null;\r?\n/, '');
fs.writeFileSync('src/app/go/engine.ts', c, 'utf8');
