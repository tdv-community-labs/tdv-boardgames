const fs = require('fs');

function fixGAMES() {
  const file = 'src/app/page.tsx';
  let c = fs.readFileSync(file, 'utf8');
  
  const cleanGames = [
    { id: 'chess', name: 'Şahmat', icon: '♟', description: 'Qədim strategiya oyunu. Kralı qoruyun, rəqibi mat edin.', color: 'from-emerald-500/20 to-emerald-900/40', borderColor: 'border-emerald-500/30', textColor: 'text-emerald-400', players: '124', badge: 'Populyar' },
    { id: 'checkers', name: 'Dama', icon: '⛀', description: 'Sürətli və taktiki. Rəqibin bütün daşlarını vurun.', color: 'from-blue-500/20 to-blue-900/40', borderColor: 'border-blue-500/30', textColor: 'text-blue-400', players: '89' },
    { id: 'go', name: 'Qo (Go)', icon: '⚪', description: 'Ərazi nəzarəti sənəti. Sonsuz ehtimallar, dərin fəlsəfə.', color: 'from-amber-500/20 to-amber-900/40', borderColor: 'border-amber-500/30', textColor: 'text-amber-400', players: '45', badge: 'Yeni' },
    { id: 'othello', name: 'Othello', icon: '⚫', description: 'Bir dəqiqədə öyrənin, bir ömür boyu ustalaşın.', color: 'from-fuchsia-500/20 to-fuchsia-900/40', borderColor: 'border-fuchsia-500/30', textColor: 'text-fuchsia-400', players: '12', badge: 'Yeni' }
  ];

  const oldStr = c.substring(c.indexOf('const GAMES ='), c.indexOf('];', c.indexOf('const GAMES =')) + 2);
  let newStr = 'const GAMES = ' + JSON.stringify(cleanGames, null, 2) + ';';
  // Remove quotes around keys
  newStr = newStr.replace(/"([^"]+)":/g, '$1:');
  
  c = c.replace(oldStr, newStr);
  
  fs.writeFileSync(file, c, 'utf8');
}

fixGAMES();
