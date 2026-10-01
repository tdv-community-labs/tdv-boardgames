const fs = require('fs');

let c = fs.readFileSync('src/app/go/page.tsx', 'utf8');

if (!c.includes('isLastMove')) {
  c = c.replace(/return \(\s*<div\s*key=\{\`\$\{r\}-\$\{c\}\`\}/g, `const isLastMove = engine.lastMove && engine.lastMove.r === r && engine.lastMove.c === c;\n                  return (\n                    <div \n                      key={\`\${r}-\${c}\`}`);
  c = c.replace(/className="relative w-full h-full"/g, 'className={`relative w-full h-full ${isLastMove ? \'after:content-[""] after:absolute after:w-full after:h-full after:bg-yellow-400/40 after:rounded-full after:scale-[1.3] after:z-0\' : \'\'}`}');
  fs.writeFileSync('src/app/go/page.tsx', c, 'utf8');
}
