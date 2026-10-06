export interface TournamentPlayer {
  id: string;
  name: string;
  avatar: string;
  elo: number;
}

export interface TournamentMatch {
  id: string;
  round: number; // 1: 1/4 Final, 2: Yarımfinal, 3: Final
  roundName: string;
  matchIndex: number;
  player1?: TournamentPlayer;
  player2?: TournamentPlayer;
  winner?: TournamentPlayer;
  score?: string;
  roomId: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface Tournament {
  id: string;
  title: string;
  game: 'chess' | 'checkers' | 'connect4' | 'othello' | 'go';
  gameName: string;
  maxPlayers: 4 | 8 | 16;
  players: TournamentPlayer[];
  status: 'open' | 'active' | 'completed';
  createdAt: number;
  createdBy: string;
  timeControl: string;
  prizePool: string;
  matches: TournamentMatch[];
  winner?: TournamentPlayer;
}

export const GAME_DETAILS: Record<string, { name: string; icon: string; path: string }> = {
  chess: { name: 'Şahmat', icon: '♟️', path: '/chess' },
  checkers: { name: 'Dama', icon: '🔴', path: '/checkers' },
  connect4: { name: 'Dördünü Birləşdir', icon: '🟡', path: '/connect4' },
  othello: { name: 'Othello', icon: '⚪', path: '/othello' },
  go: { name: 'Qo', icon: '⚫', path: '/go' }
};

const STORAGE_KEY = 'tdv_tournaments_v1';

const INITIAL_TOURNAMENTS: Tournament[] = [
  {
    id: 'tdv26-chess-gp',
    title: 'CANLI TURNİR #TDV26 (Şahmat Qran-Pri)',
    game: 'chess',
    gameName: 'Şahmat',
    maxPlayers: 8,
    status: 'active',
    createdAt: Date.now() - 3600000,
    createdBy: 'Kiber_Qılınc',
    timeControl: '5 dəq Blitz',
    prizePool: '1500 XP + Qızıl Çempion Kuboku',
    players: [
      { id: 'p1', name: 'Kiber_Qılınc', avatar: '😎', elo: 1450 },
      { id: 'p2', name: 'Murad_Master', avatar: '🦁', elo: 1380 },
      { id: 'p3', name: 'Aysel_Chess', avatar: '👑', elo: 1410 },
      { id: 'p4', name: 'Elmir_TDV', avatar: '⚡', elo: 1320 },
      { id: 'p5', name: 'Orxan_BTL', avatar: '🦅', elo: 1490 },
      { id: 'p6', name: 'Leyla_T', avatar: '🎯', elo: 1290 },
      { id: 'p7', name: 'Kamran_99', avatar: '🐉', elo: 1340 },
      { id: 'p8', name: 'Nigar_Strateg', avatar: '🦊', elo: 1360 }
    ],
    matches: [
      // 1/4 Final (Round 1)
      {
        id: 'm1',
        round: 1,
        roundName: '1/4 Final',
        matchIndex: 0,
        player1: { id: 'p1', name: 'Kiber_Qılınc', avatar: '😎', elo: 1450 },
        player2: { id: 'p2', name: 'Murad_Master', avatar: '🦁', elo: 1380 },
        winner: { id: 'p1', name: 'Kiber_Qılınc', avatar: '😎', elo: 1450 },
        score: '1 - 0',
        roomId: 'tourney-tdv26-r1-m1',
        status: 'completed'
      },
      {
        id: 'm2',
        round: 1,
        roundName: '1/4 Final',
        matchIndex: 1,
        player1: { id: 'p3', name: 'Aysel_Chess', avatar: '👑', elo: 1410 },
        player2: { id: 'p4', name: 'Elmir_TDV', avatar: '⚡', elo: 1320 },
        winner: { id: 'p3', name: 'Aysel_Chess', avatar: '👑', elo: 1410 },
        score: '1 - 0',
        roomId: 'tourney-tdv26-r1-m2',
        status: 'completed'
      },
      {
        id: 'm3',
        round: 1,
        roundName: '1/4 Final',
        matchIndex: 2,
        player1: { id: 'p5', name: 'Orxan_BTL', avatar: '🦅', elo: 1490 },
        player2: { id: 'p6', name: 'Leyla_T', avatar: '🎯', elo: 1290 },
        winner: { id: 'p5', name: 'Orxan_BTL', avatar: '🦅', elo: 1490 },
        score: '1 - 0',
        roomId: 'tourney-tdv26-r1-m3',
        status: 'completed'
      },
      {
        id: 'm4',
        round: 1,
        roundName: '1/4 Final',
        matchIndex: 3,
        player1: { id: 'p7', name: 'Kamran_99', avatar: '🐉', elo: 1340 },
        player2: { id: 'p8', name: 'Nigar_Strateg', avatar: '🦊', elo: 1360 },
        winner: { id: 'p8', name: 'Nigar_Strateg', avatar: '🦊', elo: 1360 },
        score: '0 - 1',
        roomId: 'tourney-tdv26-r1-m4',
        status: 'completed'
      },
      // Yarımfinal (Round 2)
      {
        id: 'm5',
        round: 2,
        roundName: 'Yarımfinal',
        matchIndex: 0,
        player1: { id: 'p1', name: 'Kiber_Qılınc', avatar: '😎', elo: 1450 },
        player2: { id: 'p3', name: 'Aysel_Chess', avatar: '👑', elo: 1410 },
        roomId: 'tourney-tdv26-r2-m1',
        status: 'in_progress'
      },
      {
        id: 'm6',
        round: 2,
        roundName: 'Yarımfinal',
        matchIndex: 1,
        player1: { id: 'p5', name: 'Orxan_BTL', avatar: '🦅', elo: 1490 },
        player2: { id: 'p8', name: 'Nigar_Strateg', avatar: '🦊', elo: 1360 },
        roomId: 'tourney-tdv26-r2-m2',
        status: 'in_progress'
      },
      // Böyük Final (Round 3)
      {
        id: 'm7',
        round: 3,
        roundName: 'Böyük Final',
        matchIndex: 0,
        roomId: 'tourney-tdv26-r3-final',
        status: 'pending'
      }
    ]
  },
  {
    id: 'tdv-checkers-cup',
    title: 'TDV Dama Çempionatı 2026',
    game: 'checkers',
    gameName: 'Dama',
    maxPlayers: 8,
    status: 'open',
    createdAt: Date.now() - 1800000,
    createdBy: 'Tahir_Usta',
    timeControl: '10 dəq Rapid',
    prizePool: '1000 XP + Gümüş Medal',
    players: [
      { id: 'c1', name: 'Tahir_Usta', avatar: '🧙‍♂️', elo: 1420 },
      { id: 'c2', name: 'Rəşad_99', avatar: '🥊', elo: 1350 },
      { id: 'c3', name: 'Sevinc_M', avatar: '🌸', elo: 1280 }
    ],
    matches: []
  },
  {
    id: 'tdv-connect4-speed',
    title: 'Dördünü Birləşdir Sürət Turniri',
    game: 'connect4',
    gameName: 'Dördünü Birləşdir',
    maxPlayers: 4,
    status: 'open',
    createdAt: Date.now() - 900000,
    createdBy: 'Kiber_Sürət',
    timeControl: '3 dəq Blitz',
    prizePool: '600 XP',
    players: [
      { id: 'u1', name: 'Kiber_Sürət', avatar: '⚡', elo: 1300 },
      { id: 'u2', name: 'Fərid_TDV', avatar: '🎮', elo: 1250 }
    ],
    matches: []
  }
];

export function getStoredTournaments(): Tournament[] {
  if (typeof window === 'undefined') return INITIAL_TOURNAMENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_TOURNAMENTS));
      return INITIAL_TOURNAMENTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_TOURNAMENTS;
  }
}

