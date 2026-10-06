'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Swords, Users, Plus, Shield, Clock, Flame, 
  CheckCircle, ArrowRight, Sparkles, ChevronRight, Play, Award, RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  Tournament, 
  TournamentPlayer, 
  GAME_DETAILS, 
  getStoredTournaments, 
  saveTournaments, 
  createNewTournament, 
  joinExistingTournament, 
  setMatchWinner 
} from '@/utils/tournaments';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'open' | 'completed'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [userAvatar, setUserAvatar] = useState<string>('😎');

  // New Tournament Form State
  const [formTitle, setFormTitle] = useState('');
  const [formGame, setFormGame] = useState<'chess' | 'checkers' | 'connect4' | 'othello' | 'go'>('chess');
  const [formMaxPlayers, setFormMaxPlayers] = useState<4 | 8>(8);
  const [formTimeControl, setFormTimeControl] = useState('5 dəq Blitz');
  const [formPrizePool, setFormPrizePool] = useState('1000 XP + Qızıl Kubok');

  useEffect(() => {
    // Load identity
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUserName(u.displayName || 'Oyunçu');
      } else {
        const localName = localStorage.getItem('tdv_chat_name');
        setUserName(localName || 'Kiber_Qonaq');
      }
    });

    const list = getStoredTournaments();
    setTournaments(list);
    if (list.length > 0) setSelectedTournament(list[0]);

    // BroadcastChannel sync across tabs
    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel('tdv_tournaments_channel');
      channel.onmessage = (event) => {
        if (event.data?.type === 'UPDATE' && event.data.tournaments) {
          setTournaments(event.data.tournaments);
          setSelectedTournament(prev => {
            if (!prev) return event.data.tournaments[0] || null;
            return event.data.tournaments.find((t: Tournament) => t.id === prev.id) || prev;
          });
        }
      };
    }

    return () => {
      unsubAuth();
      if (channel) channel.close();
    };
  }, []);

  const refreshTournaments = () => {
    const list = getStoredTournaments();
    setTournaments(list);
    if (selectedTournament) {
      const updated = list.find(t => t.id === selectedTournament.id);
      if (updated) setSelectedTournament(updated);
    }
  };

  const handleCreateTournament = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const created = createNewTournament({
      title: formTitle.trim(),
      game: formGame,
      maxPlayers: formMaxPlayers,
      timeControl: formTimeControl,
      prizePool: formPrizePool,
      creatorName: userName || 'Kiber_Qonaq',
      creatorAvatar: userAvatar
    });

    setShowCreateModal(false);
    setFormTitle('');
    refreshTournaments();
    setSelectedTournament(created);
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
  };

  const handleJoinTournament = (tId: string) => {
    const player: TournamentPlayer = {
      id: `p-${Date.now()}`,
      name: userName || `Qonaq_${Math.floor(Math.random() * 900 + 100)}`,
      avatar: userAvatar,
      elo: 1200 + Math.floor(Math.random() * 150)
    };

    const res = joinExistingTournament(tId, player);
    if (res.success) {
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      refreshTournaments();
    } else {
      alert(res.message);
    }
  };

  const handleMatchWin = (tId: string, matchId: string, winner: TournamentPlayer) => {
    const updated = setMatchWinner(tId, matchId, winner);
    if (updated) {
      if (updated.winner) {
        confetti({ particleCount: 120, spread: 100, origin: { y: 0.5 } });
      }
      refreshTournaments();
    }
  };

  const filteredTournaments = tournaments.filter(t => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  return (
    <div className="min-h-screen text-white pt-24 pb-20 px-4 sm:px-6 max-w-7xl mx-auto relative z-10">
      
      {/* Background Cyber Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-purple-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-10 right-10 w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-[100px]" />
      </div>

      {/* Header Banner */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 bg-gradient-to-r from-purple-950/70 via-zinc-950/80 to-cyan-950/70 border border-purple-500/30 rounded-[2.5rem] p-8 sm:p-10 backdrop-blur-2xl shadow-[0_0_50px_rgba(168,85,247,0.15)] overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-purple-500 to-cyan-500 opacity-70"></div>
        
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-xs font-black text-purple-400 uppercase tracking-widest mb-4">
            <Trophy className="w-3.5 h-3.5 text-purple-400" />
            <span>TDV Arena Çempionat Mərkəzi</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white flex items-center gap-3">
            Kiber Turnir Arenası
            <Sparkles className="w-8 h-8 text-amber-400 hidden sm:block animate-pulse" />
          </h1>
          <p className="text-zinc-400 mt-2 max-w-xl text-sm sm:text-base leading-relaxed">
            Şahmat, Dama və digər intellektual oyunlar üzrə rəsmi məktəb çempionatları. Öz turnirini qur, dostlarını dəvət et və çempion kubokunu qazan!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-black text-sm uppercase tracking-wider flex items-center gap-3 shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:shadow-[0_0_40px_rgba(168,85,247,0.7)] transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            <span>Turnir Yarat</span>
          </button>
        </div>
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10 relative z-10">
        <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-md">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{tournaments.length}</div>
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Ümumi Turnirlər</div>
          </div>
        </div>

        <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-md">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-400">
              {tournaments.filter(t => t.status === 'active').length}
            </div>
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Aktiv Döyüşlər</div>
          </div>
        </div>

        <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-md">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-cyan-400">
              {tournaments.reduce((acc, t) => acc + t.players.length, 0)}
            </div>
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Qeydiyyatlı Qladiator</div>
          </div>
        </div>

        <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-md">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-400">5000+ XP</div>
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Mükafat Fondu</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Tournaments List (Left) & Bracket Display (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* Tournaments List Column */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          
          {/* Filter Tabs */}
          <div className="flex items-center gap-2 p-1.5 bg-zinc-950/80 border border-zinc-800/80 rounded-2xl overflow-x-auto custom-scrollbar">
            {[
              { id: 'all', label: 'Hamısı' },
              { id: 'active', label: 'Canlı Döyüşlər' },
              { id: 'open', label: 'Qeydiyyat Açıq' },
              { id: 'completed', label: 'Başa Çatanlar' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  filter === tab.id 
                    ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Cards */}
          <div className="flex flex-col gap-3.5 max-h-[680px] overflow-y-auto custom-scrollbar pr-1">
            {filteredTournaments.length === 0 ? (
              <div className="p-8 text-center bg-zinc-950/50 border border-zinc-800/60 rounded-3xl text-zinc-500 text-xs italic">
                Bu kateqoriyada turnir tapılmadı.
              </div>
            ) : (
              filteredTournaments.map(t => {
                const isSelected = selectedTournament?.id === t.id;
                const gameInfo = GAME_DETAILS[t.game] || { name: t.game, icon: '🎮', path: '/' };
                
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTournament(t)}
                    className={`p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden group ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.25)]'
                        : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
                          {gameInfo.icon}
                        </div>
                        <div>
                          <h3 className="font-black text-sm text-white group-hover:text-purple-300 transition-colors">
                            {t.title}
                          </h3>
                          <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                            {gameInfo.name} • {t.timeControl}
                          </div>
                        </div>
                      </div>

                      <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border ${
                        t.status === 'active' 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 animate-pulse'
                          : t.status === 'open'
                            ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                      }`}>
                        {t.status === 'active' ? 'CANLI' : t.status === 'open' ? 'QEYDİYYAT' : 'BİTDİ'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60 text-xs">
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <Users className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="font-bold text-white">{t.players.length}</span>
                        <span className="text-zinc-600">/ {t.maxPlayers} oyunçu</span>
                      </div>

                      <div className="flex items-center gap-1 text-amber-400 font-bold text-[11px]">
                        <Trophy className="w-3 h-3" />
                        <span>{t.prizePool}</span>
                      </div>
                    </div>

                    {t.status === 'open' && t.players.length < t.maxPlayers && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJoinTournament(t.id);
                        }}
                        className="w-full mt-3 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/60 border border-purple-500/40 text-purple-200 font-black text-xs uppercase tracking-wider transition-all"
                      >
                        Turnirə Qoşul
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Detailed Tournament Bracket Column */}
        <div className="lg:col-span-7">
          {selectedTournament ? (
            <div className="bg-zinc-950/80 border border-purple-900/40 rounded-[2.5rem] p-6 sm:p-8 backdrop-blur-2xl shadow-[0_0_40px_rgba(168,85,247,0.15)] flex flex-col gap-6 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-70"></div>

              {/* Tournament Title Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{GAME_DETAILS[selectedTournament.game]?.icon || '🎮'}</span>
                    <h2 className="text-xl sm:text-2xl font-black text-white">{selectedTournament.title}</h2>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Təşkilatçı: <span className="text-purple-400 font-bold">{selectedTournament.createdBy}</span> • Format: <span className="text-white font-bold">{selectedTournament.maxPlayers} Oyunçulu Pley-off</span>
                  </p>
                </div>

                {selectedTournament.winner ? (
                  <div className="px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center gap-2 text-amber-300">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <div>
                      <div className="text-[9px] uppercase font-bold text-amber-500">ÇEMPİON</div>
                      <div className="text-sm font-black text-white">{selectedTournament.winner.avatar} {selectedTournament.winner.name}</div>
                    </div>
                  </div>
                ) : selectedTournament.status === 'open' ? (
                  <button
                    onClick={() => handleJoinTournament(selectedTournament.id)}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider shadow-lg transition-all"
                  >
                    Mübarizəyə Qoşul
                  </button>
                ) : (
                  <span className="text-xs font-black text-emerald-400 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    CANLI MATÇLAR GEDİR
                  </span>
                )}
              </div>

              {/* Registered Players Avatars */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  İştirakçı Qladiatorlar ({selectedTournament.players.length}/{selectedTournament.maxPlayers})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTournament.players.map((p, idx) => (
                    <div
                      key={p.id || idx}
                      className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs"
                    >
                      <span>{p.avatar || '😎'}</span>
                      <span className="font-bold text-zinc-200">{p.name}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">({p.elo || 1200})</span>
                    </div>
                  ))}
                  {Array.from({ length: selectedTournament.maxPlayers - selectedTournament.players.length }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="flex items-center gap-2 bg-zinc-950/40 border border-dashed border-zinc-800 px-3 py-1.5 rounded-xl text-xs text-zinc-600 italic"
                    >
                      Boş Yer
                    </div>
                  ))}
                </div>
              </div>

              {/* Tournament Interactive Bracket Tree */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                  <Swords className="w-4 h-4 text-purple-400" />
                  İnteraktiv Turnir Toru (Bracket)
                </h4>

                {selectedTournament.matches.length === 0 ? (
                  <div className="p-10 text-center bg-zinc-900/40 border border-zinc-800/80 rounded-3xl">
                    <Clock className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                    <h5 className="font-bold text-white text-sm mb-1">Turnir toru hazırlanır</h5>
                    <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                      Kifayət qədər iştirakçı qeydiyyatdan keçdikdən sonra pley-off cütlükləri avtomatik formalaşacaq.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Render by Rounds */}
                    {[1, 2, 3].map(roundNum => {
                      const roundMatches = selectedTournament.matches.filter(m => m.round === roundNum);
                      if (roundMatches.length === 0) return null;
                      const roundTitle = roundNum === 1 ? '1/4 Final Mərhələsi' : roundNum === 2 ? 'Yarımfinal Döyüşləri' : '🏆 BÖYÜK FİNAL';

                      return (
                        <div key={roundNum} className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-widest text-purple-400">
                              {roundTitle}
                            </span>
                            <div className="h-px bg-zinc-800 flex-1"></div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {roundMatches.map(m => {
                              const isCompleted = m.status === 'completed';
                              const p1Won = m.winner && m.winner.id === m.player1?.id;
                              const p2Won = m.winner && m.winner.id === m.player2?.id;
                              const gamePath = GAME_DETAILS[selectedTournament.game]?.path || '/chess';

                              return (
                                <div
                                  key={m.id}
                                  className={`p-4 rounded-2xl border transition-all ${
                                    isCompleted 
                                      ? 'bg-zinc-950/60 border-zinc-800/80' 
                                      : 'bg-zinc-900/80 border-purple-500/40 shadow-sm'
                                  }`}
                                >
                                  {/* Player 1 */}
                                  <div className={`flex items-center justify-between p-2 rounded-xl mb-1.5 transition-colors ${
                                    p1Won ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-zinc-950/40'
                                  }`}>
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span>{m.player1?.avatar || '👤'}</span>
                                      <span className={`text-xs font-bold truncate ${p1Won ? 'text-emerald-400 font-black' : 'text-zinc-200'}`}>
                                        {m.player1?.name || 'Gözlənilir...'}
                                      </span>
                                    </div>
                                    {p1Won && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                                  </div>

                                  {/* Player 2 */}
                                  <div className={`flex items-center justify-between p-2 rounded-xl mb-3 transition-colors ${
                                    p2Won ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-zinc-950/40'
                                  }`}>
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span>{m.player2?.avatar || '👤'}</span>
                                      <span className={`text-xs font-bold truncate ${p2Won ? 'text-emerald-400 font-black' : 'text-zinc-200'}`}>
                                        {m.player2?.name || 'Gözlənilir...'}
                                      </span>
                                    </div>
                                    {p2Won && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                                  </div>

                                  {/* Match Actions */}
                                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/60">
                                    {m.player1 && m.player2 && !isCompleted ? (
                                      <>
                                        <Link
                                          href={`${gamePath}?room=${m.roomId}`}
                                          className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
                                        >
                                          <Play className="w-3.5 h-3.5 fill-current" />
                                          <span>Matça Gir</span>
                                        </Link>

                                        {/* Quick Winner Simulator/Decider for Testing or Local Referee */}
                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={() => handleMatchWin(selectedTournament.id, m.id, m.player1!)}
                                            className="px-2 py-1.5 bg-zinc-800 hover:bg-emerald-600/40 text-[10px] font-bold text-zinc-300 rounded-lg transition"
                                            title="1-ci oyunçu qələbəsi"
                                          >
                                            1 Qazandı
                                          </button>
                                          <button
                                            onClick={() => handleMatchWin(selectedTournament.id, m.id, m.player2!)}
                                            className="px-2 py-1.5 bg-zinc-800 hover:bg-emerald-600/40 text-[10px] font-bold text-zinc-300 rounded-lg transition"
                                            title="2-ci oyunçu qələbəsi"
                                          >
                                            2 Qazandı
                                          </button>
                                        </div>
                                      </>
                                    ) : isCompleted ? (
                                      <div className="w-full text-center text-[10px] text-zinc-500 font-mono">
                                        Nəticə: {m.score || '1 - 0'} • Qalib: <span className="text-emerald-400 font-bold">{m.winner?.name}</span>
                                      </div>
                                    ) : (
                                      <div className="w-full text-center text-[10px] text-zinc-600 italic">
                                        Rəqiblərin müəyyənləşməsi gözlənilir
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-zinc-950/60 border border-zinc-800 rounded-[2.5rem] text-zinc-500">
              Turnir seçilməyib. Soldakı siyahıdan bir turnir seçin.
            </div>
          )}
        </div>
      </div>

      {/* CREATE TOURNAMENT MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-950 border border-purple-500/40 rounded-[2rem] p-6 sm:p-8 max-w-lg w-full shadow-[0_0_50px_rgba(168,85,247,0.3)] relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-cyan-500"></div>

              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-black text-white">Yeni Turnir Quraşdır</h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-full bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center transition"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateTournament} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Turnirin Adı
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Məsələn: TDV Qış Şahmat Kuboku 2026"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                      Oyun Növü
                    </label>
                    <select
                      value={formGame}
                      onChange={(e) => setFormGame(e.target.value as any)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-purple-500 transition"
                    >
                      <option value="chess">♟️ Şahmat</option>
                      <option value="checkers">🔴 Dama</option>
                      <option value="connect4">🟡 Dördünü Birləşdir</option>
                      <option value="othello">⚪ Othello</option>
                      <option value="go">⚫ Qo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                      İştirakçı Limiti
                    </label>
                    <select
                      value={formMaxPlayers}
                      onChange={(e) => setFormMaxPlayers(Number(e.target.value) as 4 | 8)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-purple-500 transition"
                    >
                      <option value={4}>4 Oyunçu (Yarımfinal + Final)</option>
                      <option value={8}>8 Oyunçu (Tam 1/4 Bracket)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                      Vaxt Rejimi
                    </label>
                    <select
                      value={formTimeControl}
                      onChange={(e) => setFormTimeControl(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-purple-500 transition"
                    >
                      <option value="3 dəq Blitz">⚡ 3 dəq Blitz</option>
                      <option value="5 dəq Blitz">⏱️ 5 dəq Blitz</option>
                      <option value="10 dəq Rapid">⏳ 10 dəq Rapid</option>
                      <option value="15 dəq Klassik">♟️ 15 dəq Klassik</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                      Mükafat Fondu
                    </label>
                    <input
                      type="text"
                      value={formPrizePool}
                      onChange={(e) => setFormPrizePool(e.target.value)}
                      placeholder="1000 XP + Kubok"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(168,85,247,0.4)] transition-all hover:scale-[1.02] active:scale-95"
                  >
                    Turniri Başlat və Qeydiyyata Aç
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
