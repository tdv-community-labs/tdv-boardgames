const fs = require('fs');
const path = require('path');

const replacements = {
  '\uFFFD\uFFFD\uFFFDn': 'üçün',
  'hesab\uFFFDn\uFFFDza': 'hesabınıza',
  'olmal\uFFFDs\uFFFDn\uFFFDz': 'olmalısınız',
  'R\uFFFDtqib': 'Rəqib',
  'axtar\uFFFDl\uFFFDr': 'axtarılır',
  'Ba\uFFFDlad\uFFFD': 'Başladı',
  'U\uFFFDurlar': 'Uğurlar',
  'Gedi\uFFFDY': 'Gediş',
  's\uFFFDras\uFFFD': 'sırası',
  'A\uFFFDYlar': 'Ağlar',
  'Qazand\uFFFDn\uFFFDz': 'Qazandınız',
  '\uFFFDtirdiniz': 'İtirdiniz',
  'Ba\uFFFDYla': 'Başla',
  'Yenid\uFFFDtn': 'Yenidən',
  'Q\uFFFDtdim': 'Qədim',
  'S\u01ECLr\uFFFDttli': 'Sürətli',
  'b\u01ECLt\u01ECLn': 'bütün',
  '\uFFFDyr\uFFFDtnin': 'öyrənin',
  '\uFFFDm\u01ECLr': 'ömür',
  'ustala\uFFFDY\uFFFDn': 'ustalaşın',
  'G\uFFFDtldiniz': 'Gəldiniz',
  'G\uFFFDtldi': 'Gəldi',
  '\uFFFD?ah v\uFFFDt Mat': 'Şah və Mat',
  'He\uFFFD-he\uFFFDt': 'Heç-heçə',
  '\uFFFD?AH': 'ŞAH',
  't\uFFFDtslim': 'təslim',
  'T\uFFFDtslim': 'Təslim',
  'Qaralar': 'Qaralar', // just mapping to check
  'S\uFFFDtn': 'Sən',
  '\uFFFDYar\uFFFDtni': 'işarəni',
  'd\u01ECLz\u01ECLn': 'düzün',
  '\uFFFDs\uFFFD': '⚫', // Othello icon
  '\uFFFDy\?': '⚪', // Go icon
  '\uFFFD>?': '⭕', // Checkers icon
  '\uFFFDtY': '♟', // Chess icon
  '\uFFFDY?': '🏆', // Trophy icon
  '\uFFFDY\'?': '💀' // Skull icon
};

function fixCorrupted(dir) {
  const files = fs.readdirSync(dir);
  for (let file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fixCorrupted(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const [bad, good] of Object.entries(replacements)) {
        if (content.includes(bad)) {
          content = content.split(bad).join(good);
          changed = true;
        }
      }
      
      // Some special cases for single U+FFFD characters not covered above
      // Checkers Icon
      content = content.replace(/icon: "\uFFFD>\?"/g, 'icon: "⭕"');
      content = content.replace(/icon: "\uFFFDtY"/g, 'icon: "♟"');
      content = content.replace(/icon: "\uFFFDs\uFFFD"/g, 'icon: "⚫"');
      content = content.replace(/icon: "\uFFFDy\?"/g, 'icon: "⚪"');
      content = content.replace(/'\uFFFDY\?'/g, "'🏆'");
      content = content.replace(/'\uFFFDY'\?'/g, "'💀'");
      content = content.replace(/\uFFFD\?ah v\uFFFDt Mat/g, 'Şah və Mat');

      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  }
}

fixCorrupted('src');
