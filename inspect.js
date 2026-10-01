const fs = require('fs');
const content = fs.readFileSync('src/app/chess/page.tsx', 'utf8');
const flagIdx = content.indexOf('<Flag className="w-4 h-4" />');
console.log(content.substring(flagIdx, flagIdx + 50));
for (let i = flagIdx; i < flagIdx + 50; i++) {
  console.log(content[i] + ' : ' + content.charCodeAt(i).toString(16));
}
