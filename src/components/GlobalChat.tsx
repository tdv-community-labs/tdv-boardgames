'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { db, auth } from '@/lib/firebase';
import { ref, push, onValue, serverTimestamp, query, limitToLast } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
}

export default function GlobalChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [userName, setUserName] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (u) setUserName(u.displayName || 'Oyunçu');
    });

    const chatRef = query(ref(db, 'global_chat'), limitToLast(50));
    const unsubChat = onValue(chatRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const parsed = Object.keys(data).map(k => ({ id: k, ...data[k] }));
        setMessages(parsed);
      } else {
        setMessages([]);
      }
    });

    return () => { unsubAuth(); unsubChat(); };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendEmoji = async (emoji: string) => {
    if (!userName) return;
    const chatRef = ref(db, 'global_chat');
    await push(chatRef, { sender: userName, text: emoji, timestamp: serverTimestamp() });
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !userName) return;
    const chatRef = ref(db, 'global_chat');
    await push(chatRef, { sender: userName, text: text.trim(), timestamp: serverTimestamp() });
    setText('');
  };

  const EMOJIS = ['👋', '🔥', '🎮', '♟️', '😎', '🏆'];

  return (
    <div className="w-full flex flex-col bg-zinc-900/80 border border-zinc-800 rounded-3xl overflow-hidden backdrop-blur-md h-[400px]">
      <div className="bg-zinc-800/50 px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">Qlobal Meydan</h3>
        </div>
        <span className="text-[10px] text-zinc-500 font-bold px-2 py-1 bg-zinc-950 rounded-full">Canlı Çat</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 custom-scrollbar" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="text-xs text-zinc-500 text-center my-auto italic">
            Çat boşdur. İlk mesajı siz yazın!
          </div>
        ) : (
          messages.map(m => (
            <div key={m.id} className={`flex flex-col max-w-[90%] ${m.sender === userName ? 'self-end items-end' : 'self-start items-start'}`}>
              <span className="text-[10px] text-zinc-500 font-bold mb-0.5 px-1">{m.sender}</span>
              <div className={`px-3 py-2 text-sm shadow-sm ${m.sender === userName ? 'bg-emerald-600 text-white rounded-2xl rounded-tr-sm' : 'bg-zinc-800 text-zinc-200 rounded-2xl rounded-tl-sm'}`}>
                {m.text}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-zinc-800/30 px-3 py-2 border-t border-zinc-800 flex items-center justify-between gap-1 overflow-x-auto custom-scrollbar">
        {EMOJIS.map(em => (
          <button key={em} onClick={() => sendEmoji(em)} type="button" className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg hover:bg-zinc-700/50 transition-colors text-lg active:scale-95">
            {em}
          </button>
        ))}
      </div>
      <form onSubmit={sendMessage} className="p-3 border-t border-zinc-800 flex gap-2">
        <input 
          type="text" 
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={userName ? "Meydana nəsə yaz..." : "Yazmaq üçün daxil olun"} 
          disabled={!userName}
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
        />
        <button type="submit" disabled={!text.trim() || !userName} className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-colors disabled:opacity-50">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

