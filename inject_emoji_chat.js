const fs = require('fs');

let c = fs.readFileSync('src/components/GameChat.tsx', 'utf8');

if (!c.includes('EMOJIS')) {
  // Add sendEmoji function
  const sendEmojiFn = `
  const sendEmoji = async (emoji: string) => {
    if (!roomId) return;
    const chatRef = ref(db, \`games/\${gameName}/\${roomId}/chat\`);
    await push(chatRef, {
      sender: userName,
      text: emoji,
      timestamp: serverTimestamp()
    });
  };
  
  const EMOJIS = ['👍', '😂', '😡', '😱', '👏', '🤝'];
  `;

  c = c.replace('if (!roomId) return null;', sendEmojiFn + '\n  if (!roomId) return null;');

  // Add emoji bar UI
  const emojiBarUI = `
        <div className="bg-zinc-800/30 px-3 py-2 border-t border-zinc-800 flex items-center justify-between gap-1 overflow-x-auto custom-scrollbar">
          {EMOJIS.map(em => (
            <button 
              key={em} 
              onClick={() => sendEmoji(em)} 
              className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg hover:bg-zinc-700/50 transition-colors text-lg active:scale-95"
              type="button"
            >
              {em}
            </button>
          ))}
        </div>
  `;

  c = c.replace(/<form onSubmit=\{sendMessage\}/, emojiBarUI + '\n      <form onSubmit={sendMessage}');

  fs.writeFileSync('src/components/GameChat.tsx', c, 'utf8');
}
