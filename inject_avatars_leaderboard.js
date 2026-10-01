const fs = require('fs');

let c = fs.readFileSync('src/app/leaderboard/page.tsx', 'utf8');

if (!c.includes('avatar?')) {
  // Add avatar to Player interface
  c = c.replace(/displayName: string;/, "displayName: string;\n    avatar?: string;");
  
  // Render avatar in Top 3
  c = c.replace(/<div className="text-sm text-white\/50 font-medium">\{u\.wins\} Q \| \{u\.losses\} M<\/div>\n\s*<\/div>\n\s*<\/div>/g, '<div className="text-sm text-white/50 font-medium">{u.wins} Q | {u.losses} M</div>\n                </div>\n                <div className="absolute top-2 right-2 text-2xl filter drop-shadow-md">{u.avatar || \'😎\'}</div>\n              </div>');

  // Render avatar in rest of list (which has "w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 font-bold")
  c = c.replace(/<div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 font-bold">\s*\{u\.displayName\.charAt\(0\)\}\s*<\/div>/g, '<div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xl filter drop-shadow-sm">\n                  {u.avatar || \'😎\'}\n                </div>');

  fs.writeFileSync('src/app/leaderboard/page.tsx', c, 'utf8');
}
