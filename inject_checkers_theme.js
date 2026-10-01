const fs = require('fs');

let c = fs.readFileSync('src/app/checkers/page.tsx', 'utf8');

if (!c.includes('const [theme')) {
  // Add Theme state
  c = c.replace(/const \[difficulty, setDifficulty\] = useState<number>\(5\);/, `const [difficulty, setDifficulty] = useState<number>(5);\n  const [theme, setTheme] = useState<'classic' | 'wood' | 'ocean' | 'neon'>('classic');\n  \n  const themes = {\n    classic: { light: 'bg-[#ebecd0]', dark: 'bg-[#779556]' },\n    wood: { light: 'bg-[#e6c8a0]', dark: 'bg-[#8b5a2b]' },\n    ocean: { light: 'bg-[#d1e6e6]', dark: 'bg-[#4682b4]' },\n    neon: { light: 'bg-[#2c003e]', dark: 'bg-[#ff007f]' }\n  };`);

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

  // Apply Theme to Checkers board
  // \${isDark ? 'bg-orange-950' : 'bg-orange-200'}
  c = c.replace(/\$\{isDark \? 'bg-orange-950' : 'bg-orange-200'\}/, `\${isDark ? themes[theme].dark : themes[theme].light}`);

  fs.writeFileSync('src/app/checkers/page.tsx', c, 'utf8');
}
