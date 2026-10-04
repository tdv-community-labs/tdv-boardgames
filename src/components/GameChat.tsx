'use client';
import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { ref, push, onValue, serverTimestamp } from 'firebase/database';
import { Send, MessageSquare, Mic, Play, Square } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChatProps {
  roomId: string | null;
  gameName: string;
  userName: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  type?: 'text' | 'audio';
  audioData?: string;
  timestamp: number;
}

const EMOJIS = ['🔥', '👍', '😂', '😎', '💀', '🎉', '😡', '🤝', '🏆'];

export default function GameChat({ roomId, gameName, userName }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Audio Recording states
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const lastPlayedMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!roomId) {
      setMessages([]);
      return;
    }
    const chatRef = ref(db, `games/${gameName}/${roomId}/chat`);
    const unsub = onValue(chatRef, (snap) => {
      const data = snap.val();
      if (data) {
        const parsed = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val
        }));
        parsed.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(parsed);
        
        // Auto-play new audio if not sent by us
        if (parsed.length > 0) {
          const lastMsg = parsed[parsed.length - 1];
          if (lastMsg.type === 'audio' && lastMsg.sender !== userName && lastMsg.id !== lastPlayedMessageIdRef.current) {
             lastPlayedMessageIdRef.current = lastMsg.id;
             playAudio(lastMsg.audioData);
          }
        }
      } else {
        setMessages([]);
      }
    });
    return () => unsub();
  }, [roomId, gameName, userName]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || !roomId) return;
    
    const chatRef = ref(db, `games/${gameName}/${roomId}/chat`);
    await push(chatRef, {
      sender: userName,
      text: text.trim(),
      type: 'text',
      timestamp: serverTimestamp()
    });
    setText('');
  };

  const sendEmoji = async (emoji: string) => {
    if (!roomId) return;
    const chatRef = ref(db, `games/${gameName}/${roomId}/chat`);
    await push(chatRef, {
      sender: userName,
      text: emoji,
      type: 'text',
      timestamp: serverTimestamp()
    });
  };

  const playWalkieTalkieSound = () => {
    const actx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (!actx) return;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, actx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.1);
    osc.connect(gain); gain.connect(actx.destination);
    osc.start(); osc.stop(actx.currentTime + 0.1);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          if (roomId) {
            const chatRef = ref(db, `games/${gameName}/${roomId}/chat`);
            await push(chatRef, {
              sender: userName,
              text: '🎤 Səsli Mesaj',
              type: 'audio',
              audioData: base64data,
              timestamp: serverTimestamp()
            });
          }
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      playWalkieTalkieSound();
    } catch (err) {
      console.error('Mic error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      playWalkieTalkieSound();
    }
  };

  const playAudio = (base64?: string) => {
    if (!base64) return;
    playWalkieTalkieSound();
    setTimeout(() => {
        const audio = new Audio(base64);
        audio.play();
    }, 150);
  };
  
  if (!roomId) return null;

  return (
    <div className="w-full flex flex-col bg-zinc-900/80 border border-zinc-800 rounded-3xl overflow-hidden backdrop-blur-md mt-4 shadow-xl">
      <div className="bg-zinc-800/50 px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Canlı Söhbət / Walkie-Talkie</h3>
        </div>
        {isRecording && (
            <span className="flex items-center gap-1 text-[10px] text-red-400 font-bold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-500"></span> YAZILIR
            </span>
        )}
      </div>
      
      <div className="h-56 overflow-y-auto p-4 flex flex-col gap-3" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="text-xs text-zinc-500 text-center my-auto italic">
            Mesaj yoxdur. Söhbətə başlayın!
          </div>
        ) : (
          messages.map(m => (
            <div key={m.id} className={`flex flex-col max-w-[85%] ${m.sender === userName ? 'self-end items-end' : 'self-start items-start'}`}>
              <span className="text-[10px] text-zinc-500 font-bold mb-0.5 px-1">{m.sender}</span>
              
              {m.type === 'audio' ? (
                  <button 
                    onClick={() => playAudio(m.audioData)}
                    className={`px-4 py-2 rounded-2xl flex items-center gap-2 text-sm shadow-md transition-all active:scale-95 ${m.sender === userName ? 'bg-purple-600 text-white rounded-br-sm' : 'bg-zinc-700 text-zinc-200 rounded-bl-sm'}`}
                  >
                      <Play className="w-4 h-4" />
                      <div className="flex items-center gap-1 h-3">
                          {[1,2,3,4,5].map(i => (
                              <div key={i} className="w-1 bg-white/70 rounded-full animate-pulse" style={{ height: `${Math.random() * 10 + 4}px`, animationDelay: `${i*0.1}s` }}></div>
                          ))}
                      </div>
                  </button>
              ) : (
                  <div className={`px-3 py-2 rounded-2xl text-sm shadow-sm ${m.sender === userName ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-zinc-800 text-zinc-200 rounded-bl-sm'}`}>
                    {m.text}
                  </div>
              )}
            </div>
          ))
        )}
      </div>

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
  
      <form onSubmit={sendMessage} className="p-3 border-t border-zinc-800 flex gap-2 relative">
        <input 
          type="text" 
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Mesaj yazın..." 
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
        />
        
        {text.trim() ? (
            <button type="submit" className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-colors shadow-lg">
              <Send className="w-4 h-4" />
            </button>
        ) : (
            <button 
                type="button"
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                className={`w-10 h-10 rounded-xl text-white flex items-center justify-center transition-all shadow-lg ${isRecording ? 'bg-red-500 scale-110 shadow-[0_0_15px_#ef4444]' : 'bg-purple-600 hover:bg-purple-500'}`}
            >
                {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-4 h-4" />}
            </button>
        )}
      </form>
    </div>
  );
}