export function saveTournaments(tournaments: Tournament[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tournaments));
    // Notify other tabs
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('tdv_tournaments_channel');
      channel.postMessage({ type: 'UPDATE', tournaments });
      channel.close();
    }
  } catch (e) {
    console.error('Error saving tournaments:', e);
  }
}

export function generateBracket(tournament: Tournament): TournamentMatch[] {
  const players = [...tournament.players];
  const max = tournament.maxPlayers;
  const matches: TournamentMatch[] = [];

  if (max === 4) {
    // 2 Semifinals, 1 Final
    matches.push({
      id: `${tournament.id}-sf1`,
      round: 1,
      roundName: 'Yarımfinal',
      matchIndex: 0,
      player1: players[0],
      player2: players[1],
      roomId: `${tournament.id}-sf1`,
      status: players[0] && players[1] ? 'in_progress' : 'pending'
    });
    matches.push({
      id: `${tournament.id}-sf2`,
      round: 1,
      roundName: 'Yarımfinal',
      matchIndex: 1,
      player1: players[2],
      player2: players[3],
      roomId: `${tournament.id}-sf2`,
      status: players[2] && players[3] ? 'in_progress' : 'pending'
    });
    matches.push({
      id: `${tournament.id}-final`,
      round: 2,
      roundName: 'Final',
      matchIndex: 0,
      roomId: `${tournament.id}-final`,
      status: 'pending'
    });
  } else if (max === 8) {
    // 4 Quarterfinals, 2 Semifinals, 1 Final
    for (let i = 0; i < 4; i++) {
      const p1 = players[i * 2];
      const p2 = players[i * 2 + 1];
      matches.push({
        id: `${tournament.id}-qf${i + 1}`,
        round: 1,
        roundName: '1/4 Final',
        matchIndex: i,
        player1: p1,
        player2: p2,
        roomId: `${tournament.id}-qf${i + 1}`,
        status: p1 && p2 ? 'in_progress' : 'pending'
      });
    }
    matches.push({
      id: `${tournament.id}-sf1`,
      round: 2,
      roundName: 'Yarımfinal',
      matchIndex: 0,
      roomId: `${tournament.id}-sf1`,
      status: 'pending'
    });
    matches.push({
      id: `${tournament.id}-sf2`,
      round: 2,
      roundName: 'Yarımfinal',
      matchIndex: 1,
      roomId: `${tournament.id}-sf2`,
      status: 'pending'
    });
    matches.push({
      id: `${tournament.id}-final`,
      round: 3,
      roundName: 'Böyük Final',
      matchIndex: 0,
      roomId: `${tournament.id}-final`,
      status: 'pending'
    });
  }

  return matches;
}

