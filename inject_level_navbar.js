const fs = require('fs');
let c = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

if (!c.includes('setLevel')) {
  // Add level state
  c = c.replace(/const \[elo, setElo\] = useState<number>\(1200\);/, "const [elo, setElo] = useState<number>(1200);\n  const [level, setLevel] = useState<number>(1);");

  // Load level state
  c = c.replace(/if \(snap\.val\(\)\.avatar\) setAvatar\(snap\.val\(\)\.avatar\);/, "if (snap.val().avatar) setAvatar(snap.val().avatar);\n              const totalMatches = (snap.val().wins || 0) + (snap.val().losses || 0);\n              setLevel(Math.floor(Math.sqrt(totalMatches)) + 1);");

  // Show level in UI next to the avatar
  c = c.replace(/<span className="text-xl leading-none">\{avatar\}<\/span>\n\s*<div className="flex flex-col">/, `<span className="text-xl leading-none relative">
                {avatar}
                <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white text-[8px] font-black px-1 rounded-sm shadow-md">
                  L{level}
                </span>
              </span>
              <div className="flex flex-col">`);

  fs.writeFileSync('src/components/Navbar.tsx', c, 'utf8');
}
