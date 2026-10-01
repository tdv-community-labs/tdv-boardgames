const fs = require('fs');
let c = fs.readFileSync('src/app/page.tsx', 'utf8');

if (!c.includes('connect4')) {
  const c4Obj = `
  {
    id: "connect4",
    name: "Dördünü Birləşdir",
    icon: "🔴",
    description: "Rəngli daşları salın və 4 daşı yan-yana, alt-alta və ya diaqonal birləşdirin.",
    color: "from-red-500/20 to-red-900/40",
    borderColor: "border-red-500/30",
    textColor: "text-red-400",
    players: "0",
    badge: "YENİ"
  },`;
  c = c.replace(/const GAMES = \[/, 'const GAMES = [\n' + c4Obj);
  fs.writeFileSync('src/app/page.tsx', c, 'utf8');
}