export function createNewTournament(params: {
  title: string;
  game: 'chess' | 'checkers' | 'connect4' | 'othello' | 'go';
  maxPlayers: 4 | 8 | 16;
  timeControl: string;
  prizePool: string;
  creatorName: string;
  creatorAvatar?: string;
}): Tournament {
  const tournaments = getStoredTournaments();
  const id = `tourney-${Date.now()}`;
  const creator: TournamentPlayer = {
    id: `creator-${Date.now()}`,
    name: params.creatorName || 'Oyunçu',
    avatar: params.creatorAvatar || '😎',
    elo: 1200
  };

  const newTournament: Tournament = {
    id,
    title: params.title,
    game: params.game,
    gameName: GAME_DETAILS[params.game]?.name || params.game,
    maxPlayers: params.maxPlayers,
    players: [creator],
    status: 'open',
    createdAt: Date.now(),
    createdBy: creator.name,
    timeControl: params.timeControl,
    prizePool: params.prizePool || '500 XP',
    matches: []
  };

  tournaments.unshift(newTournament);
  saveTournaments(tournaments);
  return newTournament;
}

export function joinExistingTournament(tournamentId: string, player: TournamentPlayer): { success: boolean; message: string; tournament?: Tournament } {
  const tournaments = getStoredTournaments();
  const target = tournaments.find(t => t.id === tournamentId);
  if (!target) return { success: false, message: 'Turnir tapılmadı' };
  if (target.status !== 'open') return { success: false, message: 'Bu turnirdə artıq qeydiyyat bağlanıb' };
  if (target.players.some(p => p.id === player.id || p.name === player.name)) {
    return { success: false, message: 'Siz artıq bu turnirə qatılmısınız' };
  }
  if (target.players.length >= target.maxPlayers) {
    return { success: false, message: 'Turnirdə boş yer qalmayıb' };
  }

  target.players.push(player);

  // If filled, automatically activate tournament and create bracket!
  if (target.players.length === target.maxPlayers) {
    target.status = 'active';
    target.matches = generateBracket(target);
  }

  saveTournaments(tournaments);
  return { success: true, message: 'Turnirə uğurla qoşuldunuz!', tournament: target };
}

export function setMatchWinner(tournamentId: string, matchId: string, winner: TournamentPlayer): Tournament | null {
  const tournaments = getStoredTournaments();
  const target = tournaments.find(t => t.id === tournamentId);
  if (!target) return null;

  const match = target.matches.find(m => m.id === matchId);
  if (!match) return null;

  match.winner = winner;
  match.status = 'completed';
  match.score = winner.id === match.player1?.id ? '1 - 0' : '0 - 1';

  // Propagate to next round
  if (target.maxPlayers === 4) {
    const finalMatch = target.matches.find(m => m.round === 2);
    if (finalMatch) {
      if (match.matchIndex === 0) finalMatch.player1 = winner;
      else if (match.matchIndex === 1) finalMatch.player2 = winner;

      if (finalMatch.player1 && finalMatch.player2) {
        finalMatch.status = 'in_progress';
      }
    }
    if (match.round === 2) {
      target.winner = winner;
      target.status = 'completed';
    }
  } else if (target.maxPlayers === 8) {
    if (match.round === 1) {
      // Advance to Semifinals (round 2)
      // m1 & m2 winner -> sf1; m3 & m4 winner -> sf2
      const sfIndex = Math.floor(match.matchIndex / 2);
      const sfMatch = target.matches.find(m => m.round === 2 && m.matchIndex === sfIndex);
      if (sfMatch) {
        if (match.matchIndex % 2 === 0) sfMatch.player1 = winner;
        else sfMatch.player2 = winner;

        if (sfMatch.player1 && sfMatch.player2) {
          sfMatch.status = 'in_progress';
        }
      }
    } else if (match.round === 2) {
      // Advance to Final (round 3)
      const finalMatch = target.matches.find(m => m.round === 3);
      if (finalMatch) {
        if (match.matchIndex === 0) finalMatch.player1 = winner;
        else finalMatch.player2 = winner;

        if (finalMatch.player1 && finalMatch.player2) {
          finalMatch.status = 'in_progress';
        }
      }
    } else if (match.round === 3) {
      // Grand champion!
      target.winner = winner;
      target.status = 'completed';
    }
  }

  saveTournaments(tournaments);
  return target;
}
