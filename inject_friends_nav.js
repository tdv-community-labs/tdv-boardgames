const fs = require('fs');

// Add /friends link to Navbar
let n = fs.readFileSync('src/components/Navbar.tsx', 'utf8');
if (!n.includes('/friends')) {
  // Add Friends link beside Leaderboard
  n = n.replace(
    /href="\/leaderboard"/,
    `href="/friends" className={navLinkClass('/friends')}>
              <Users className="w-4 h-4 sm:hidden" />
              <span className="hidden sm:inline">Dostlar</span>
            </Link>
            <Link href="/leaderboard"`
  );
  // Add Users to imports
  n = n.replace(/Gamepad2, Trophy, User,/, 'Gamepad2, Trophy, User, Users,');
  fs.writeFileSync('src/components/Navbar.tsx', n, 'utf8');
}
