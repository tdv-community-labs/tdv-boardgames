const fs = require('fs');
let layout = fs.readFileSync('src/app/layout.tsx', 'utf8');

if (!layout.includes('PageTransition')) {
  layout = layout.replace(
    /import DailyQuests from '@\/components\/DailyQuests';/,
    "import DailyQuests from '@/components/DailyQuests';\nimport PageTransition from '@/components/PageTransition';"
  );
  layout = layout.replace(
    /{children}/,
    '<PageTransition>{children}</PageTransition>'
  );
  fs.writeFileSync('src/app/layout.tsx', layout, 'utf8');
}
