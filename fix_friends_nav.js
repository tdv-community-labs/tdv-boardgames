const fs = require('fs');
let c = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

// Fix the broken Friends link (replace navLinkClass which doesn't exist)
c = c.replace(
  `<Link href="/friends" className={navLinkClass('/friends')}>
              <Users className="w-4 h-4 sm:hidden" />
              <span className="hidden sm:inline">Dostlar</span>
            </Link>`,
  `<Link href="/friends" className={\`text-sm font-bold flex items-center gap-2 transition-colors \${pathname === '/friends' ? 'text-blue-400' : 'text-zinc-400 hover:text-blue-400'}\`}>
              <Users className="w-4 h-4" />
              <span className="hidden sm:block">Dostlar</span>
            </Link>`
);

fs.writeFileSync('src/components/Navbar.tsx', c, 'utf8');
