const fs = require('fs');
const file = 'src/app/page.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/game\.id === 'othello' \? '#' : /g, '');

fs.writeFileSync(file, c, 'utf8');
