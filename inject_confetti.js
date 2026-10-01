const fs = require('fs');

function addConfetti(file) {
  let c = fs.readFileSync(file, 'utf8');

  // Add imports
  if (!c.includes('canvas-confetti')) {
    c = c.replace(
      "import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';",
      "import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';\nimport confetti from 'canvas-confetti';\nimport { toast } from 'react-hot-toast';"
    );
  }

  // Same for chess (it uses User without renaming)
  if (!c.includes('canvas-confetti')) {
    c = c.replace(
      "import { onAuthStateChanged, User } from 'firebase/auth';",
      "import { onAuthStateChanged, User } from 'firebase/auth';\nimport confetti from 'canvas-confetti';\nimport { toast } from 'react-hot-toast';"
    );
  }

  // Inject Confetti and Toast into Elo calculation
  if (!c.includes('confetti(')) {
    c = c.replace(
      /if \(isWin\) \{ newWins\+\+; newElo \+= 25; \}/,
      "if (isWin) { newWins++; newElo += 25; confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } }); toast.success('+25 Elo Qazandınız!', { icon: '🏆', duration: 5000 }); }"
    );
  }

  if (!c.includes('toast.error')) {
    c = c.replace(
      /else if \(!isDraw\) \{ newLosses\+\+; newElo = Math.max\(0, newElo - 25\); \}/,
      "else if (!isDraw) { newLosses++; newElo = Math.max(0, newElo - 25); toast.error('-25 Elo İtirdiniz.', { icon: '💀', duration: 5000 }); }"
    );
  }
  
  // Inject toasts into Matchmaking
  if (!c.includes("toast.success('Rəqib qoşuldu!")) {
    // For when you CREATE the room and wait for someone
    c = c.replace(
      "setStatus('Oyun Başladı! Uğurlar.');",
      "setStatus('Oyun Başladı! Uğurlar.'); toast.success('Rəqib qoşuldu! Oyun Başladı.', { icon: '🔥' });"
    );
    // There are 2 places where setStatus('Oyun Başladı! Uğurlar.') occurs in findMatch.
    // The replace string above replaces the FIRST ONE. 
    // Wait, let's use global replace:
    c = c.replace(
      /setStatus\('Oyun Başladı! Uğurlar\.'\);/g,
      "setStatus('Oyun Başladı! Uğurlar.'); toast.success('Oyun Başladı! Uğurlar.', { icon: '🔥' });"
    );
  }

  fs.writeFileSync(file, c, 'utf8');
}

['src/app/checkers/page.tsx', 'src/app/go/page.tsx', 'src/app/othello/page.tsx', 'src/app/chess/page.tsx'].forEach(addConfetti);

