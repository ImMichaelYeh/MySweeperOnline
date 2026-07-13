/**
 * Browser UI controller translated from Program.java.
 * Builds board DOM, connects pointer input to Tiles, and renders game state.
 */
class Program {
  /** Creates page controller, default Expert game, listeners, and timer tick. */
  constructor() {
    this.cellSize = 32;
    this.minefieldHeight = 16;
    this.minefieldWidth = 30;
    this.mines = 99;
    this.face = 'smiley';
    this.timerStartedAt = 0;
    this.game = null;

    this.boardElement = document.querySelector('.board');
    this.faceButton = document.querySelector('.face');
    this.faceImage = this.faceButton.querySelector('img');
    this.flagsCounter = document.querySelector('#flags');
    this.timerCounter = document.querySelector('#timer');
    this.difficultySelect = document.querySelector('#difficulty');

    this.installListeners();
    this.newGame();
    window.setInterval(() => this.updateTimer(), 1000);
  }

  /** Installs face, difficulty, board-action, and drag-prevention listeners. */
  installListeners() {
    this.faceButton.addEventListener('click', () => this.newGame());
    this.difficultySelect.addEventListener('change', () => {
      const level = Program.levels[this.difficultySelect.value];
      this.minefieldWidth = level.width;
      this.minefieldHeight = level.height;
      this.mines = level.mines;
      this.newGame();
    });

    this.boardElement.addEventListener('mousedown', event => {
      const button = event.target.closest('.cell');
      if (!button) return;

      const tile = this.tileFor(button);
      if (event.buttons === 3) {
        event.preventDefault();
        tile.chord();
        this.render();
      } else if (event.button === 0) {
        tile.pressPrimary();
        this.render();
      }
    });

    this.boardElement.addEventListener('mouseup', event => {
      if (event.button === 0 && !this.game.getIsGameOver()) this.setFace('smiley');
      this.render();
    });

    this.boardElement.addEventListener('contextmenu', event => {
      event.preventDefault();
      const button = event.target.closest('.cell');
      if (!button) return;

      this.tileFor(button).pressSecondary();
      this.render();
    });

    this.boardElement.addEventListener('dragstart', event => event.preventDefault());
  }

  /** Resets timer, face, board, and counters using selected difficulty. */
  newGame() {
    this.timerStartedAt = 0;
    this.face = 'smiley';
    this.game = new Game(this, this.minefieldHeight, this.minefieldWidth, this.mines);
    this.render();
  }

  /** Renders counters, face, and all playable tiles from current Game state. */
  render() {
    this.flagsCounter.textContent = this.game.getFlagsRemaining();
    this.timerCounter.textContent = this.timerText();
    this.faceImage.src = `src/res/${this.face}.png`;
    this.boardElement.style.gridTemplateColumns = `repeat(${this.minefieldWidth}, ${this.cellSize}px)`;

    const buttons = [];
    for (let row = 1; row <= this.minefieldHeight; row++) {
      for (let column = 1; column <= this.minefieldWidth; column++) {
        buttons.push(this.createTileButton(this.game.getBoard()[row][column]));
      }
    }
    this.boardElement.replaceChildren(...buttons);
  }

  /**
   * Creates one HTML button from one Tile model.
   * @param {Tile} tile Tile to display.
   * @returns {HTMLButtonElement} Board button for tile.
   */
  createTileButton(tile) {
    const button = document.createElement('button');
    const state = this.stateFor(tile);

    button.className = `cell ${state}`;
    button.dataset.row = tile.row;
    button.dataset.column = tile.column;
    button.setAttribute('aria-label', `Row ${tile.row}, column ${tile.column}`);

    const imageName = this.imageFor(state, tile);
    if (imageName) {
      const image = document.createElement('img');
      image.src = `src/res/${imageName}.png`;
      image.alt = '';
      image.draggable = false;
      button.append(image);
    }
    return button;
  }

  /**
   * Maps Tile and Game state to a render state matching Java Tile imagery.
   * @param {Tile} tile Tile whose display state is needed.
   * @returns {string} CSS and image state name.
   */
  stateFor(tile) {
    if (tile.isRevealed) return tile.isMine ? 'exploded' : 'revealed';
    if (this.game.getIsGameOver() && tile.isFlagged && !tile.isMine) return 'badflag';
    if (tile.isFlagged) return 'flagged';
    return this.game.getIsGameOver() && tile.isMine ? 'mine' : 'hidden';
  }

  /**
   * Selects original JavaFX PNG resource for a rendered tile.
   * @param {string} state Render state from stateFor.
   * @param {Tile} tile Tile supplying adjacent-mine number.
   * @returns {string|null} Resource basename, or null for hidden tile.
   */
  imageFor(state, tile) {
    if (state === 'flagged') return 'flag';
    if (state === 'badflag') return 'badflag';
    if (state === 'mine') return 'mine';
    if (state === 'exploded') return 'mineclicked';
    if (state === 'revealed') return Program.numberImages[tile.numberMinesSurrounding];
    return null;
  }

  /**
   * Finds Tile model represented by a board button.
   * @param {HTMLButtonElement} button Board button with row and column data.
   * @returns {Tile} Matching Tile model.
   */
  tileFor(button) {
    return this.game.getBoard()[Number(button.dataset.row)][Number(button.dataset.column)];
  }

  /** Starts elapsed-time measurement after first reveal. */
  startTimer() { this.timerStartedAt = Date.now(); }

  /** Updates timer display while an active game is running. */
  updateTimer() { if (this.game?.getIsGameStarted() && !this.game.getIsGameOver()) this.timerCounter.textContent = this.timerText(); }

  /** @returns {string} Three-digit elapsed time, capped at 999. */
  timerText() { return String(this.timerStartedAt ? Math.min(999, Math.floor((Date.now() - this.timerStartedAt) / 1000)) : 0).padStart(3, '0'); }

  /** @param {string} face Original face PNG basename to display. */
  setFace(face) { this.face = face; }

  /** @returns {number} Mine count chosen for current difficulty. */
  getNumberMines() { return this.mines; }

  static levels = {
    Beginner: { width: 9, height: 9, mines: 10 },
    Intermediate: { width: 16, height: 16, mines: 40 },
    Expert: { width: 30, height: 16, mines: 99 },
  };

  static numberImages = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
}

window.addEventListener('DOMContentLoaded', () => new Program());
