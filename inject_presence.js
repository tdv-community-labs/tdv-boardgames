const fs = require('fs');

let c = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

if (!c.includes('presence')) {
  // Add onlineCount state
  c = c.replace(/const \[elo, setElo\] = useState<number>\(1200\);/, "const [elo, setElo] = useState<number>(1200);\n  const [onlineCount, setOnlineCount] = useState<number>(0);");

  // Add presence logic
  const presenceLogic = `
  useEffect(() => {
    const presenceRef = ref(db, 'presence');
    const unsubPresence = onValue(presenceRef, (snap) => {
      setOnlineCount(snap.size || 0);
    });
    return () => unsubPresence();
  }, []);

  useEffect(() => {
    if (user) {
      const myPresenceRef = ref(db, \`presence/\${user.uid}\`);
      set(myPresenceRef, true);
      onDisconnect(myPresenceRef).remove();
    }
  }, [user]);
  `;
  
  c = c.replace(/useEffect\(\(\) => \{/, presenceLogic + '\n  useEffect(() => {');
  
  // Need to import `set` and `onDisconnect` if not already imported. They might be in `onValue` import
  if (!c.includes('onDisconnect')) {
    c = c.replace(/import \{ ref, get \} from 'firebase\/database';/, "import { ref, get, set, onDisconnect, onValue } from 'firebase/database';");
  } else {
    c = c.replace(/import \{ ref, get \} from 'firebase\/database';/, "import { ref, get, set, onValue, onDisconnect } from 'firebase/database';");
  }

  // Add UI
  const onlineUI = `
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-zinc-950 border border-zinc-800 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-zinc-400">{onlineCount} onlayn</span>
          </div>
  `;

  // Inject into navbar next to the Logo
  c = c.replace(/<span className="hidden sm:block">Reytinq<\/span>\n\s*<\/Link>\n\s*<\/div>/, '<span className="hidden sm:block">Reytinq</span>\n            </Link>\n' + onlineUI + '\n          </div>');

  fs.writeFileSync('src/components/Navbar.tsx', c, 'utf8');
}
