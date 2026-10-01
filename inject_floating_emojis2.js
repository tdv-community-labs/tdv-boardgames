const fs = require('fs');
let c = fs.readFileSync('src/components/GameChat.tsx', 'utf8');

if (!c.includes('floatingEmojis')) {
  // Add state for floating emojis
  c = c.replace(/const scrollRef = useRef<HTMLDivElement>\(null\);/, "const scrollRef = useRef<HTMLDivElement>(null);\n  const [floatingEmojis, setFloatingEmojis] = useState<{id: string, emoji: string, left: number}[]>([]);\n  const EMOJIS = ['🤯', '😂', '😡', '😱', '💀', '🤡', '👍', '👎', '🎯'];");

  // Remove ALL existing EMOJIS declarations
  c = c.replace(/const EMOJIS = \[.*?\];/g, "");

  // Modify the onValue listener to detect new emojis
  const effectLogic = `
    const unsubChat = onValue(chatRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const parsed = Object.keys(data).map(k => ({ id: k, ...data[k] }));
        
        setMessages(prev => {
          if (prev.length > 0 && parsed.length > prev.length) {
            const newMsgs = parsed.slice(prev.length);
            newMsgs.forEach(msg => {
              // EMOJIS is now defined at component scope
              if (EMOJIS.includes(msg.text) || (msg.text.length <= 4 && /\\p{Emoji}/u.test(msg.text))) {
                const id = Math.random().toString();
                setFloatingEmojis(f => [...f, { id, emoji: msg.text, left: 10 + Math.random() * 80 }]);
                setTimeout(() => {
                  setFloatingEmojis(f => f.filter(e => e.id !== id));
                }, 4000); 
              }
            });
          }
          return parsed;
        });
      }
    });
  `;
  c = c.replace(/const unsubChat = onValue\(chatRef, \(snap\) => \{[\s\S]*?\}\);/, effectLogic);

  // Inject the Floating Emojis Portal/Overlay
  const overlayUI = `
      {/* Floating Emojis Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
        {floatingEmojis.map(f => (
          <div 
            key={f.id}
            className="absolute bottom-0 text-6xl drop-shadow-2xl animate-float-up"
            style={{ left: \`\${f.left}%\` }}
          >
            {f.emoji}
          </div>
        ))}
      </div>
  `;
  c = c.replace(/return \(\n\s*<div className="w-full/, "return (\n    <>\n" + overlayUI + '\n      <div className="w-full');
  c = c.replace(/<\/div>\n\s*\);\n\}/, "</div>\n    </>\n  );\n}");

  fs.writeFileSync('src/components/GameChat.tsx', c, 'utf8');
}
