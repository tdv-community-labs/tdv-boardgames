const fs = require('fs');

let c = fs.readFileSync('src/app/page.tsx', 'utf8');

c = c.replace(/import Link from 'next\/link';/, "import Link from 'next/link';\nimport GlobalChat from '@/components/GlobalChat';");

const targetGrid = `      {/* Games Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {GAMES.map((game, i) => (
          <TiltCard key={game.id} game={game} index={i} />
        ))}
      </div>`;

const newGrid = `      {/* Games Grid & Global Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {GAMES.map((game, i) => (
            <TiltCard key={game.id} game={game} index={i} />
          ))}
        </div>
        <div className="lg:col-span-1">
          <GlobalChat />
        </div>
      </div>`;

c = c.replace(targetGrid, newGrid);

fs.writeFileSync('src/app/page.tsx', c, 'utf8');
