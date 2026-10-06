'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Swords, User, Edit3, Check } from 'lucide-react';
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
  timestamp?: number;
}

const DEFAULT_MESSAGES: ChatMessage[] = [
  { 
    id: 'm-init-welcome', 
    sender: 'TDV_Sistem', 
    text: '🌐 Qlobal Meydana xoş gəlmisiniz! Digər oyunçularla canlı söhbət edə və ya duellərə meydan oxuya bilərsiniz.', 
    timestamp: Date.now() 
  }
];

const STORAGE_CHAT_KEY = 'tdv_global_chat_history_v1';
const STORAGE_NAME_KEY = 'tdv_chat_name';

// Strict deduplication helper by ID and identical sender+text within 3 seconds
function deduplicateMessages(list: ChatMessage[]): ChatMessage[] {
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const result: ChatMessage[] = [];

  for (const m of list) {
    if (!m || !m.text) continue;
    // Discard old fake mock messages
    if (m.id === 'm-init-2' || m.id === 'm-init-3') continue;

    if (m.id && seenIds.has(m.id)) continue;

    const timeBucket = Math.round((m.timestamp || 0) / 3000);
    const contentKey = `${m.sender}:::${m.text.trim()}:::${timeBucket}`;
    if (seenKeys.has(contentKey)) continue;

    if (m.id) seenIds.add(m.id);
    seenKeys.add(contentKey);
    result.push(m);
  }
  return result;
}

