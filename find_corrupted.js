const fs = require('fs');
const path = require('path');

function findCorrupted(dir) {
  const files = fs.readdirSync(dir);
  for (let file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      findCorrupted(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('\uFFFD')) {
        console.log(`Corrupted: ${fullPath}`);
        // print a few surrounding characters
        let idx = content.indexOf('\uFFFD');
        while (idx !== -1) {
           console.log(content.substring(Math.max(0, idx - 10), Math.min(content.length, idx + 10)).replace(/\n/g, ' '));
           idx = content.indexOf('\uFFFD', idx + 1);
        }
      }
    }
  }
}

findCorrupted('src');
