const fs = require('fs');
let c = fs.readFileSync('src/components/GameChat.tsx', 'utf8');

if (!c.includes('floatingEmojis')) {
  // Add state for floating emojis
  c = c.replace(/const scrollRef = useRef<HTMLDivElement>\(null\);/, "const scrollRef = useRef<HTMLDivElement>(null);\n  const [floatingEmojis, setFloatingEmojis] = useState<{id: string, emoji: string, left: number}[]>([]);");

  // Modify the onValue listener to detect new emojis
  const effectLogic = `
    const unsubChat = onValue(chatRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const parsed = Object.keys(data).map(k => ({ id: k, ...data[k] }));
        
        // Detect new emojis
        setMessages(prev => {
          if (prev.length > 0 && parsed.length > prev.length) {
            const newMsgs = parsed.slice(prev.length);
            newMsgs.forEach(msg => {
              // If message is a single emoji from our quick list, or short emoji
              if (EMOJIS.includes(msg.text) || (msg.text.length <= 4 && /\\p{Emoji}/u.test(msg.text))) {
                const id = Math.random().toString();
                setFloatingEmojis(f => [...f, { id, emoji: msg.text, left: 10 + Math.random() * 80 }]);
                setTimeout(() => {
                  setFloatingEmojis(f => f.filter(e => e.id !== id));
                }, 4000); // remove after animation
              }
            });
          }
          return parsed;
        });
      }
    });
  `;
  c = c.replace(/const unsubChat = onValue\(chatRef, \(snap\) => \{[\s\S]*?\}\);/, effectLogic);

  // Define EMOJIS earlier so it's accessible in useEffect
  c = c.replace(/const EMOJIS = \['😂', '😡', '👍', '👎', '💀', '🎯'\];/, "");
  c = c.replace(/const sendEmoji = async /, "const EMOJIS = ['😂', '😡', '👍', '👎', '💀', '🎯'];\n  const sendEmoji = async ");

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

  // Also we need to add the animate-float-up keyframes to globals.css
  let css = fs.readFileSync('src/app/globals.css', 'utf8');
  if (!css.includes('float-up')) {
    css += `
@keyframes float-up {
  0% { transform: translateY(100vh) scale(0.5); opacity: 0; }
  20% { opacity: 1; transform: translateY(70vh) scale(1.2); }
  80% { opacity: 1; transform: translateY(20vh) scale(1); }
  100% { transform: translateY(-10vh) scale(0.8); opacity: 0; }
}
.animate-float-up {
  animation: float-up 4s ease-out forwards;
}
`;
    fs.writeFileSync('src/app/globals.css', css, 'utf8');
  }
}
