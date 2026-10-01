const fs = require('fs');

let c = fs.readFileSync('src/app/leaderboard/page.tsx', 'utf8');

if (!c.includes('getRank')) {
  // Add import
  c = c.replace(/import Link from 'next\/link';/, "import Link from 'next/link';\nimport { getRank } from '@/utils/ranks';");

  // Display rank in the leaderboard list
  // Look for: <div className="font-bold text-white text-lg">{u.displayName}</div>
  if (c.includes('<div className="font-bold text-white text-lg">{u.displayName}</div>')) {
     c = c.replace(/<div className="font-bold text-white text-lg">\{u.displayName\}<\/div>/, `{(() => { const r = getRank(u.elo || 1200); return <div className="flex flex-col"><div className="font-bold text-white text-lg flex items-center gap-2">{u.displayName} <span title={r.name} className="text-sm">{r.icon}</span></div><div className={\`text-xs font-black uppercase tracking-widest \${r.color}\`}>{r.name}</div></div>; })()}`);
  }

  // Display rank for Top 3 podium
  if (c.includes('<div className="font-bold text-white truncate px-2">{u.displayName}</div>')) {
     c = c.replace(/<div className="font-bold text-white truncate px-2">\{u.displayName\}<\/div>/g, `{(() => { const r = getRank(u.elo || 1200); return <div className="font-bold text-white truncate px-2 flex items-center justify-center gap-1">{u.displayName} <span title={r.name} className="text-xs">{r.icon}</span></div>; })()}`);
  }

  fs.writeFileSync('src/app/leaderboard/page.tsx', c, 'utf8');
}
