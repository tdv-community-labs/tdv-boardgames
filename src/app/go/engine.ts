export type Piece = 'w' | 'b' | null;
export type BoardState = Piece[][];

export class GoEngine {
  board: BoardState;
  turn: 'b' | 'w'; // Black always plays first in Go
  size: number;
  lastMove: {r: number, c: number} | null;
  winner: 'w' | 'b' | 'draw' | null = null;
  moveHistory: string[] = [];
  captures: { b: number, w: number } = { b: 0, w: 0 };
  consecutivePasses: number = 0;

  constructor(size = 19) {
    this.size = size;
    this.board = Array(size).fill(null).map(() => Array(size).fill(null));
    this.turn = 'b';
    this.lastMove = null;
    this.winner = null;
    this.moveHistory = [];
    this.captures = { b: 0, w: 0 };
    this.consecutivePasses = 0;
  }

  serialize(): string {
    return JSON.stringify({ board: this.board, turn: this.turn, lastMove: this.lastMove, winner: this.winner, moveHistory: this.moveHistory, captures: this.captures, size: this.size, consecutivePasses: this.consecutivePasses });
  }

  load(dataStr: string) {
    try {
      const data = JSON.parse(dataStr);
      this.board = data.board;
      this.turn = data.turn;
      this.lastMove = data.lastMove;
      this.winner = data.winner;
      this.moveHistory = data.moveHistory;
      this.captures = data.captures;
      this.size = data.size;
      this.consecutivePasses = data.consecutivePasses || 0;
    } catch(e) {}
  }

  isValidPos(r: number, c: number) {
    return r >= 0 && r < this.size && c >= 0 && c < this.size;
  }

  toAlgebraic(r: number, c: number) {
    const letters = 'ABCDEFGHJKLMNOPQRST'; // I is usually skipped in Go
    return letters[c] + (this.size - r);
  }

  // Returns true if move is valid, false otherwise
  placeStone(r: number, c: number): boolean {
    if (this.winner) return false;
    if (!this.isValidPos(r, c) || this.board[r][c] !== null) return false;

    // Place the stone temporarily
    this.board[r][c] = this.turn;
    
    // Check captures of opponent stones
    let opponent = this.turn === 'b' ? 'w' : 'b';
    let capturedAny = false;
    let capturedCount = 0;
    
    const dirs = [[1,0], [-1,0], [0,1], [0,-1]];
    for (let [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (this.isValidPos(nr, nc) && this.board[nr][nc] === opponent) {
        if (!this.hasLiberties(nr, nc, opponent)) {
          capturedCount += this.captureGroup(nr, nc, opponent);
          capturedAny = true;
        }
      }
    }

    // Check if the move we just played has liberties (suicide rule)
    if (!capturedAny && !this.hasLiberties(r, c, this.turn)) {
      // Suicide is illegal
      this.board[r][c] = null;
      return false;
    }

    if (this.turn === 'b') this.captures.b += capturedCount;
    else this.captures.w += capturedCount;

    let moveStr = this.toAlgebraic(r, c);
    if (capturedAny) moveStr += 'x';
    this.moveHistory.push(moveStr);

    this.consecutivePasses = 0;
    this.lastMove = {r, c};
    this.turn = opponent as 'b'|'w';
    return true;
  }

  pass(): boolean {
    if (this.winner) return false;
    this.consecutivePasses++;
    this.moveHistory.push(`${this.turn === 'b' ? 'Qara' : 'Ağ'} Pas`);

    if (this.consecutivePasses >= 2) {
      this.calculateWinner();
    } else {
      this.turn = this.turn === 'b' ? 'w' : 'b';
    }
    return true;
  }

  calculateWinner() {
    let bScore = this.captures.b;
    let wScore = this.captures.w + 6.5; // Komi for white

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.board[r][c] === 'b') bScore++;
        else if (this.board[r][c] === 'w') wScore++;
      }
    }

    if (bScore > wScore) this.winner = 'b';
    else if (wScore > bScore) this.winner = 'w';
    else this.winner = 'draw';
  }

  hasLiberties(r: number, c: number, color: Piece): boolean {
    let visited = Array(this.size).fill(false).map(() => Array(this.size).fill(false));
    let queue = [{r, c}];
    visited[r][c] = true;

    while (queue.length > 0) {
      const curr = queue.shift()!;
      
      const dirs = [[1,0], [-1,0], [0,1], [0,-1]];
      for (let [dr, dc] of dirs) {
        const nr = curr.r + dr, nc = curr.c + dc;
        if (this.isValidPos(nr, nc) && !visited[nr][nc]) {
          if (this.board[nr][nc] === null) {
            return true; // Found a liberty
          }
          if (this.board[nr][nc] === color) {
            visited[nr][nc] = true;
            queue.push({r: nr, c: nc});
          }
        }
      }
    }
    return false;
  }

  captureGroup(startR: number, startC: number, color: Piece): number {
    let queue = [{r: startR, c: startC}];
    this.board[startR][startC] = null; // capture
    let count = 1;

    while (queue.length > 0) {
      const curr = queue.shift()!;
      
      const dirs = [[1,0], [-1,0], [0,1], [0,-1]];
      for (let [dr, dc] of dirs) {
        const nr = curr.r + dr, nc = curr.c + dc;
        if (this.isValidPos(nr, nc) && this.board[nr][nc] === color) {
          this.board[nr][nc] = null;
          count++;
          queue.push({r: nr, c: nc});
        }
      }
    }
    return count;
  }

  // Simple greedy bot
  playBotMove() {
    let emptyCells: {r: number, c: number, score: number}[] = [];
    
    for(let r=0; r<this.size; r++) {
      for(let c=0; c<this.size; c++) {
        if(this.board[r][c] === null) {
          // Temporarily place to evaluate
          this.board[r][c] = 'w';
          const valid = this.hasLiberties(r, c, 'w');
          this.board[r][c] = null;
          
          if (valid) {
            let score = this.evaluateMove(r, c, 'w');
            // Add a little randomness
            score += Math.random();
            emptyCells.push({r, c, score});
          }
        }
      }
    }
    
    if (emptyCells.length === 0) return false;

    emptyCells.sort((a, b) => b.score - a.score);
    
    // Play the best move
    return this.placeStone(emptyCells[0].r, emptyCells[0].c);
  }

  evaluateMove(r: number, c: number, color: Piece): number {
    let score = 0;
    const opponent = color === 'w' ? 'b' : 'w';
    
    // Check neighbors
    const dirs = [[1,0], [-1,0], [0,1], [0,-1], [1,1], [1,-1], [-1,1], [-1,-1]];
    for (let [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (this.isValidPos(nr, nc)) {
        if (this.board[nr][nc] === opponent) {
          score += 2; // Attack/Attach
        } else if (this.board[nr][nc] === color) {
          score += 1; // Defend/Connect
        }
      }
    }

    // Prefer 3rd/4th line in early game
    const distEdge = Math.min(r, this.size - 1 - r, c, this.size - 1 - c);
    if (distEdge === 2 || distEdge === 3) score += 1.5;

    return score;
  }
}

