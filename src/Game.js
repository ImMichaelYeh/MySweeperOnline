/**
 * Game model translated from Game.java.
 * Owns board state, mine placement, counters, and win/loss state.
 */
class Game {
  /**
   * Creates padded minefield and every playable Tile.
   * @param {Program} programInstance UI controller that owns this game.
   * @param {number} minefieldHeight Playable row count.
   * @param {number} minefieldWidth Playable column count.
   * @param {number} mines Number of mines to place after first click.
   */
  constructor(programInstance, minefieldHeight, minefieldWidth, mines) {
    this.programInstance = programInstance;
    this.flagsRemaining = mines;
    this.isGameStarted = false;
    this.isGameOver = false;
    this.safeCellsRemaining = minefieldHeight * minefieldWidth - mines;
    this.minefieldHeight = minefieldHeight;
    this.minefieldWidth = minefieldWidth;

    // One-tile padding matches Game.java. Playable rows/columns start at 1.
    this.board = Array.from({ length: minefieldHeight + 2 }, () => Array(minefieldWidth + 2).fill(null));

    for (let row = 1; row <= minefieldHeight; row++) {
      for (let column = 1; column <= minefieldWidth; column++) {
        this.board[row][column] = new Tile(programInstance, this, row, column);
      }
    }
  }

  /**
   * Places mines after first click, leaving clicked tile and neighbors safe.
   * @param {Tile} startTile First tile revealed by player.
   */
  startGame(startTile) {
    for (const tile of startTile.getSurroundingTiles()) {
      if (tile) tile.setIsStartingTile(true);
    }

    const positions = [];
    for (let row = 1; row <= this.minefieldHeight; row++) {
      for (let column = 1; column <= this.minefieldWidth; column++) {
        positions.push([row, column]);
      }
    }

    // Java Collections.shuffle equivalent.
    for (let index = positions.length - 1; index > 0; index--) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [positions[index], positions[randomIndex]] = [positions[randomIndex], positions[index]];
    }

    let minesPlaced = 0;
    for (const [row, column] of positions) {
      const tile = this.board[row][column];
      if (!tile.getIsStartingTile()) {
        tile.setIsMine(true);
        minesPlaced++;
        if (minesPlaced === this.programInstance.getNumberMines()) break;
      }
    }

    for (let row = 1; row <= this.minefieldHeight; row++) {
      for (let column = 1; column <= this.minefieldWidth; column++) {
        this.board[row][column].setMiddle();
      }
    }

    this.isGameStarted = true;
    this.programInstance.startTimer();
  }

  /**
   * Ends game and asks Program to show win or loss face.
   * @param {boolean} win True when all safe tiles were revealed.
   */
  gameOver(win) {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.programInstance.setFace(win ? 'sunglasses' : 'dead');
    if (win) this.programInstance.recordWin();
  }

  /** Increments remaining flag counter after a flag is removed. */
  addFlag() { this.flagsRemaining++; }

  /** Decrements remaining flag counter after a flag is added. */
  subtractFlag() { this.flagsRemaining--; }

  /** Records one more revealed safe tile. */
  subtractSafeCell() { this.safeCellsRemaining--; }

  /** @returns {Array<Array<Tile|null>>} Board including one-tile null padding. */
  getBoard() { return this.board; }

  /** @returns {boolean} Whether game has been won or lost. */
  getIsGameOver() { return this.isGameOver; }

  /** @returns {boolean} Whether mines have been placed. */
  getIsGameStarted() { return this.isGameStarted; }

  /** @returns {number} Number of flags player may still place. */
  getNumberFlagsRemaining() { return this.flagsRemaining; }

  /** @returns {number} Number of safe tiles still hidden. */
  getNumberSafeCellsRemaining() { return this.safeCellsRemaining; }

  /** @returns {string} Three-digit Minesweeper-style flag counter. */
  getFlagsRemaining() {
    return String(this.flagsRemaining).padStart(3, '0');
  }
}

globalThis.Game = Game;
