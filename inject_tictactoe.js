const fs = require('fs');
const file = 'src/app/page.tsx';
let c = fs.readFileSync(file, 'utf8');

const tictactoeGame = `  {
    id: "tictactoe",
    name: "XOX",
    icon: "❌",
    description: "Klassik Tic-Tac-Toe. 3 eyni işarəni yan-yana düzün.",
    color: "from-indigo-500/20 to-indigo-900/40",
    borderColor: "border-indigo-500/30",
    textColor: "text-indigo-400",
    players: "300+",
    badge: "Yeni"
  }`;

if (!c.includes('id: "tictactoe"')) {
  c = c.replace(/];/, `,\n${tictactoeGame}\n];`);
}

fs.writeFileSync(file, c, 'utf8');
