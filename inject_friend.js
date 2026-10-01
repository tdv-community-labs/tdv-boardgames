const fs = require('fs');

function injectFriendMatch(file, gameName) {
  let c = fs.readFileSync(file, 'utf8');
  
  // 1. Add Link import if not present
  if (!c.includes('Link as LinkIcon')) {
    c = c.replace(/import \{([^}]+)\} from 'lucide-react';/, "import { $1, Link as LinkIcon } from 'lucide-react';");
  }

  // 2. Add createPrivateRoom function before findMatch
  const createPrivateRoomStr = `
  const createPrivateRoom = async () => {
    if (!user) { alert('Dostla oynamaq üçün hesabınıza daxil olun!'); return; }
    const newRoomRef = push(ref(db, \`games/${gameName}\`));
    
    // Depending on game, initial state varies
    let initialState = '';
    ${gameName === 'chess' ? 'initialState = new Chess().fen();' : ''}
    ${gameName === 'checkers' ? 'initialState = new CheckersEngine().serialize();' : ''}
    ${gameName === 'go' ? 'initialState = new GoEngine(19).serialize();' : ''}
    ${gameName === 'othello' ? 'initialState = new OthelloEngine().serialize();' : ''}
    
    await set(newRoomRef, { state: initialState, status: 'waiting_for_friend' });
    setRoomId(newRoomRef.key);
    setMyColor('${gameName === 'chess' || gameName === 'checkers' ? 'w' : 'b'}'); // Chess/Checkers white first, Go/Othello black first
    setMode('multiplayer');
    
    const link = \`\${window.location.origin}/${gameName}?room=\${newRoomRef.key}\`;
    navigator.clipboard.writeText(link).then(() => {
       toast.success('Link kopyalandı! Dostunuza göndərin.', { icon: '🔗', duration: 6000 });
       setStatus('Dostunuzun qoşulması gözlənilir...');
    });
  };

  const findMatch = `;
  
  if (!c.includes('createPrivateRoom =')) {
    c = c.replace('const findMatch =', createPrivateRoomStr);
  }

  // 3. Add useEffect to read ?room= URL
  const useEffectStr = `
  useEffect(() => {
    if (typeof window !== 'undefined' && user) {
      const params = new URLSearchParams(window.location.search);
      const room = params.get('room');
      if (room && !roomId) {
        setMode('multiplayer');
        setRoomId(room);
        setMyColor('${gameName === 'chess' || gameName === 'checkers' ? 'b' : 'w'}'); // Joiner is opposite color
        setStatus('Otağa qoşuldunuz! Oyun Başladı.');
        toast.success('Dostunuzun otağına qoşuldunuz!', { icon: '🤝' });
        window.history.replaceState({}, '', window.location.pathname); // Clear URL
      }
    }
  }, [user, roomId]);

  // Handle Elo`;
  
  if (!c.includes('URLSearchParams')) {
    c = c.replace('// Handle Elo', useEffectStr);
  }

  // 4. Add the button in the UI
  // Find "Rəqib Axtar" button
  const reqibBtn = `{isSearching ? 'Rəqib axtarılır...' : 'Rəqib Axtar'}\n              </button>`;
  
  if (c.includes(reqibBtn) && !c.includes('Dostla Oyna')) {
    const friendBtn = `\n              <button onClick={createPrivateRoom} className="w-full py-3 mb-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-bold text-white transition flex items-center justify-center gap-2">\n                <LinkIcon className="w-4 h-4" /> Dostla Oyna (Link)\n              </button>`;
    
    // In some games it's mb-6 on the original button, we need to remove it from original and put it on new one
    c = c.replace(/mb-6 rounded-xl bg-blue-600/g, 'mb-2 rounded-xl bg-blue-600');
    
    c = c.replace(reqibBtn, reqibBtn + friendBtn);
  }

  fs.writeFileSync(file, c, 'utf8');
}

injectFriendMatch('src/app/chess/page.tsx', 'chess');
injectFriendMatch('src/app/checkers/page.tsx', 'checkers');
injectFriendMatch('src/app/go/page.tsx', 'go');
injectFriendMatch('src/app/othello/page.tsx', 'othello');
