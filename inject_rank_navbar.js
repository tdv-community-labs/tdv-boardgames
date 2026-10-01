const fs = require('fs');

let c = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

if (!c.includes('setElo')) {
  // imports
  c = c.replace(/import \{ auth \} from '@\/lib\/firebase';/, "import { auth, db } from '@/lib/firebase';\nimport { ref, get } from 'firebase/database';\nimport { getRank } from '@/utils/ranks';");
  
  // state
  c = c.replace(/const \[user, setUser\] = useState<FirebaseUser \| null>\(null\);/, "const [user, setUser] = useState<FirebaseUser | null>(null);\n  const [elo, setElo] = useState<number>(1200);");

  // useEffect fetch
  c = c.replace(/setUser\(currentUser\);\n\s*setLoading\(false\);/, "setUser(currentUser);\n        if (currentUser) {\n          get(ref(db, `users/${currentUser.uid}`)).then(snap => {\n            if (snap.exists()) setElo(snap.val().elo || 1200);\n          });\n        }\n        setLoading(false);");

  // render rank
  c = c.replace(/<span className="text-sm font-bold text-white">\{user.displayName \|\| 'Oyunçu'\}<\/span>/, `{(() => { const r = getRank(elo); return <span className="text-sm font-bold text-white flex items-center gap-2" title={r.name}>{user.displayName || 'Oyunçu'} <span className="text-xs">{r.icon}</span></span>; })()}`);

  fs.writeFileSync('src/components/Navbar.tsx', c, 'utf8');
}
