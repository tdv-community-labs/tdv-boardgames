export type Piece = 'w' | 'b' | null;
export type BoardState = Piece[][];

export class GoEngine {
  board: BoardState;
  turn: 'b' | 'w'; // Black always plays first in Go
  size: number;
  lastMove: {r: number, c: number} | null;

  constructor(size = 19) {
    this.size = size;
    this.board = Array(size).fill(null).map(() => Array(size).fill(null));
    this.turn = 'b';
    this.lastMove = null;
  }

  isValidPos(r: number, c: number) {
    return r >= 0 && r < this.size && c >= 0 && c < this.size;
  }

  // Returns true if move is valid, false otherwise
  placeStone(r: number, c: number): boolean {
    if (!this.isValidPos(r, c) || this.board[r][c] !== null) return false;

    // Place the stone temporarily
    this.board[r][c] = this.turn;
    
    // Check captures of opponent stones
    let opponent = this.turn === 'b' ? 'w' : 'b';
    let capturedAny = false;
    
    const dirs = [[1,0], [-1,0], [0,1], [0,-1]];
    for (let [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (this.isValidPos(nr, nc) && this.board[nr][nc] === opponent) {
        if (!this.hasLiberties(nr, nc, opponent)) {
          this.captureGroup(nr, nc, opponent);
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

    this.lastMove = {r, c};
    this.turn = opponent as 'b'|'w';
    return true;
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

  captureGroup(startR: number, startC: number, color: Piece) {
    let queue = [{r: startR, c: startC}];
    this.board[startR][startC] = null; // capture

    while (queue.length > 0) {
      const curr = queue.shift()!;
      
      const dirs = [[1,0], [-1,0], [0,1], [0,-1]];
      for (let [dr, dc] of dirs) {
        const nr = curr.r + dr, nc = curr.c + dc;
        if (this.isValidPos(nr, nc) && this.board[nr][nc] === color) {
          this.board[nr][nc] = null;
          queue.push({r: nr, c: nc});
        }
      }
    }
  }

  // Simple random bot
  playBotMove() {
    let emptyCells: {r: number, c: number}[] = [];
    for(let r=0; r<this.size; r++) {
      for(let c=0; c<this.size; c++) {
        if(this.board[r][c] === null) {
          emptyCells.push({r, c});
        }
      }
    }
    
    // Shuffle and try places
    emptyCells.sort(() => Math.random() - 0.5);
    for (let cell of emptyCells) {
      if (this.placeStone(cell.r, cell.c)) {
        return true;
      }
    }
    return false; // pass
  }
}
