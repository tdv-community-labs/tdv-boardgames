export type Piece = 'w' | 'b' | null;
export type BoardState = Piece[][];

export interface Flip {
  r: number;
  c: number;
}

export interface Move {
  r: number;
  c: number;
  flips: Flip[];
}

export class OthelloEngine {
  board: BoardState;
  turn: 'b' | 'w'; // Black always goes first in Othello
  winner: 'w' | 'b' | 'draw' | null;
  moveHistory: string[] = [];

  constructor() {
    this.board = Array(8).fill(null).map(() => Array(8).fill(null));
    this.turn = 'b';
    this.winner = null;
    this.moveHistory = [];
    this.initBoard();
  }

  initBoard() {
    this.board[3][3] = 'w';
    this.board[3][4] = 'b';
    this.board[4][3] = 'b';
    this.board[4][4] = 'w';
  }

  isValidPos(r: number, c: number) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
  }

  getValidMoves(player: 'b' | 'w'): Move[] {
    const moves: Move[] = [];
    const opponent = player === 'b' ? 'w' : 'b';
    const dirs = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (this.board[r][c] !== null) continue;

        let flips: Flip[] = [];
        
        for (let [dr, dc] of dirs) {
          let nr = r + dr, nc = c + dc;
          let tempFlips: Flip[] = [];
          
          while (this.isValidPos(nr, nc) && this.board[nr][nc] === opponent) {
            tempFlips.push({ r: nr, c: nc });
            nr += dr;
            nc += dc;
          }

          if (this.isValidPos(nr, nc) && this.board[nr][nc] === player && tempFlips.length > 0) {
            flips.push(...tempFlips);
          }
        }

        if (flips.length > 0) {
          moves.push({ r, c, flips });
        }
      }
    }
    return moves;
  }

  toAlgebraic(r: number, c: number) {
    return String.fromCharCode(97 + c) + (8 - r);
  }

  move(r: number, c: number): boolean {
    if (this.winner) return false;
    
    const validMoves = this.getValidMoves(this.turn);
    const m = validMoves.find(m => m.r === r && m.c === c);
    
    if (!m) return false;

    // Apply move
    this.board[r][c] = this.turn;
    m.flips.forEach(f => {
      this.board[f.r][f.c] = this.turn;
    });

    this.moveHistory.push(this.toAlgebraic(r, c));

    // Switch turns
    const nextPlayer = this.turn === 'b' ? 'w' : 'b';
    const nextMoves = this.getValidMoves(nextPlayer);
    
    if (nextMoves.length > 0) {
      this.turn = nextPlayer;
    } else {
      // Next player has no moves, so current player goes again. If neither has moves, game over.
      const currentMovesAgain = this.getValidMoves(this.turn);
      if (currentMovesAgain.length === 0) {
        this.checkWin();
      } else {
        this.moveHistory.push('pass');
      }
    }
    
    // Always check win condition (board might be full)
    let isFull = true;
    for(let i=0; i<8; i++) for(let j=0; j<8; j++) if(!this.board[i][j]) isFull = false;
    if (isFull) this.checkWin();

    return true;
  }

  checkWin() {
    let b = 0, w = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (this.board[r][c] === 'b') b++;
        else if (this.board[r][c] === 'w') w++;
      }
    }
    if (b > w) this.winner = 'b';
    else if (w > b) this.winner = 'w';
    else this.winner = 'draw';
  }

  // AI Logic (Greedy positional)
  getBestMove(): Move | null {
    const validMoves = this.getValidMoves(this.turn);
    if (validMoves.length === 0) return null;

    let bestScore = -Infinity;
    let bestMoves: Move[] = [];

    const positionalValues = [
      [120, -20,  20,   5,   5,  20, -20, 120],
      [-20, -40,  -5,  -5,  -5,  -5, -40, -20],
      [ 20,  -5,  15,   3,   3,  15,  -5,  20],
      [  5,  -5,   3,   3,   3,   3,  -5,   5],
      [  5,  -5,   3,   3,   3,   3,  -5,   5],
      [ 20,  -5,  15,   3,   3,  15,  -5,  20],
      [-20, -40,  -5,  -5,  -5,  -5, -40, -20],
      [120, -20,  20,   5,   5,  20, -20, 120]
    ];

    for (let move of validMoves) {
      let score = positionalValues[move.r][move.c] + move.flips.length; // Positional value + flip count
      if (score > bestScore) {
        bestScore = score;
        bestMoves = [move];
      } else if (score === bestScore) {
        bestMoves.push(move);
      }
    }

    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }
}
