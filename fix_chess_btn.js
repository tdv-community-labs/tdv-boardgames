const fs = require('fs');

let c = fs.readFileSync('src/app/chess/page.tsx', 'utf8');

const target = /<Users className="w-4 h-4" \/>\s*([^<]+)<\/button>/;
const match = c.match(target);
if (match) {
   c = c.replace(target, `<Users className="w-4 h-4" /> ` + match[1].trim() + `</button>\n              <button onClick={createPrivateRoom} className="w-full py-3 mb-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-bold text-white transition flex items-center justify-center gap-2">\n                <LinkIcon className="w-4 h-4" /> Dostla Oyna (Link)\n              </button>`);
   fs.writeFileSync('src/app/chess/page.tsx', c, 'utf8');
}
