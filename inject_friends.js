const fs = require('fs');

// 1. Inject NotificationsPanel into Navbar
let n = fs.readFileSync('src/components/Navbar.tsx', 'utf8');
if (!n.includes('NotificationsPanel')) {
  n = n.replace(/import \{ auth, db \} from '@\/lib\/firebase';/, "import { auth, db } from '@/lib/firebase';\nimport NotificationsPanel from '@/components/NotificationsPanel';");
  // Inject into the button row, before the sound theme button
  n = n.replace(/<button \n\s*onClick=\{cycleSoundTheme\}/, '<NotificationsPanel />\n            <button \n              onClick={cycleSoundTheme}');
  fs.writeFileSync('src/components/Navbar.tsx', n, 'utf8');
}

// 2. Inject "Add Friend" button into Leaderboard Public Profile Modal
let l = fs.readFileSync('src/app/leaderboard/page.tsx', 'utf8');
if (!l.includes('sendFriendRequest')) {
  // Add imports
  l = l.replace(/import \{ ref, onValue[\s\S]*?\} from 'firebase\/database';/, `import { ref, onValue, get, push, set } from 'firebase/database';`);
  l = l.replace(/import \{ onAuthStateChanged[\s\S]*?\} from 'firebase\/auth';/, `import { onAuthStateChanged, User } from 'firebase/auth';`);

  // Add auth state
  l = l.replace(/const \[players, setPlayers\] = useState<Player\[\]>\(\[\]\);/, "const [players, setPlayers] = useState<Player[]>([]);\n  const [currentUser, setCurrentUser] = useState<User | null>(null);\n  useEffect(() => { const u = onAuthStateChanged(auth, setCurrentUser); return u; }, []);");

  // Add sendFriendRequest function
  const friendFn = `
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
  l = l.replace(/const sortLogic =/, friendFn + '\n  const sortLogic =');

  // Add button inside the modal, after the coins row
  l = l.replace(/<div className="text-sm font-bold text-blue-400 mb-6 flex items-center gap-2">/, `{currentUser && currentUser.uid !== selectedUser.uid && (
                    <button 
                      onClick={() => sendFriendRequest(selectedUser.uid, selectedUser.displayName)}
                      className="mt-2 mb-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-black rounded-xl flex items-center gap-2 transition-all active:scale-95"
                    >
                      <UserPlus className="w-4 h-4" /> Dosta Əlavə Et
                    </button>
                  )}
                  <div className="text-sm font-bold text-blue-400 mb-6 flex items-center gap-2">`);

  // Add imports from lucide for UserPlus
  l = l.replace(/import \{([^}]+)\} from 'lucide-react';/, (m, icons) => {
    if (!icons.includes('UserPlus')) return `import {${icons}, UserPlus } from 'lucide-react';`;
    return m;
  });

  // Add auth import
  if (!l.includes("import { auth")) {
    l = l.replace(/import \{ db \} from '@\/lib\/firebase';/, "import { db, auth } from '@/lib/firebase';");
  }

  // Add toast import
  if (!l.includes('react-hot-toast')) {
    l = l.replace(/'use client';/, "'use client';\nimport { toast } from 'react-hot-toast';");
  }

  fs.writeFileSync('src/app/leaderboard/page.tsx', l, 'utf8');
}
