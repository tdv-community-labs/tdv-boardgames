const fs = require('fs');
let c = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

if (!c.includes('setCoins')) {
  // Add state
  c = c.replace(/const \[level, setLevel\] = useState<number>\(1\);/, "const [level, setLevel] = useState<number>(1);\n  const [coins, setCoins] = useState<number>(0);");

  // Load state
  c = c.replace(/setLevel\(Math\.floor\(Math\.sqrt\(totalMatches\)\) \+ 1\);/, "setLevel(Math.floor(Math.sqrt(totalMatches)) + 1);\n              const totalCoins = ((snap.val().wins || 0) * 15) + ((snap.val().losses || 0) * 2);\n              setCoins(totalCoins - (snap.val().spentCoins || 0));");

  // Render state in Navbar right before Avatar
  const coinUI = `
              <Link href="/profile" className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-yellow-400/10 border border-yellow-500/20 rounded-full hover:bg-yellow-400/20 transition-colors">
                <span className="text-xs font-black text-yellow-400">{coins}</span>
                <span className="text-sm">🪙</span>
              </Link>
  `;
  c = c.replace(/<span className="text-xl leading-none relative">/, coinUI + '\n              <span className="text-xl leading-none relative">');

  fs.writeFileSync('src/components/Navbar.tsx', c, 'utf8');
}
