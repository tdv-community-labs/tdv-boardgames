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

  // --- AI LOGIC (Minimax with Alpha-Beta Pruning) ---

  evaluateBoard(): number {
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (piece === 'b') score += 10;
        else if (piece === 'B') score += 30; // King value
        else if (piece === 'w') score -= 10;
        else if (piece === 'W') score -= 30;

        // Positional bonus (center is good, back row is good)
        if (piece && piece.toLowerCase() === 'b') {
          if (r === 0) score += 5; // keep back row
          if (c > 1 && c < 6) score += 2;
        }
      }
    }
    return score; // Positive means Black (Bot) is winning
  }

  getBestMove(depth: number = 4): Move | null {
    let bestScore = -Infinity;
    let bestMove: Move | null = null;
    
    const validMoves = this.getValidMoves('b');
    if (validMoves.length === 0) return null;
    if (validMoves.length === 1) return validMoves[0]; // Forced move

    for (let move of validMoves) {
      // Clone board
      const backupBoard = this.board.map(r => [...r]);
      const backupTurn = this.turn;
      
      // Make move manually without checkWin overhead
      this.board[move.toRow][move.toCol] = this.board[move.fromRow][move.fromCol];
      this.board[move.fromRow][move.fromCol] = null;
      if (move.jumped) this.board[move.jumped.row][move.jumped.col] = null;
      if (move.toRow === 7) this.board[move.toRow][move.toCol] = 'B';
      this.turn = 'w';

      let score = this.minimax(depth - 1, -Infinity, Infinity, false);
      
      // Undo
      this.board = backupBoard;
      this.turn = backupTurn;

      // Add a tiny random variance so the bot doesn't play identically every game
      score += (Math.random() * 2 - 1); 

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    return bestMove || validMoves[Math.floor(Math.random() * validMoves.length)];
  }

  minimax(depth: number, alpha: number, beta: number, isMaximizing: boolean): number {
    if (depth === 0) return this.evaluateBoard();

    const moves = this.getValidMoves(isMaximizing ? 'b' : 'w');
    if (moves.length === 0) {
      return isMaximizing ? -1000 : 1000; // Loss
    }

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (let move of moves) {
        const backupBoard = this.board.map(r => [...r]);
        
        this.board[move.toRow][move.toCol] = this.board[move.fromRow][move.fromCol];
        this.board[move.fromRow][move.fromCol] = null;
        if (move.jumped) this.board[move.jumped.row][move.jumped.col] = null;
        if (move.toRow === 7) this.board[move.toRow][move.toCol] = 'B';

        let evalScore = this.minimax(depth - 1, alpha, beta, false);
        this.board = backupBoard;

        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (let move of moves) {
        const backupBoard = this.board.map(r => [...r]);
        
        this.board[move.toRow][move.toCol] = this.board[move.fromRow][move.fromCol];
        this.board[move.fromRow][move.fromCol] = null;
        if (move.jumped) this.board[move.jumped.row][move.jumped.col] = null;
        if (move.toRow === 0) this.board[move.toRow][move.toCol] = 'W';

        let evalScore = this.minimax(depth - 1, alpha, beta, true);
        this.board = backupBoard;

        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }
}
