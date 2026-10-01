const fs = require('fs');

// 1. Inject DailyQuests into layout
let layout = fs.readFileSync('src/app/layout.tsx', 'utf8');
if (!layout.includes('DailyQuests')) {
  layout = layout.replace(
    /import \{ Toaster \} from 'react-hot-toast';/,
    "import { Toaster } from 'react-hot-toast';\nimport DailyQuests from '@/components/DailyQuests';"
  );
  layout = layout.replace(
    /<Navbar \/>/,
    "<Navbar />\n        <DailyQuests />"
  );
  fs.writeFileSync('src/app/layout.tsx', layout, 'utf8');
}

// 2. Write streak updater utility
const streakUtil = `import { ref, get, update, push } from 'firebase/database';
import { db } from '@/lib/firebase';

export async function updateStreakAndQuests(uid: string, isWin: boolean) {
  try {
    const snap = await get(ref(db, \`users/\${uid}\`));
    const data = snap.val() || {};
    const today = new Date().toDateString();

    // Update streak
    let currentStreak = data.currentStreak || 0;
    let bestStreak = data.bestStreak || 0;
    if (isWin) {
      currentStreak += 1;
      if (currentStreak > bestStreak) bestStreak = currentStreak;
    } else {
      currentStreak = 0;
    }

    // Update daily quest progress
    const dq = data.dailyQuests || {};
    const updates: any = { currentStreak, bestStreak };

    if (data.dailyQuestDate === today) {
      // wins quests
      if (isWin) {
        ['win_1', 'win_3'].forEach(qid => {
          if (!dq[qid]?.claimed) {
            updates[\`dailyQuests/\${qid}/progress\`] = (dq[qid]?.progress || 0) + 1;
          }
        });
        // streak quest
        if (!dq['streak_2']?.claimed) {
          updates['dailyQuests/streak_2/progress'] = currentStreak;
        }
      }
      // matches quest (win or loss)
      if (!dq['match_5']?.claimed) {
        updates['dailyQuests/match_5/progress'] = (dq['match_5']?.progress || 0) + 1;
      }
    }

    await update(ref(db, \`users/\${uid}\`), updates);
  } catch(e) { console.error(e); }
}
`;
fs.writeFileSync('src/utils/streaks.ts', streakUtil, 'utf8');
