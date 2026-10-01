const fs = require('fs');

/* ────────────────────────────────────────────
   Game page side-panel template
   Each game (chess,checkers,go,othello,connect4)
   should have the same sidebar block structure.
   We'll patch the sidebar header divs to use
   tdv-section-label and tdv-card classes.
──────────────────────────────────────────── */

const GAME_PAGES = [
  'src/app/checkers/page.tsx',
  'src/app/go/page.tsx',
  'src/app/othello/page.tsx',
  'src/app/connect4/page.tsx',
];

for (const p of GAME_PAGES) {
  let c = fs.readFileSync(p, 'utf8');
  if (c.includes('tdv-section-label')) continue;

  // Standardise section headers in sidebar
  c = c.replace(
    /className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2"/g,
    'className="tdv-section-label mb-2"'
  );
  c = c.replace(
    /className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2"/g,
    'className="tdv-section-label mb-2"'
  );

  // Sidebar cards — add subtle hover/transition
  c = c.replace(
    /className="bg-zinc-900\/80 border border-zinc-800 rounded-3xl p-4 flex flex-col gap-4"/g,
    'className="tdv-card p-5 flex flex-col gap-4"'
  );
  c = c.replace(
    /className="bg-zinc-900\/80 border border-zinc-800 rounded-3xl p-6 flex flex-col gap-4"/g,
    'className="tdv-card p-6 flex flex-col gap-4"'
  );

  fs.writeFileSync(p, c, 'utf8');
}

/* ── Homepage game cards — richer hover & gradient border ── */
let home = fs.readFileSync('src/app/page.tsx', 'utf8');
if (!home.includes('group/card')) {
  // Make game cards use a consistent group hover pattern
  home = home.replace(
    /className="group relative overflow-hidden bg-zinc-900\/60 border border-zinc-800 rounded-3xl p-6 flex flex-col gap-4 hover:border-zinc-600 hover:bg-zinc-900 transition-all duration-300 cursor-pointer backdrop-blur-md"/g,
    'className="group/card tdv-card relative overflow-hidden p-6 flex flex-col gap-5 cursor-pointer hover:shadow-[0_0_30px_rgba(59,130,246,0.08)] hover:border-zinc-600 hover:-translate-y-0.5 transition-all duration-300"'
  );
  fs.writeFileSync('src/app/page.tsx', home, 'utf8');
}

/* ── Connect4 page — match the dark themed board style ── */
let c4 = fs.readFileSync('src/app/connect4/page.tsx', 'utf8');
if (!c4.includes('board-themed')) {
  // Board background to match dark zinc palette
  c4 = c4.replace(
    /className="bg-blue-800 p-3 rounded-2xl grid gap-2"/,
    'className="board-themed bg-zinc-900 border border-zinc-700 p-3 rounded-2xl grid gap-2 shadow-[0_0_40px_rgba(0,0,0,0.5)]"'
  );
  // Cell holes
  c4 = c4.replace(
    /className="w-full aspect-square rounded-full bg-zinc-950 flex items-center justify-center overflow-hidden relative"/g,
    'className="w-full aspect-square rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden relative"'
  );
  fs.writeFileSync('src/app/connect4/page.tsx', c4, 'utf8');
}

/* ── Profile page — make stats cards use tdv-card ── */
let prof = fs.readFileSync('src/app/profile/page.tsx', 'utf8');
if (!prof.includes('tdv-card-glow')) {
  // Main profile card
  prof = prof.replace(
    /className=\{`rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md border/,
    'className={`tdv-card tdv-card-glow relative overflow-hidden p-6 md:p-8 border'
  );
  fs.writeFileSync('src/app/profile/page.tsx', prof, 'utf8');
}

console.log('Deep harmonization done!');
