const fs = require('fs');

function addFlag(file) {
  let c = fs.readFileSync(file, 'utf8');
  if (!c.includes(', Flag')) {
    c = c.replace(/import \{([^}]+)\} from 'lucide-react';/, (match, p1) => {
       if (!p1.includes('Flag')) {
          return `import { ${p1}, Flag } from 'lucide-react';`;
       }
       return match;
    });
    fs.writeFileSync(file, c, 'utf8');
  }
}

addFlag('src/app/checkers/page.tsx');
addFlag('src/app/go/page.tsx');
addFlag('src/app/othello/page.tsx');
