const fs = require('fs');

function addLastMove(file, engineClass, gameName) {
  let c = fs.readFileSync(file, 'utf8');

  // Add lastMove property to engine
  if (!c.includes('lastMove: any = null;')) {
    c = c.replace(/winner: (.*);/, 'winner: $1;\n  lastMove: any = null;');
  }

  // Update serialize/load
  if (c.includes('serialize(): string {') && !c.includes('lastMove: this.lastMove')) {
    c = c.replace(/turn: this.turn, winner: this.winner/g, 'turn: this.turn, winner: this.winner, lastMove: this.lastMove');
    c = c.replace(/this.winner = data.winner;/g, 'this.winner = data.winner;\n      if(data.lastMove) this.lastMove = data.lastMove;');
  }

  // Record last move in move() function
  if (gameName === 'checkers') {
    if (c.includes('this.board[toR][toC] = piece;')) {
      c = c.replace('this.board[toR][toC] = piece;', 'this.board[toR][toC] = piece;\n    this.lastMove = { from: {r: fromR, c: fromC}, to: {r: toR, c: toC} };');
    }
  } else if (gameName === 'othello') {
    if (c.includes('this.board[r][c] = this.turn;')) {
      c = c.replace('this.board[r][c] = this.turn;', 'this.board[r][c] = this.turn;\n    this.lastMove = { to: {r, c} };');
    }
  } else if (gameName === 'go') {
    if (c.includes('this.board[r][c] = color;')) {
      c = c.replace('this.board[r][c] = color;', 'this.board[r][c] = color;\n    this.lastMove = { to: {r, c} };');
    }
  }

  fs.writeFileSync(file, c, 'utf8');
}

addLastMove('src/app/checkers/engine.ts', 'CheckersEngine', 'checkers');
addLastMove('src/app/othello/engine.ts', 'OthelloEngine', 'othello');
addLastMove('src/app/go/engine.ts', 'GoEngine', 'go');
