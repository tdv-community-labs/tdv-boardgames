const fs = require('fs');
let n = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

// Replace the old header className with a more polished one
if (!n.includes('tdv-navbar')) {
  n = n.replace(
    /className="fixed top-0 left-0 right-0 z-50[^"]*"/,
    'className="fixed top-0 left-0 right-0 z-50 h-16 bg-zinc-950/80 border-b border-zinc-800/60 backdrop-blur-xl"'
  );
  // Inner container
  n = n.replace(
    /className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between"/,
    'className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between gap-4"'
  );
  // Logo — make it pop
  n = n.replace(
    /className="text-xl font-black text-white flex items-center gap-2"/,
    'className="text-xl font-black flex items-center gap-2 tdv-gradient-text-blue shrink-0"'
  );
  fs.writeFileSync('src/components/Navbar.tsx', n, 'utf8');
}
