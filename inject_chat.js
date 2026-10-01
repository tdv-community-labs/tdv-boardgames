const fs = require('fs');

function addChat(file, gameName) {
  let c = fs.readFileSync(file, 'utf8');

  if (!c.includes('import GameChat')) {
    c = c.replace(
      "import Link from 'next/link';",
      "import Link from 'next/link';\nimport GameChat from '@/components/GameChat';"
    );
  }

  if (!c.includes('<GameChat')) {
    c = c.replace(
      "</div>\n      </div>\n    </div>",
      `</div>\n        <GameChat roomId={roomId} gameName="${gameName}" userName={user?.displayName || 'Oyunçu'} />\n      </div>\n    </div>`
    );
  }

  fs.writeFileSync(file, c, 'utf8');
}

addChat('src/app/chess/page.tsx', 'chess');
addChat('src/app/checkers/page.tsx', 'checkers');
addChat('src/app/go/page.tsx', 'go');
addChat('src/app/othello/page.tsx', 'othello');
