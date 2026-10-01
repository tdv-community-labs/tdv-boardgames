const fs = require('fs');

function injectHistory(file, engineName) {
  let c = fs.readFileSync(file, 'utf8');

  if (!c.includes('Gedişlər')) {
    const historyBox = `
        {engine.moveHistory && engine.moveHistory.length > 0 && (
          <div className="p-4 rounded-3xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-md max-h-48 overflow-y-auto custom-scrollbar">
            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-3 sticky top-0 bg-zinc-900/80 backdrop-blur-md py-1">Gedişlər</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-medium">
              {engine.moveHistory.reduce((result, value, index, array) => {
                if (index % 2 === 0) result.push(array.slice(index, index + 2));
                return result;
              }, []).map((pair: any, i: number) => (
                <div key={i} className="col-span-2 grid grid-cols-12 gap-2 hover:bg-white/5 px-2 py-1 rounded">
                  <div className="col-span-2 text-zinc-500 text-right">{i + 1}.</div>
                  <div className="col-span-5 text-white">{pair[0]}</div>
                  <div className="col-span-5 text-zinc-400">{pair[1] || ''}</div>
                </div>
              ))}
            </div>
          </div>
        )}
  `;

    // Inject before <GameChat
    if (c.includes('<GameChat')) {
       c = c.replace('<GameChat', historyBox + '\n        <GameChat');
       fs.writeFileSync(file, c, 'utf8');
    }
  }
}

injectHistory('src/app/checkers/page.tsx', 'CheckersEngine');
injectHistory('src/app/go/page.tsx', 'GoEngine');
