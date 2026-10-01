const fs = require('fs');

let c = fs.readFileSync('src/app/profile/page.tsx', 'utf8');

if (!c.includes('getRank')) {
  // Add import
  c = c.replace(/import \{ useRouter \} from 'next\/navigation';/, "import { useRouter } from 'next/navigation';\nimport { getRank } from '@/utils/ranks';");

  // Get rank based on stats.elo
  if (c.includes('const totalMatches')) {
    c = c.replace(/const totalMatches = \(stats.wins \|\| 0\) \+ \(stats.losses \|\| 0\);/, "const totalMatches = (stats.wins || 0) + (stats.losses || 0);\n  const rank = getRank(stats.elo || 1200);");
  }

  // Display rank in Profile Card
  if (c.includes('<p className="text-sm text-zinc-500 mt-1">{user.email}</p>')) {
     c = c.replace('<p className="text-sm text-zinc-500 mt-1">{user.email}</p>', `<p className="text-sm text-zinc-500 mt-1">{user.email}</p>\n                <div className={\`mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-950 border border-zinc-800 font-black text-sm \${rank.color}\`}>\n                  {rank.icon} {rank.name}\n                </div>`);
  }

  fs.writeFileSync('src/app/profile/page.tsx', c, 'utf8');
}
