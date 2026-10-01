const fs = require('fs');
let c = fs.readFileSync('src/app/chess/page.tsx', 'utf8');

// Disable moves for spectators
if (!c.includes("toast.error('İzləyicilər gediş edə bilməz!');")) {
   c = c.replace(/if \(mode === 'bot' && game\.turn\(\) === 'b'\) return false;/, "if (isSpectator) { toast.error('İzləyicilər gediş edə bilməz!'); return false; }\n    if (mode === 'bot' && game.turn() === 'b') return false;");
}

// Ignore game result for spectator
if (!c.includes('isSpectator ? null :')) {
   c = c.replace(/gameResult = finalWinner === myColor \? 'win' : 'loss';/g, "gameResult = isSpectator ? null : (finalWinner === myColor ? 'win' : 'loss');");
}

// Add "İzləmə Linki" button
if (!c.includes('İzləyici Linki')) {
   // Import Eye icon
   if (!c.includes('Eye')) {
     c = c.replace(/import \{([^}]+)\} from 'lucide-react';/, "import { $1, Eye } from 'lucide-react';");
   }

   const specBtn = `
              <button onClick={() => {
                const link = \`\${window.location.origin}/chess?watch=\${roomId}\`;
                navigator.clipboard.writeText(link).then(() => toast.success('İzləyici linki kopyalandı!'));
              }} className="w-full py-2 mb-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-white transition flex items-center justify-center gap-2">
                <Eye className="w-4 h-4" /> İzləyici Linki
              </button>
  `;
   c = c.replace(/<button onClick=\{createPrivateRoom\}/, specBtn + '\n              <button onClick={createPrivateRoom}');
   
   // Replace Resign button for spectator
   c = c.replace(/<button onClick=\{resetGame\} className="flex-1 py-2 rounded-xl bg-red-500\/10 hover:bg-red-500\/20 text-sm font-bold text-red-400 transition flex items-center justify-center gap-2">\s*<Flag className="w-4 h-4" \/> Təslim ol\s*<\/button>/, `{isSpectator ? <div className="flex-1 py-2 rounded-xl bg-zinc-800 text-sm font-bold text-zinc-500 flex items-center justify-center gap-2"><Eye className="w-4 h-4"/> İzləyici</div> : <button onClick={resetGame} className="flex-1 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-sm font-bold text-red-400 transition flex items-center justify-center gap-2"><Flag className="w-4 h-4" /> Təslim ol</button>}`);
}

fs.writeFileSync('src/app/chess/page.tsx', c, 'utf8');
