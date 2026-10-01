const fs = require('fs');

let c = fs.readFileSync('src/app/chess/page.tsx', 'utf8');

if (!c.includes('const [theme')) {
  // Add Theme state
  c = c.replace(/const \[difficulty, setDifficulty\] = useState<number>\(10\);/, `const [difficulty, setDifficulty] = useState<number>(10);\n  const [theme, setTheme] = useState<'classic' | 'wood' | 'ocean' | 'neon'>('classic');\n  \n  const themes = {\n    classic: { light: '#f0d9b5', dark: '#b58863' },\n    wood: { light: '#e6c8a0', dark: '#8b5a2b' },\n    ocean: { light: '#d1e6e6', dark: '#4682b4' },\n    neon: { light: '#2c003e', dark: '#ff007f' }\n  };`);

  // Add Theme selector to the UI
  const themeSelector = `
          <div className="flex items-center gap-2 mb-4 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            {(['classic', 'wood', 'ocean', 'neon'] as const).map(t => (
              <button 
                key={t}
                onClick={() => setTheme(t)}
                className={\`flex-1 py-1 text-xs font-bold rounded-lg capitalize transition \${theme === t ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}\`}
              >
                {t}
              </button>
            ))}
          </div>
  `;
  c = c.replace(/<div className="flex gap-2 mb-4">/, themeSelector + '\n          <div className="flex gap-2 mb-4">');

  // Apply Theme to Chessboard
  c = c.replace(/customDarkSquareStyle=\{\{ backgroundColor: '#779556' \}\}/, `customDarkSquareStyle={{ backgroundColor: themes[theme].dark }}`);
  c = c.replace(/customLightSquareStyle=\{\{ backgroundColor: '#ebecd0' \}\}/, `customLightSquareStyle={{ backgroundColor: themes[theme].light }}`);

  fs.writeFileSync('src/app/chess/page.tsx', c, 'utf8');
}
