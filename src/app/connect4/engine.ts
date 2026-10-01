export type Piece = 'r' | 'y' | null;
export type BoardState = Piece[][];

export class Connect4Engine {
  board: BoardState;
  turn: 'r' | 'y';
  winner: 'r' | 'y' | 'draw' | null = null;
  lastMove: {r: number, c: number} | null = null;
  moveHistory: string[] = [];

  constructor() {
    this.board = Array(6).fill(null).map(() => Array(7).fill(null));
    this.turn = 'r';
  }

  serialize(): string {
    return JSON.stringify({
      board: this.board,
      turn: this.turn,
      winner: this.winner,
      lastMove: this.lastMove,
      moveHistory: this.moveHistory
    });
  }

  load(dataStr: string) {
    try {
      const data = JSON.parse(dataStr);
      this.board = data.board;
      this.turn = data.turn;
      this.winner = data.winner;
      this.lastMove = data.lastMove;
      this.moveHistory = data.moveHistory || [];
    } catch (e) {}
  }

  getValidCols(): number[] {
    const cols: number[] = [];
    if (this.winner) return cols;
    for (let c = 0; c < 7; c++) {
      if (this.board[0][c] === null) cols.push(c);
    }
    return cols;
  }

  drop(c: number): boolean {
    if (this.winner) return false;
    if (this.board[0][c] !== null) return false;

    let r = 5;
    while (r >= 0 && this.board[r][c] !== null) {
      r--;
    }

    if (r < 0) return false;

    this.board[r][c] = this.turn;
    this.lastMove = { r, c };
    this.moveHistory.push(`${this.turn === 'r' ? 'Qırmızı' : 'Sarı'} sütun ${c + 1}`);

    if (this.checkWin(r, c, this.turn)) {
      this.winner = this.turn;
    } else if (this.getValidCols().length === 0) {
      this.winner = 'draw';
    } else {
      this.turn = this.turn === 'r' ? 'y' : 'r';
    }
    return true;
  }

  checkWin(row: number, col: number, piece: 'r' | 'y'): boolean {
    const directions = [
      [0, 1], // horizontal
      [1, 0], // vertical
      [1, 1], // diagonal right
      [1, -1] // diagonal left
    ];

    for (const [dr, dc] of directions) {
      let count = 1;

      // Check positive direction
      let r = row + dr;
      let c = col + dc;
      while (r >= 0 && r < 6 && c >= 0 && c < 7 && this.board[r][c] === piece) {
        count++;
        r += dr;
        c += dc;
      }

      // Check negative direction
      r = row - dr;
      c = col - dc;
      while (r >= 0 && r < 6 && c >= 0 && c < 7 && this.board[r][c] === piece) {
        count++;
        r -= dr;
        c -= dc;
      }

      if (count >= 4) return true;
    }

    return false;
  }

  // Minimax Bot AI
  getBestMove(depth: number): number {
    const validCols = this.getValidCols();
    if (validCols.length === 0) return -1;
    
    // Quick win or block
    for (let i = 0; i < 2; i++) {
        const testPiece = i === 0 ? this.turn : (this.turn === 'r' ? 'y' : 'r');
        for (const c of validCols) {
            let r = 5;
            while (r >= 0 && this.board[r][c] !== null) r--;
            this.board[r][c] = testPiece;
            if (this.checkWin(r, c, testPiece)) {
                this.board[r][c] = null;
                return c;
            }
            this.board[r][c] = null;
        }
    }

    // Prefer middle columns
    const centerCols = [3, 2, 4, 1, 5, 0, 6];
    for (const c of centerCols) {
      if (validCols.includes(c)) return c;
    }

    return validCols[Math.floor(Math.random() * validCols.length)];
  }
}

