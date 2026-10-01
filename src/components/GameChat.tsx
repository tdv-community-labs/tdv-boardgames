import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { ref, push, onValue, serverTimestamp } from 'firebase/database';
import { Send, MessageSquare } from 'lucide-react';

interface ChatProps {
  roomId: string | null;
  gameName: string;
  userName: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

export default function GameChat({ roomId, gameName, userName }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roomId) {
      setMessages([]);
      return;
    }
    const chatRef = ref(db, `games/\${gameName}/\${roomId}/chat`);
    const unsub = onValue(chatRef, (snap) => {
      const data = snap.val();
      if (data) {
        const parsed = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val
        }));
        parsed.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(parsed);
      } else {
        setMessages([]);
      }
    });
    return () => unsub();
  }, [roomId, gameName]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !roomId) return;
    
    const chatRef = ref(db, `games/\${gameName}/\${roomId}/chat`);
    await push(chatRef, {
      sender: userName,
      text: text.trim(),
      timestamp: serverTimestamp()
    });
    setText('');
  };

  if (!roomId) return null;

  return (
    <div className="w-full flex flex-col bg-zinc-900/80 border border-zinc-800 rounded-3xl overflow-hidden backdrop-blur-md mt-4">
      <div className="bg-zinc-800/50 px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-zinc-400" />
        <h3 className="text-sm font-bold text-white">Canlı Söhbət</h3>
      </div>
      
      <div className="h-48 overflow-y-auto p-4 flex flex-col gap-2" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="text-xs text-zinc-500 text-center my-auto italic">
            Mesaj yoxdur. Söhbətə başlayın!
          </div>
        ) : (
          messages.map(m => (
            <div key={m.id} className={`flex flex-col max-w-[85%] \${m.sender === userName ? 'self-end items-end' : 'self-start items-start'}`}>
              <span className="text-[10px] text-zinc-500 font-bold mb-0.5 px-1">{m.sender}</span>
              <div className={`px-3 py-2 rounded-2xl text-sm \${m.sender === userName ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-zinc-800 text-zinc-200 rounded-bl-sm'}`}>
                {m.text}
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={sendMessage} className="p-3 border-t border-zinc-800 flex gap-2">
        <input 
          type="text" 
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Mesaj yazın..." 
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <button type="submit" disabled={!text.trim()} className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-colors disabled:opacity-50">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

