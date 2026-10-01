export type Piece = 'w' | 'b' | 'W' | 'B' | null;
export type BoardState = Piece[][];

export interface Move {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  jumped?: { row: number, col: number };
}

export class CheckersEngine {
  board: BoardState;
  turn: 'w' | 'b';
  winner: 'w' | 'b' | null;

  constructor() {
    this.board = Array(8).fill(null).map(() => Array(8).fill(null));
    this.turn = 'w';
    this.winner = null;
    this.initBoard();
  }

  initBoard() {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) {
          if (r < 3) this.board[r][c] = 'b';
          else if (r > 4) this.board[r][c] = 'w';
        }
      }
    }
  }

  getValidMoves(player: 'w' | 'b'): Move[] {
    let moves: Move[] = [];
    let jumpMoves: Move[] = [];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (piece && piece.toLowerCase() === player) {
          const isKing = piece === piece.toUpperCase();
          const dirs = isKing ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] 
                      : (player === 'w' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]);

          for (let [dr, dc] of dirs) {
            // Normal move
            let nr = r + dr, nc = c + dc;
            if (this.isValidPos(nr, nc) && this.board[nr][nc] === null) {
              moves.push({ fromRow: r, fromCol: c, toRow: nr, toCol: nc });
            }
            
            // Jump move
            let jr = r + dr * 2, jc = c + dc * 2;
            if (this.isValidPos(jr, jc) && this.board[nr][nc] !== null && 
                this.board[nr][nc]?.toLowerCase() !== player && this.board[jr][jc] === null) {
              jumpMoves.push({ fromRow: r, fromCol: c, toRow: jr, toCol: jc, jumped: { row: nr, col: nc } });
            }
          }
        }
      }
    }

    // In checkers, jumps are mandatory
    return jumpMoves.length > 0 ? jumpMoves : moves;
  }

  isValidPos(r: number, c: number) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
  }

  move(m: Move): boolean {
    const valid = this.getValidMoves(this.turn);
    const isLegal = valid.some(v => v.fromRow === m.fromRow && v.fromCol === m.fromCol && 
                                    v.toRow === m.toRow && v.toCol === m.toCol);
    if (!isLegal) return false;

    // Apply move
    let p = this.board[m.fromRow][m.fromCol];
    this.board[m.fromRow][m.fromCol] = null;
    this.board[m.toRow][m.toCol] = p;

    if (m.jumped) {
      this.board[m.jumped.row][m.jumped.col] = null;
    }

    // Kinging
    if (this.turn === 'w' && m.toRow === 0) this.board[m.toRow][m.toCol] = 'W';
    if (this.turn === 'b' && m.toRow === 7) this.board[m.toRow][m.toCol] = 'B';

    // Switch turns (note: multijumps are simplified here for brevity, we just switch turns)
    this.turn = this.turn === 'w' ? 'b' : 'w';
    this.checkWin();
    return true;
  }

  checkWin() {
    const wMoves = this.getValidMoves('w');
    const bMoves = this.getValidMoves('b');

    let wCount = 0, bCount = 0;
    for (let r=0; r<8; r++) {
      for(let c=0; c<8; c++) {
        if (this.board[r][c]?.toLowerCase() === 'w') wCount++;
        if (this.board[r][c]?.toLowerCase() === 'b') bCount++;
      }
    }

    if (wCount === 0 || wMoves.length === 0) this.winner = 'b';
    else if (bCount === 0 || bMoves.length === 0) this.winner = 'w';
  }
}
