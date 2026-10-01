const fs = require('fs');
let c = fs.readFileSync('src/app/chess/page.tsx', 'utf8');

// formatTime isn't being injected correctly, add it right after the drawHandlers block
if (!c.includes('const formatTime')) {
  c = c.replace(
    /const resetGame = \(\) => \{/,
    `const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return \`\${m}:\${s}\`;
  };
  
  const startClock = () => {
    setWhiteTime(timeControl);
    setBlackTime(timeControl);
    setClockRunning(true);
  };

  const resetGame = () => {`
  );
  c = c.replace(/\n  const resetGame = \(\) => \{\n\s*const resetGame/, '\n  const resetGame = () => {'); // deduplicate if needed
  fs.writeFileSync('src/app/chess/page.tsx', c, 'utf8');
}
