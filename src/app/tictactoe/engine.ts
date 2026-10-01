export type Player = 'X' | 'O';
export type BoardState = (Player | null)[][];

export class TicTacToeEngine {
  board: BoardState;
  turn: Player;
  winner: Player | 'draw' | null;
  moveHistory: {r: number, c: number}[];

  constructor() {
    this.board = Array(3).fill(null).map(() => Array(3).fill(null));
    this.turn = 'X';
    this.winner = null;
    this.moveHistory = [];
  }

  serialize(): string {
    return JSON.stringify({
      board: this.board,
      turn: this.turn,
      winner: this.winner,
      moveHistory: this.moveHistory
    });
  }

  load(dataStr: string) {
    try {
      const data = JSON.parse(dataStr);
      this.board = data.board;
      this.turn = data.turn;
      this.winner = data.winner;
      this.moveHistory = data.moveHistory;
    } catch(e) {}
  }

  getValidMoves(): {r: number, c: number}[] {
    if (this.winner) return [];
    let moves = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (this.board[r][c] === null) moves.push({r, c});
      }
    }
    return moves;
  }

  move(r: number, c: number): boolean {
    if (this.winner) return false;
    if (this.board[r][c] !== null) return false;

    this.board[r][c] = this.turn;
    this.moveHistory.push({r, c});
    
    this.checkWinner();

    if (!this.winner) {
      this.turn = this.turn === 'X' ? 'O' : 'X';
    }
    
    return true;
  }

  checkWinner() {
    const lines = [
      // Rows
      [[0,0], [0,1], [0,2]],
      [[1,0], [1,1], [1,2]],
      [[2,0], [2,1], [2,2]],
      // Cols
      [[0,0], [1,0], [2,0]],
      [[0,1], [1,1], [2,1]],
      [[0,2], [1,2], [2,2]],
      // Diags
      [[0,0], [1,1], [2,2]],
      [[0,2], [1,1], [2,0]]
    ];

    for (let line of lines) {
      const [a, b, c] = line;
      if (this.board[a[0]][a[1]] && 
          this.board[a[0]][a[1]] === this.board[b[0]][b[1]] && 
          this.board[a[0]][a[1]] === this.board[c[0]][c[1]]) {
        this.winner = this.board[a[0]][a[1]];
        return;
      }
    }

    // Check draw
    let isDraw = true;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (this.board[r][c] === null) isDraw = false;
      }
    }
    if (isDraw) this.winner = 'draw';
  }

  getBestMove(): {r: number, c: number} | null {
    const moves = this.getValidMoves();
    if (moves.length === 0) return null;
    
    let bestScore = -Infinity;
    let bestMove = moves[0];
    
    for (let move of moves) {
      this.board[move.r][move.c] = this.turn;
      let score = this.minimax(this.board, 0, false, this.turn);
      this.board[move.r][move.c] = null;
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    return bestMove;
  }

  minimax(board: BoardState, depth: number, isMaximizing: boolean, aiPlayer: Player): number {
    let result = this.checkWinnerVirtual(board);
    if (result !== null) {
      if (result === 'draw') return 0;
      return result === aiPlayer ? 10 - depth : depth - 10;
    }

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (board[r][c] === null) {
            board[r][c] = aiPlayer;
            let score = this.minimax(board, depth + 1, false, aiPlayer);
            board[r][c] = null;
            bestScore = Math.max(score, bestScore);
          }
        }
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      const opponent = aiPlayer === 'X' ? 'O' : 'X';
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (board[r][c] === null) {
            board[r][c] = opponent;
            let score = this.minimax(board, depth + 1, true, aiPlayer);
            board[r][c] = null;
            bestScore = Math.min(score, bestScore);
          }
        }
      }
      return bestScore;
    }
  }

  checkWinnerVirtual(board: BoardState): Player | 'draw' | null {
    const lines = [
      [[0,0], [0,1], [0,2]],
      [[1,0], [1,1], [1,2]],
      [[2,0], [2,1], [2,2]],
      [[0,0], [1,0], [2,0]],
      [[0,1], [1,1], [2,1]],
      [[0,2], [1,2], [2,2]],
      [[0,0], [1,1], [2,2]],
      [[0,2], [1,1], [2,0]]
    ];
    for (let line of lines) {
      const [a, b, c] = line;
      if (board[a[0]][a[1]] && board[a[0]][a[1]] === board[b[0]][b[1]] && board[a[0]][a[1]] === board[c[0]][c[1]]) {
        return board[a[0]][a[1]];
      }
    }
    let isDraw = true;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (board[r][c] === null) isDraw = false;
      }
    }
    return isDraw ? 'draw' : null;
  }
}
