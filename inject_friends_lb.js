const fs = require('fs');
let l = fs.readFileSync('src/app/leaderboard/page.tsx', 'utf8');

// Add all missing imports
if (!l.includes("from 'firebase/auth'")) {
  l = l.replace(/^'use client';/, "'use client';\nimport { toast } from 'react-hot-toast';");
  l = l.replace(/import \{ ref, onValue \} from 'firebase\/database';/, "import { ref, onValue, get, push } from 'firebase/database';\nimport { onAuthStateChanged, User } from 'firebase/auth';");
  l = l.replace(/import \{ Trophy/, "import { Trophy, UserPlus");
  l = l.replace(/import \{ db \}/, "import { db, auth }");
}

// Add state
l = l.replace(/const \[players, setPlayers\] = useState<Player\[\]>\(\[\]\);/, "const [players, setPlayers] = useState<Player[]>([]);\n  const [currentUser, setCurrentUser] = useState<User | null>(null);\n  useEffect(() => { const u = onAuthStateChanged(auth, setCurrentUser); return u; }, []);");

// Add sendFriendRequest fn
if (!l.includes('sendFriendRequest')) {
  const fn = `
  const sendFriendRequest = async (toUid: string, toName: string) => {
    if (!currentUser || currentUser.uid === toUid) return;
    const mySnap = await get(ref(db, \`users/\${currentUser.uid}\`));
    const me = mySnap.val();
    await push(ref(db, \`notifications/\${toUid}\`), {
      type: 'friend_request',
      fromUid: currentUser.uid,
      fromName: me?.displayName || 'Oyunçu',
      fromAvatar: me?.avatar || '😎',
      timestamp: Date.now()
    });
    toast.success('Dost sorğusu göndərildi!');
    setSelectedUser(null);
  };
  `;
  l = l.replace(/const \[selectedUser, setSelectedUser\]/, fn + '\n  const [selectedUser, setSelectedUser]');
}

// Add friend button inside profile modal
if (!l.includes('sendFriendRequest(selectedUser.uid')) {
  const btn = `
              {currentUser && currentUser.uid !== selectedUser.uid && (
                <button 
                  onClick={() => sendFriendRequest(selectedUser.uid, selectedUser.displayName)}
                  className="mb-4 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-black rounded-xl flex items-center gap-2 transition-all active:scale-95"
                >
                  <UserPlus className="w-4 h-4" /> Dosta Əlavə Et
                </button>
              )}
  `;
  l = l.replace(/<div className="text-sm font-bold text-blue-400 mb-6/, btn + '\n              <div className="text-sm font-bold text-blue-400 mb-6');
}

fs.writeFileSync('src/app/leaderboard/page.tsx', l, 'utf8');
