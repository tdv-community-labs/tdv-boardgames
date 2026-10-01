const fs = require('fs');
let c = fs.readFileSync('src/app/leaderboard/page.tsx', 'utf8');

if (!c.includes('selectedUser')) {
  // Add state for selected user
  c = c.replace(/const \[sortBy, setSortBy\] = useState/, "const [selectedUser, setSelectedUser] = useState<any | null>(null);\n  const [rawUsers, setRawUsers] = useState<any>({});\n  const [sortBy, setSortBy] = useState");

  // Save raw data
  c = c.replace(/const parsed: Player\[\] = Object\.keys\(data\)\.map/, "setRawUsers(data);\n        const parsed: Player[] = Object.keys(data).map");

  // Add click handlers to rows
  // Top 3 Podium:
  c = c.replace(/<div key=\{u\.uid\} className="relative flex flex-col items-center">/g, 
    '<div key={u.uid} onClick={() => setSelectedUser({ uid: u.uid, ...rawUsers[u.uid] })} className="relative flex flex-col items-center cursor-pointer hover:scale-105 transition-transform">');
  
  // Rest of list:
  c = c.replace(/<div key=\{u\.uid\} className="grid grid-cols-12 gap-4 items-center bg-zinc-900\/50 border border-zinc-800 p-4 rounded-2xl hover:bg-zinc-800\/50 transition-colors">/g, 
    '<div key={u.uid} onClick={() => setSelectedUser({ uid: u.uid, ...rawUsers[u.uid] })} className="grid grid-cols-12 gap-4 items-center bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl hover:bg-zinc-800/50 transition-colors cursor-pointer">');

  // Inject Public Profile Modal UI
  const profileModalUI = `
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-zinc-700 p-8 rounded-3xl shadow-2xl flex flex-col items-center"
            >
              <button onClick={() => setSelectedUser(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white">✕</button>
              
              <div className="text-7xl filter drop-shadow-xl mb-4 relative">
                {selectedUser.avatar || '😎'}
                <div className="absolute -bottom-2 -right-2 bg-emerald-600 text-white text-xs font-black px-2 py-0.5 rounded-md shadow-lg border border-zinc-900">
                  Lvl {Math.floor(Math.sqrt((selectedUser.wins || 0) + (selectedUser.losses || 0))) + 1}
                </div>
              </div>
              
              <h2 className="text-2xl font-black text-white mb-1">{selectedUser.displayName || 'Oyunçu'}</h2>
              <div className="text-sm font-bold text-blue-400 mb-6 flex items-center gap-2">
                🏆 {selectedUser.elo || 1200} Reytinq
                <span className="text-zinc-600">•</span>
                🪙 {((selectedUser.wins || 0) * 15 + (selectedUser.losses || 0) * 2) - (selectedUser.spentCoins || 0)} TDV
              </div>
              
              <div className="w-full grid grid-cols-3 gap-2 mb-6">
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-center">
                  <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Qələbə</div>
                  <div className="text-emerald-400 font-black text-lg">{selectedUser.wins || 0}</div>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-center">
                  <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Məğlubiyyət</div>
                  <div className="text-red-400 font-black text-lg">{selectedUser.losses || 0}</div>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-center">
                  <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Qələbə %</div>
                  <div className="text-blue-400 font-black text-lg">
                    {selectedUser.wins ? Math.round((selectedUser.wins / ((selectedUser.wins || 0) + (selectedUser.losses || 0))) * 100) : 0}%
                  </div>
                </div>
              </div>

              {selectedUser.unlockedAvatars && selectedUser.unlockedAvatars.length > 0 && (
                <div className="w-full text-left">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Kolleksiya (Premium Avatarlar)</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.unlockedAvatars.map((av: string) => (
                      <div key={av} className="w-10 h-10 bg-zinc-950 border border-yellow-500/30 rounded-lg flex items-center justify-center text-xl shadow-inner">
                        {av}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
  `;
  
  c = c.replace(/return \(\n\s*<div className="max-w-4xl/, "return (\n    <>\n" + profileModalUI + '\n      <div className="max-w-4xl');
  c = c.replace(/<\/div>\n\s*\);\n\}/, "</div>\n    </>\n  );\n}");

  fs.writeFileSync('src/app/leaderboard/page.tsx', c, 'utf8');
}
