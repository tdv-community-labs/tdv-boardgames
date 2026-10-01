'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Swords } from 'lucide-react';
import Link from 'next/link';
import { db, auth } from '@/lib/firebase';
import { ref, push, onValue, serverTimestamp, query, limitToLast } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  type?: string;
  challengeUrl?: string;
  challengeGame?: string;
}

export default function GlobalChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [userName, setUserName] = useState<string>('');
  const [showChallengeMenu, setShowChallengeMenu] = useState(false);
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

  
  const sendChallenge = async (gameId: string, gameName: string) => {
    if (!userName) return;
    const newRoomRef = push(ref(db, `games/${gameId}`));
    await ref(db, `games/${gameId}/${newRoomRef.key}`); // just getting the key
    
    // We don't actually need to initialize the game state for all games immediately, 
    // the game's page handles 'waiting_for_friend' or auto-initializes on join if needed.
    // Actually, it's safer to just let them click the link. The game page handles ?room=...
    
    const chatRef = ref(db, 'global_chat');
    await push(chatRef, { 
      sender: userName, 
      text: `Sizi ${gameName} oynamağa çağırıram! Kimin cəsarəti var?`, 
      type: 'challenge',
      challengeUrl: `/${gameId}?room=${newRoomRef.key}`,
      challengeGame: gameName,
      timestamp: serverTimestamp() 
    });
    setShowChallengeMenu(false);
  };
  
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
              {m.type === 'challenge' ? (
                <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-2xl flex flex-col gap-2">
                  <div className="text-sm font-bold text-red-400">⚔️ {m.challengeGame} Dueli!</div>
                  <div className="text-xs text-white/80">{m.text}</div>
                  <Link href={m.challengeUrl || '/'} className="mt-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-xl text-center shadow-lg transition-all active:scale-95">
                    Qəbul Et və Oyna
                  </Link>
                </div>
              ) : (
                <div className={`px-3 py-2 text-sm shadow-sm ${m.sender === userName ? 'bg-emerald-600 text-white rounded-2xl rounded-tr-sm' : 'bg-zinc-800 text-zinc-200 rounded-2xl rounded-tl-sm'}`}>
                  {m.text}
                </div>
              )}
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
      
      {showChallengeMenu && (
        <div className="bg-zinc-950 border-t border-zinc-800 p-2 grid grid-cols-2 gap-2">
          <button onClick={() => sendChallenge('chess', 'Şahmat')} type="button" className="py-2 bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-white rounded-lg border border-zinc-800">♟️ Şahmat</button>
          <button onClick={() => sendChallenge('checkers', 'Dama')} type="button" className="py-2 bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-white rounded-lg border border-zinc-800">🔴 Dama</button>
          <button onClick={() => sendChallenge('connect4', 'Dördünü Birləşdir')} type="button" className="py-2 bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-white rounded-lg border border-zinc-800">🟡 Dördünü Birləşdir</button>
          <button onClick={() => sendChallenge('othello', 'Othello')} type="button" className="py-2 bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-white rounded-lg border border-zinc-800">⚪ Othello</button>
        </div>
      )}
      <form onSubmit={sendMessage} className="p-3 border-t border-zinc-800 flex gap-2 relative">
        <button 
          type="button" 
          onClick={() => setShowChallengeMenu(!showChallengeMenu)}
          disabled={!userName}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 ${showChallengeMenu ? 'bg-red-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white'}`}
          title="Meydan Oxu"
        >
          <Swords className="w-4 h-4" />
        </button>
        <input 
          type="text" 
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={userName ? "Mesaj yaz..." : "Yazmaq üçün daxil olun"} 
          disabled={!userName}
          className="flex-1 min-w-0 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
        />
        <button type="submit" disabled={!text.trim() || !userName} className="w-10 h-10 flex-shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-colors disabled:opacity-50">
          <Send className="w-4 h-4" />
        </button>
      </form>
  
    </div>
  );
}

