const fs = require('fs');
const path = require('path');

function rewriteUTF8(dir) {
  const files = fs.readdirSync(dir);
  for (let file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      rewriteUTF8(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js') || fullPath.endsWith('.json')) {
      try {
        // Force reading as utf8. If it has ANSI chars, they become replacement character (ef bf bd)
        let content = fs.readFileSync(fullPath, 'utf8');
        
        // Fix the specific strings we know got corrupted
        content = content.replace(/\uFFFDahmat/g, 'Şahmat')
                         .replace(/t\uFFFDtr\uFFFDFfind\uFFFDFn/g, 'tərəfindən')
                         .replace(/yarad\uFFFDlm\uFFFDY/g, 'yaradılmış')
                         .replace(/stol\u01ECst\u01EC/g, 'stolüstü')
                         .replace(/arenas\uFFFD/g, 'arenası');
        
        // Write back as strict UTF-8
        fs.writeFileSync(fullPath, content, 'utf8');
      } catch (e) {
        console.error(e);
      }
    }
  }
}

rewriteUTF8('src');
rewriteUTF8('public');
