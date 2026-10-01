export type Player = 'b' | 'w';
export type BoardState = (Player | null)[][];

export interface Move {
  r: number;
  c: number;
  flips: {r: number, c: number}[];
}

export class OthelloEngine {
  board: BoardState;
  turn: Player;
  winner: Player | 'draw' | null;
  lastMove: any = null;

  constructor() {
    this.board = Array(8).fill(null).map(() => Array(8).fill(null));
    this.board[3][3] = 'w';
    this.board[3][4] = 'b';
    this.board[4][3] = 'b';
    this.board[4][4] = 'w';
    this.turn = 'b'; // Black always goes first
    this.winner = null;
  }

  serialize(): string {
    return JSON.stringify({ board: this.board, turn: this.turn, winner: this.winner, lastMove: this.lastMove });
  }

  load(dataStr: string) {
    try {
      const data = JSON.parse(dataStr);
      this.board = data.board;
      this.turn = data.turn;
      this.winner = data.winner;
      if(data.lastMove) this.lastMove = data.lastMove;
    } catch(e) {}
  }

  getValidMoves(player: Player): Move[] {
    const moves: Move[] = [];
    const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (this.board[r][c] !== null) continue;
        let flips: {r: number, c: number}[] = [];
        for (let [dr, dc] of dirs) {
          let currR = r + dr;
          let currC = c + dc;
          let dirFlips = [];
          while (currR >= 0 && currR < 8 && currC >= 0 && currC < 8) {
            const piece = this.board[currR][currC];
            if (piece === null) break;
            if (piece !== player) {
              dirFlips.push({r: currR, c: currC});
            } else {
              if (dirFlips.length > 0) flips.push(...dirFlips);
              break;
            }
            currR += dr;
            currC += dc;
          }
        }
        if (flips.length > 0) moves.push({ r, c, flips });
      }
    }
    return moves;
  }

  move(r: number, c: number): boolean {
    if (this.winner) return false;
    const moves = this.getValidMoves(this.turn);
    const m = moves.find(m => m.r === r && m.c === c);
    if (!m) return false;

    this.board[r][c] = this.turn;
    this.lastMove = { to: {r, c} };
    m.flips.forEach(f => this.board[f.r][f.c] = this.turn);

    // Swap turn
    const nextPlayer = this.turn === 'b' ? 'w' : 'b';
    const nextMoves = this.getValidMoves(nextPlayer);
    
    if (nextMoves.length > 0) {
      this.turn = nextPlayer;
    } else {
      // Next player has no moves. Can current player go again?
      const currMoves = this.getValidMoves(this.turn);
      if (currMoves.length === 0) {
        this.checkWinner();
      }
    }
    
    return true;
  }

  checkWinner() {
    let bCount = 0, wCount = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (this.board[r][c] === 'b') bCount++;
        else if (this.board[r][c] === 'w') wCount++;
      }
    }
    if (bCount > wCount) this.winner = 'b';
    else if (wCount > bCount) this.winner = 'w';
    else this.winner = 'draw';
  }

  getBestMove(): Move | null {
    const validMoves = this.getValidMoves(this.turn);
    if (validMoves.length === 0) return null;
    let bestScore = -Infinity;
    let bestMoves: Move[] = [];
    const pos = [
      [120, -20,  20,   5,   5,  20, -20, 120],
      [-20, -40,  -5,  -5,  -5,  -5, -40, -20],
      [ 20,  -5,  15,   3,   3,  15,  -5,  20],
      [  5,  -5,   3,   3,   3,   3,  -5,   5],
      [  5,  -5,   3,   3,   3,   3,  -5,   5],
      [ 20,  -5,  15,   3,   3,  15,  -5,  20],
      [-20, -40,  -5,  -5,  -5,  -5, -40, -20],
      [120, -20,  20,   5,   5,  20, -20, 120]
    ];
    for (let m of validMoves) {
      let score = pos[m.r][m.c] + m.flips.length;
      if (score > bestScore) {
        bestScore = score;
        bestMoves = [m];
      } else if (score === bestScore) {
        bestMoves.push(m);
      }
    }
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }
}