export default function GlobalChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [userName, setUserName] = useState<string>('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [showChallengeMenu, setShowChallengeMenu] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const currentTabId = useRef<string>('');

  // Initialize User Identity & Chat History
  useEffect(() => {
    currentTabId.current = 'tab_' + Math.random().toString(36).slice(2) + Date.now().toString(36);

    // 1. User Name Resolution
    let activeName = '';
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (u?.displayName) {
        activeName = u.displayName;
        setUserName(u.displayName);
        localStorage.setItem(STORAGE_NAME_KEY, u.displayName);
      }
    });

    if (!activeName) {
      const savedName = localStorage.getItem(STORAGE_NAME_KEY);
      if (savedName) {
        setUserName(savedName);
      } else {
        const randomNum = Math.floor(100 + Math.random() * 900);
        const generated = `Kiber_Qonaq_${randomNum}`;
        setUserName(generated);
        localStorage.setItem(STORAGE_NAME_KEY, generated);
      }
    }

    // 2. Load Local Messages with deduplication and purging old mock messages
    try {
      const stored = localStorage.getItem(STORAGE_CHAT_KEY);
      if (stored) {
        const parsed: ChatMessage[] = JSON.parse(stored);
        const cleaned = deduplicateMessages(parsed);
        setMessages(cleaned);
        localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(cleaned));
      } else {
        setMessages(DEFAULT_MESSAGES);
        localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(DEFAULT_MESSAGES));
      }
    } catch (e) {
      setMessages(DEFAULT_MESSAGES);
    }

    // 3. Realtime Firebase Listener (graceful)
    let unsubChat: (() => void) | null = null;
    try {
      const chatRef = query(ref(db, 'global_chat'), limitToLast(50));
      unsubChat = onValue(chatRef, (snap) => {
        if (snap.exists()) {
          const data = snap.val();
          const parsed = Object.keys(data).map(k => ({ id: data[k]?.id || k, ...data[k] }));
          setMessages(prev => {
            const merged = deduplicateMessages([...prev, ...parsed]);
            try {
              localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(merged.slice(-50)));
            } catch (err) {}
            return merged;
          });
        }
      }, (error) => {
        console.warn('Firebase RTDB not connected, using resilient local channel.', error);
      });
    } catch (err) {
      console.warn('Firebase RTDB init error:', err);
    }

    // 4. Tab-to-Tab BroadcastChannel Synchronization (SINGLE channel instance per tab)
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('tdv_global_chat');
      channelRef.current = channel;
      channel.onmessage = (event) => {
        // Discard messages sent from this exact tab to prevent double display
        if (event.data?.originTab === currentTabId.current) return;
        if (event.data?.type === 'NEW_MESSAGE' && event.data.message) {
          setMessages(prev => {
            const next = deduplicateMessages([...prev, event.data.message]);
            try {
              localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(next.slice(-50)));
            } catch (e) {}
            return next;
          });
        }
      };
    }

    return () => {
      unsubAuth();
      if (unsubChat) unsubChat();
      if (channelRef.current) {
        channelRef.current.close();
        channelRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const saveNewNickname = () => {
    if (tempName.trim()) {
      const cleaned = tempName.trim().slice(0, 20);
      setUserName(cleaned);
      localStorage.setItem(STORAGE_NAME_KEY, cleaned);
    }
    setIsEditingName(false);
  };

  const broadcastAndSaveMessage = (newMsg: ChatMessage) => {
    setMessages(prev => {
      const updated = deduplicateMessages([...prev, newMsg]);
      try {
        localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(updated.slice(-50)));
      } catch (e) {}
      return updated;
    });

    // Broadcast to other tabs ONLY (never to this tab)
    if (channelRef.current) {
      try {
        channelRef.current.postMessage({ 
          type: 'NEW_MESSAGE', 
          message: newMsg, 
          originTab: currentTabId.current 
        });
      } catch (e) {}
    }

    // Attempt Firebase RTDB write in background
    try {
      const chatRef = ref(db, 'global_chat');
      push(chatRef, { 
        ...newMsg, 
        timestamp: serverTimestamp() 
      }).catch(() => {});
    } catch (e) {}
  };

  const sendChallenge = async (gameId: string, gameName: string) => {
    const sender = userName || 'Kiber_Qonaq';
    const challengeRoom = `duel-${Date.now()}`;
    const newMsg: ChatMessage = {
      id: `chal-${Date.now()}`,
      sender,
      text: `Sizi ${gameName} oynamağa çağırıram! Kimin cəsarəti var?`,
      type: 'challenge',
      challengeUrl: `/${gameId}?room=${challengeRoom}`,
      challengeGame: gameName,
      timestamp: Date.now()
    };

    broadcastAndSaveMessage(newMsg);
    setShowChallengeMenu(false);
  };

  const sendEmoji = async (emoji: string) => {
    const sender = userName || 'Kiber_Qonaq';
    const newMsg: ChatMessage = {
      id: `emj-${Date.now()}`,
      sender,
      text: emoji,
      timestamp: Date.now()
    };
    broadcastAndSaveMessage(newMsg);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    const sender = userName || 'Kiber_Qonaq';
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender,
      text: text.trim(),
      timestamp: Date.now()
    };

    broadcastAndSaveMessage(newMsg);
    setText('');
  };

  const EMOJIS = ['👋', '🔥', '🎮', '♟️', '😎', '🏆'];

  return (
    <div className="w-full flex flex-col bg-zinc-900/80 border border-zinc-800 rounded-3xl overflow-hidden backdrop-blur-md h-[400px]">
      
      {/* Chat Top Bar */}
      <div className="bg-zinc-800/50 px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">Qlobal Meydan</h3>
        </div>

        {/* User Identity Pill (Clickable / Editable) */}
        <div className="flex items-center gap-1.5">
          {isEditingName ? (
            <div className="flex items-center gap-1 bg-zinc-950 px-2 py-0.5 rounded-lg border border-purple-500">
              <input
                type="text"
                autoFocus
                value={tempName}
                onChange={e => setTempName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveNewNickname(); }}
                className="bg-transparent text-xs text-white outline-none w-24 font-bold"
                placeholder="Ləqəb..."
              />
              <button onClick={saveNewNickname} className="text-emerald-400 hover:text-emerald-300">
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setTempName(userName); setIsEditingName(true); }}
              className="group flex items-center gap-1.5 px-2.5 py-1 bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-full text-[10px] font-bold text-zinc-300 transition-all"
              title="Ləqəbinizi dəyişmək üçün klikləyin"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="truncate max-w-[100px]">{userName || 'Qonaq'}</span>
              <Edit3 className="w-2.5 h-2.5 text-zinc-500 group-hover:text-purple-400" />
            </button>
          )}

          <Link href="/login" className="text-[10px] text-zinc-500 hover:text-zinc-300 font-bold px-1.5 py-0.5 rounded transition">
            Giriş
          </Link>
        </div>
      </div>
      
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5 custom-scrollbar" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="text-xs text-zinc-500 text-center my-auto italic">
            Çat boşdur. İlk mesajı siz yazın!
          </div>
        ) : (
          messages.map(m => {
            const isMe = m.sender === userName;
            return (
              <div key={m.id} className={`flex flex-col max-w-[88%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
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
                  <div className={`px-3.5 py-2 text-sm shadow-sm break-words ${isMe ? 'bg-emerald-600 text-white rounded-2xl rounded-tr-sm' : 'bg-zinc-800 text-zinc-200 rounded-2xl rounded-tl-sm'}`}>
                    {m.text}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Emoji Bar */}
      <div className="bg-zinc-800/30 px-3 py-1.5 border-t border-zinc-800 flex items-center justify-between gap-1 overflow-x-auto custom-scrollbar">
        {EMOJIS.map(em => (
          <button 
            key={em} 
            onClick={() => sendEmoji(em)} 
            type="button" 
            className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg hover:bg-zinc-700/50 transition-colors text-lg active:scale-95"
          >
            {em}
          </button>
        ))}
      </div>
      
      {/* Challenge Menu Dropdown */}
      {showChallengeMenu && (
        <div className="bg-zinc-950 border-t border-zinc-800 p-2.5 grid grid-cols-2 gap-2">
          <button onClick={() => sendChallenge('chess', 'Şahmat')} type="button" className="py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-white rounded-xl border border-zinc-800 flex items-center justify-center gap-1.5 transition">♟️ Şahmat</button>
          <button onClick={() => sendChallenge('checkers', 'Dama')} type="button" className="py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-white rounded-xl border border-zinc-800 flex items-center justify-center gap-1.5 transition">🔴 Dama</button>
          <button onClick={() => sendChallenge('connect4', 'Dördünü Birləşdir')} type="button" className="py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-white rounded-xl border border-zinc-800 flex items-center justify-center gap-1.5 transition">🟡 Dördünü Birləşdir</button>
          <button onClick={() => sendChallenge('othello', 'Othello')} type="button" className="py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-white rounded-xl border border-zinc-800 flex items-center justify-center gap-1.5 transition">⚪ Othello</button>
        </div>
      )}

      {/* Input & Send Form */}
      <form onSubmit={sendMessage} className="p-3 border-t border-zinc-800 flex gap-2 relative">
        <button 
          type="button" 
          onClick={() => setShowChallengeMenu(!showChallengeMenu)}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${showChallengeMenu ? 'bg-red-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white'}`}
          title="Meydan Oxu (Duel Göndər)"
        >
          <Swords className="w-4 h-4" />
        </button>

        <input 
          type="text" 
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={`Mesaj yaz... (${userName})`} 
          className="flex-1 min-w-0 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
        />

        <button 
          type="submit" 
          disabled={!text.trim()} 
          className="w-10 h-10 flex-shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-colors disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
  
    </div>
  );
}
