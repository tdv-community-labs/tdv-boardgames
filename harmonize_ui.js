const fs = require('fs');

/* ── 1. Layout — add tdv-grid-bg to body wrapper ── */
let layout = fs.readFileSync('src/app/layout.tsx', 'utf8');
if (!layout.includes('tdv-grid-bg')) {
  layout = layout.replace(
    /className="[^"]*antialiased[^"]*"/,
    'className="min-h-screen bg-zinc-950 antialiased tdv-grid-bg"'
  );
  fs.writeFileSync('src/app/layout.tsx', layout, 'utf8');
}

/* ── 2. Homepage — tighten hero, add gradient text ── */
let home = fs.readFileSync('src/app/page.tsx', 'utf8');

// Replace plain title with gradient version
if (!home.includes('tdv-gradient-text-blue')) {
  home = home.replace(
    /className="text-4xl sm:text-6xl font-black text-white text-center leading-tight mb-4"/,
    'className="text-4xl sm:text-6xl font-black text-center leading-tight mb-4 tdv-gradient-text"'
  );
  // Subtitle
  home = home.replace(
    /className="text-zinc-400 text-center text-lg mb-12 max-w-xl mx-auto"/,
    'className="text-zinc-500 text-center text-lg mb-12 max-w-xl mx-auto text-balance"'
  );
  fs.writeFileSync('src/app/page.tsx', home, 'utf8');
}

/* ── 3. Login page — match dark theme ── */
let login = fs.readFileSync('src/app/login/page.tsx', 'utf8');
if (!login.includes('tdv-card')) {
  login = login
    .replace(/className="min-h-screen[^"]*"/, 'className="min-h-screen bg-zinc-950 flex items-center justify-center p-4"')
    .replace(/className="bg-white[^"]*"/, 'className="tdv-card w-full max-w-sm p-8"')
    .replace(/className="w-full py-3[^"]*text-white[^"]*"/, 'className="tdv-btn tdv-btn-primary w-full py-3 text-base"');
  fs.writeFileSync('src/app/login/page.tsx', login, 'utf8');
}

/* ── 4. Leaderboard — stronger hierarchy ── */
let lb = fs.readFileSync('src/app/leaderboard/page.tsx', 'utf8');
if (!lb.includes('tdv-page-content')) {
  lb = lb.replace(
    /className="max-w-4xl mx-auto px-4 py-24 relative"/,
    'className="max-w-4xl mx-auto px-4 py-24 relative tdv-page-content"'
  );
  lb = lb.replace(
    /className="text-3xl font-black text-white text-center mb-2"/,
    'className="tdv-h2 text-center mb-2 tdv-gradient-text"'
  );
  fs.writeFileSync('src/app/leaderboard/page.tsx', lb, 'utf8');
}

/* ── 5. Friends page — use tdv-card class on friend rows ── */
let friends = fs.readFileSync('src/app/friends/page.tsx', 'utf8');
if (!friends.includes('tdv-card')) {
  // Replace the inner motion.div className
  friends = friends.replace(
    /className=\{`relative p-4 rounded-2xl border flex items-center gap-4 \$\{BANNER_STYLES\[friend\.banner \|\| 'default'\]\}`\}/,
    'className={`tdv-card relative p-4 flex items-center gap-4 transition-all hover:scale-[1.01] ${BANNER_STYLES[friend.banner || \'default\']}`}'
  );
  fs.writeFileSync('src/app/friends/page.tsx', friends, 'utf8');
}

/* ── 6. Profile — header gradient ── */
let profile = fs.readFileSync('src/app/profile/page.tsx', 'utf8');
if (!profile.includes('tdv-h2')) {
  profile = profile.replace(
    /className="text-3xl font-black text-white mb-1"/,
    'className="tdv-h2 mb-1"'
  );
  fs.writeFileSync('src/app/profile/page.tsx', profile, 'utf8');
}

console.log('Design system harmonization complete!');
