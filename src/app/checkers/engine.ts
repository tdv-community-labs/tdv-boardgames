export type Piece = { color: 'w' | 'b' | 'W' | 'B', id: string } | null;
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

  multiJumpPiece: {r: number, c: number} | null = null;
  private nextId = 1;
  moveHistory: string[] = [];

  constructor() {
    this.board = Array(8).fill(null).map(() => Array(8).fill(null));
    this.turn = 'w';
    this.winner = null;
    this.moveHistory = [];
    this.initBoard();
  }

  serialize(): string {
    return JSON.stringify({
      board: this.board,
      turn: this.turn,
      winner: this.winner,
      multiJumpPiece: this.multiJumpPiece,
      moveHistory: this.moveHistory
    });
  }

  load(dataStr: string) {
    try {
      const data = JSON.parse(dataStr);
      this.board = data.board;
      this.turn = data.turn;
      this.winner = data.winner;
      this.multiJumpPiece = data.multiJumpPiece;
      this.moveHistory = data.moveHistory;
    } catch(e) {}
  }

  initBoard() {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) {
          if (r < 3) this.board[r][c] = { color: 'b', id: `b-${this.nextId++}` };
          else if (r > 4) this.board[r][c] = { color: 'w', id: `w-${this.nextId++}` };
        }
      }
    }
  }

  getValidMoves(player: 'w' | 'b'): Move[] {
    let moves: Move[] = [];
    let jumpMoves: Move[] = [];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        // If we are in the middle of a multijump, restrict to that piece
        if (this.multiJumpPiece && (r !== this.multiJumpPiece.r || c !== this.multiJumpPiece.c)) {
          continue;
        }

        const piece = this.board[r][c];
        if (piece && piece.color.toLowerCase() === player) {
          const isKing = piece.color === piece.color.toUpperCase();
          const dirs = isKing ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] 
                      : (player === 'w' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]);

          for (let [dr, dc] of dirs) {
            // Normal move (only if not restricted by multijump)
            let nr = r + dr, nc = c + dc;
            if (!this.multiJumpPiece && this.isValidPos(nr, nc) && this.board[nr][nc] === null) {
              moves.push({ fromRow: r, fromCol: c, toRow: nr, toCol: nc });
            }
            
            // Jump move
            let jr = r + dr * 2, jc = c + dc * 2;
            if (this.isValidPos(jr, jc) && this.board[nr][nc] !== null && 
                this.board[nr][nc]?.color.toLowerCase() !== player && this.board[jr][jc] === null) {
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

  toAlgebraic(r: number, c: number) {
    return String.fromCharCode(97 + c) + (8 - r);
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

    let moveStr = `${this.toAlgebraic(m.fromRow, m.fromCol)}${m.jumped ? 'x' : '-'}${this.toAlgebraic(m.toRow, m.toCol)}`;
    this.moveHistory.push(moveStr);

    if (m.jumped) {
      this.board[m.jumped.row][m.jumped.col] = null;
    }

    // Kinging
    let madeKing = false;
    if (this.turn === 'w' && m.toRow === 0 && p && p.color !== 'W') {
      this.board[m.toRow][m.toCol] = { color: 'W', id: p.id };
      madeKing = true;
    }
    if (this.turn === 'b' && m.toRow === 7 && p && p.color !== 'B') {
      this.board[m.toRow][m.toCol] = { color: 'B', id: p.id };
      madeKing = true;
    }

    // Check for multijump
    let canJumpAgain = false;
    if (m.jumped && !madeKing) { // Usually kinging ends the turn in many rulesets
      // Simulate checking jumps from new pos
      this.multiJumpPiece = { r: m.toRow, c: m.toCol };
      const furtherJumps = this.getValidMoves(this.turn);
      if (furtherJumps.length > 0 && furtherJumps[0].jumped) {
        canJumpAgain = true;
      } else {
        this.multiJumpPiece = null;
      }
    } else {
      this.multiJumpPiece = null;
    }

    if (!canJumpAgain) {
      this.turn = this.turn === 'w' ? 'b' : 'w';
    }
    
    this.checkWin();
    return true;
  }

  checkWin() {
    // Check normally without multiJump restriction to see if game is over
    const backup = this.multiJumpPiece;
    this.multiJumpPiece = null;
    const wMoves = this.getValidMoves('w');
    const bMoves = this.getValidMoves('b');
    this.multiJumpPiece = backup;

    let wCount = 0, bCount = 0;
    for (let r=0; r<8; r++) {
      for(let c=0; c<8; c++) {
        if (this.board[r][c]?.color.toLowerCase() === 'w') wCount++;
        if (this.board[r][c]?.color.toLowerCase() === 'b') bCount++;
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
        if (!piece) continue;
        
        if (piece.color === 'b') score += 10;
        else if (piece.color === 'B') score += 30; // King value
        else if (piece.color === 'w') score -= 10;
        else if (piece.color === 'W') score -= 30;

        // Positional bonus (center is good, back row is good)
        if (piece.color.toLowerCase() === 'b') {
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
      if (move.toRow === 7) this.board[move.toRow][move.toCol] = { color: 'B', id: 'ai' };
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
        if (move.toRow === 7) this.board[move.toRow][move.toCol] = { color: 'B', id: 'ai' };

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
        if (move.toRow === 0) this.board[move.toRow][move.toCol] = { color: 'W', id: 'ai' };

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


