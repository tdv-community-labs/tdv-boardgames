const fs = require('fs');

let c = fs.readFileSync('src/app/chess/page.tsx', 'utf8');

if (!c.includes('const [engineWinner')) {
  c = c.replace(/const \[status, setStatus\] = useState<string>\('Oyun Başladı'\);/, "const [status, setStatus] = useState<string>('Oyun Başladı');\n  const [engineWinner, setEngineWinner] = useState<string | null>(null);");
  
  c = c.replace(/if \(data && data\.fen !== game\.fen\(\)\) \{/g, `if (data && data.state && typeof data.state === 'string' && data.state.startsWith('resigned_')) {\n            setEngineWinner(data.state);\n            return;\n          }\n          if (data && data.fen !== game.fen()) {`);
  
  fs.writeFileSync('src/app/chess/page.tsx', c, 'utf8');
}
