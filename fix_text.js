const fs = require('fs');

const GAMES_CLEAN = [
  { id: 'chess', name: 'Şahmat', icon: '♟', description: 'Qədim strategiya oyunu. Kralı qoruyun, rəqibi mat edin.', color: 'from-emerald-500/20 to-emerald-900/40', borderColor: 'border-emerald-500/30', textColor: 'text-emerald-400', players: '124', badge: 'Populyar' },
  { id: 'checkers', name: 'Dama', icon: '⛀', description: 'Sürətli və taktiki. Rəqibin bütün daşlarını vurun.', color: 'from-blue-500/20 to-blue-900/40', borderColor: 'border-blue-500/30', textColor: 'text-blue-400', players: '89' },
  { id: 'go', name: 'Qo (Go)', icon: '⚪', description: 'Ərazi nəzarəti sənəti. Sonsuz ehtimallar, dərin fəlsəfə.', color: 'from-amber-500/20 to-amber-900/40', borderColor: 'border-amber-500/30', textColor: 'text-amber-400', players: '45', badge: 'Yeni' },
  { id: 'othello', name: 'Othello', icon: '⚫', description: 'Bir dəqiqədə öyrənin, bir ömür boyu ustalaşın.', color: 'from-fuchsia-500/20 to-fuchsia-900/40', borderColor: 'border-fuchsia-500/30', textColor: 'text-fuchsia-400', players: '12', badge: 'Yeni' }
];

function fixFile(file) {
  let c = fs.readFileSync(file, 'utf8');
  
  if (file.includes('page.tsx') && !file.includes('app/')) {
     // this is root page.tsx
     const oldStr = c.substring(c.indexOf('const GAMES ='), c.indexOf('];', c.indexOf('const GAMES =')) + 2);
     const newStr = 'const GAMES = ' + JSON.stringify(GAMES_CLEAN, null, 2).replace(/"([^"]+)":/g, '$1:') + ';';
     c = c.replace(oldStr, newStr);
  } else {
     // Fix common texts for game pages
     c = c.replace(/Oyun Ba.*?lad.*? Gedi.*?: (A.*?lar|Qaralar)/g, 'Oyun Başladı. Gediş: $1')
          .replace(/A.*?lar/g, 'Ağlar')
          .replace(/Qaralar/g, 'Qaralar')
          .replace(/Gedi.*? s.*?ras.*?:/g, 'Gediş sırası:')
          .replace(/Gedi.*?l.*?r Tarix.*?si/g, 'Gedişlər Tarixçəsi')
          .replace(/T.*?slim ol/g, 'Təslim ol')
          .replace(/He.*?he.*?/g, 'Heç-heçə')
          .replace(/Yenid.*?n Ba.*?la/g, 'Yenidən Başla')
          .replace(/Bot Qalib G.*?ldi!/g, 'Bot Qalib Gəldi!')
          .replace(/Siz Qalib G.*?ldiniz!/g, 'Siz Qalib Gəldiniz!')
          .replace(/S.*?n \(Qara\)/g, 'Sən (Qara)')
          .replace(/S.*?n \(A.*?lar\)/g, 'Sən (Ağlar)')
          .replace(/Bot \(A.*?\)/g, 'Bot (Ağ)')
          .replace(/S.*?n/g, 'Sən')
          .replace(/R.*?qib/g, 'Rəqib')
          .replace(/R.*?qib axtar.*?l.*?r\.\.\./g, 'Rəqib axtarılır...')
          .replace(/Oyun Ba.*?lad.*? U.*?urlar\./g, 'Oyun Başladı! Uğurlar.')
          .replace(/\?ahmat/g, 'Şahmat')
          .replace(/Geri Qay.*?t/g, 'Geri Qayıt')
          .replace(/Pas \(Ke.*?\)/g, 'Pas (Keç)')
          .replace(/Oyun Statusu/g, 'Oyun Statusu')
          .replace(/Canl.*? \(Multiplayer\)/g, 'Canlı (Multiplayer)')
          .replace(/R.*?qib_Usta/g, 'Rəqib_Usta')
          .replace(/\?ah v.*?t Mat! Oyun Bitdi\./g, 'Şah və Mat! Oyun Bitdi.')
          .replace(/Pat! He.*?he.*?\./g, 'Pat! Heç-heçə.');
  }
  
  fs.writeFileSync(file, c, 'utf8');
}

['src/app/page.tsx', 'src/app/chess/page.tsx', 'src/app/checkers/page.tsx', 'src/app/go/page.tsx', 'src/app/othello/page.tsx'].forEach(f => {
  if (f === 'src/app/page.tsx') {
    fixFile(f);
  } else {
    // for game pages, we already messed up 'setStn' in previous attempt, but I ran git restore. So now they have ? and other chars.
    // wait, we ran git restore, so they are corrupted with ? from before.
    fixFile(f);
  }
});
