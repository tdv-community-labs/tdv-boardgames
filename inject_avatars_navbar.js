const fs = require('fs');

let c = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

if (!c.includes('const [avatar')) {
  // Add state
  c = c.replace(/const \[elo, setElo\] = useState<number>\(1200\);/, "const [elo, setElo] = useState<number>(1200);\n  const [avatar, setAvatar] = useState<string>('😎');");

  // Fetch avatar
  c = c.replace(/if \(snap\.exists\(\)\) setElo\(snap\.val\(\)\.elo \|\| 1200\);/, "if (snap.exists()) {\n              setElo(snap.val().elo || 1200);\n              if (snap.val().avatar) setAvatar(snap.val().avatar);\n            }");

  // Render avatar
  c = c.replace(/<User className="w-5 h-5 text-white" \/>/, '<span className="text-xl leading-none">{avatar}</span>');

  fs.writeFileSync('src/components/Navbar.tsx', c, 'utf8');
}
