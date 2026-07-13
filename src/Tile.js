/**
 * Tile model translated from Tile.java in commit.
 * Stores one board position and performs reveal, flag, and chord actions.
 */
class Tile {
  /**
   * Creates one playable tile.
   * @param {Program} programInstance UI controller.
   * @param {Game} gameInstance Game that owns this tile.
   * @param {number} row Padded-board row, starting at 1.
   * @param {number} column Padded-board column, starting at 1.
   */
  constructor(programInstance, gameInstance, row, column) {
    this.programInstance = programInstance;
    this.gameInstance = gameInstance;
    this.row = row;
    this.column = column;
    this.numberMinesSurrounding = 0;
    this.isFlagged = false;
    this.isMine = false;
    this.isRevealed = false;
    this.isStartingTile = false;
  }

  /** Reveals tile, recursively reveals empty neighbors, and checks game end. */
  click() {
    if (this.gameInstance.getIsGameOver() || this.isRevealed || this.isFlagged) return;

    this.gameInstance.getTilesToReveal().push(this);
    this.isRevealed = true;

    if (this.isMine) {
      this.gameInstance.gameOver(false);
      return;
    }

    this.gameInstance.subtractSafeCell();

    if (this.numberMinesSurrounding === 0) {
      for (const tile of this.getSurroundingTiles()) {
        if (tile && tile !== this && !tile.isFlagged && !tile.isRevealed) {
          tile.click();
        }
      }
    }

    if (this.gameInstance.getNumberSafeCellsRemaining() <= 0) {
      this.gameInstance.gameOver(true);
    }
  }

  /** Starts game on first click, then reveals this unflagged tile. */
  pressPrimary() {
    if (this.gameInstance.getIsGameOver() || this.isFlagged) return;

    this.programInstance.setFace('shocked');
    if (!this.gameInstance.getIsGameStarted()) {
      this.gameInstance.startGame(this);
    }
    this.click();
  }

  /** Adds or removes flag when tile is hidden and game is active. */
  pressSecondary() {
    if (this.gameInstance.getIsGameOver() || this.isRevealed) return;

    if (this.isFlagged) {
      this.isFlagged = false;
      this.gameInstance.addFlag();
    } else if (this.gameInstance.getNumberFlagsRemaining() > 0) {
      this.isFlagged = true;
      this.gameInstance.subtractFlag();
    }
  }

  /**
   * Newer main feature: reveals unflagged neighbors when flags match number.
   */
  chord() {
    if (!this.gameInstance.getIsGameStarted() || this.gameInstance.getIsGameOver() || !this.isRevealed || this.numberMinesSurrounding === 0) return;

    const surroundingTiles = this.getSurroundingTiles();
    const flags = surroundingTiles.filter(tile => tile && tile.isFlagged).length;
    if (flags !== this.numberMinesSurrounding) return;

    for (const tile of surroundingTiles) {
      if (tile && !tile.isFlagged && !tile.isRevealed) tile.click();
    }
  }

  /** Calculates number of mines surrounding this non-mine tile. */
  setMiddle() {
    if (this.isMine) return;

    this.numberMinesSurrounding = this.getSurroundingTiles().filter(tile => tile && tile.isMine).length;
  }

  /**
   * Returns 3-by-3 neighborhood, including this tile and null padding.
   * @returns {Array<Tile|null>} Surrounding tiles in row-major order.
   */
  getSurroundingTiles() {
    const surroundingTiles = [];

    for (let row = this.row - 1; row <= this.row + 1; row++) {
      for (let column = this.column - 1; column <= this.column + 1; column++) {
        surroundingTiles.push(this.gameInstance.getBoard()[row][column]);
      }
    }

    return surroundingTiles;
  }

  /** @param {boolean} value Whether this tile contains a mine. */
  setIsMine(value) { this.isMine = value; }

  /** @param {boolean} value Whether first-click safe area includes this tile. */
  setIsStartingTile(value) { this.isStartingTile = value; }

  /** @returns {boolean} Whether first-click safe area includes this tile. */
  getIsStartingTile() { return this.isStartingTile; }
}

globalThis.Tile = Tile;
