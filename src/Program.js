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
    this.tilesToRender = null;
    this.game = null;

    this.boardElement = document.querySelector('.board');
    this.faceButton = document.querySelector('.face');
    this.faceImage = this.faceButton.querySelector('img');
    this.flagsCounter = document.querySelector('#flags');
    this.timerCounter = document.querySelector('#timer');
    this.gameFrame = document.querySelector('.game-frame');
    this.gameHero = document.querySelector('.game-hero');
    this.newGameButton = document.querySelector('#new-game');
    this.customHeight = document.querySelector('#custom-height');
    this.customWidth = document.querySelector('#custom-width');
    this.customMines = document.querySelector('#custom-mines');
    this.zoom = document.querySelector('#zoom');
    this.nightMode = document.querySelector('#night-mode');
    this.bestTimeMode = document.querySelector('#best-time-mode');
    this.bestTimeBadge = document.querySelector('#best-time-badge');
    this.shareResult = document.querySelector('#share-result');
    this.copyResultButton = document.querySelector('#copy-result');
    this.copyStatus = document.querySelector('#copy-status');
    this.shareText = document.querySelector('#share-text');
    this.leaderboardElements = Object.fromEntries(Program.leaderboardDifficulties.map(difficulty => [difficulty, document.querySelector(`#leaderboard-${difficulty.toLowerCase()}`)]));
    this.leaderboard = this.loadLeaderboard();
    this.currentDifficulty = 'Expert';

    this.preloadImages();
    this.setMobileDefaults();
    this.restoreSettings();
    this.restoreSharedSettings();
    this.applySelectedSettings();
    this.updateZoom();
    this.updatePosition();
    this.installListeners();
    this.newGame();
    this.renderLeaderboard();
    window.setInterval(() => this.updateTimer(), 1000);
  }

  /** Installs game, display, board-action, and drag-prevention listeners. */
  installListeners() {
    this.faceButton.addEventListener('click', () => this.newGame());
    this.newGameButton.addEventListener('click', () => this.startSelectedGame());
    this.copyResultButton.addEventListener('click', () => this.copyResult());
    document.querySelectorAll('[name="game-mode"]').forEach(input => input.addEventListener('change', () => this.saveSettings()));
    [this.customHeight, this.customWidth, this.customMines].forEach(input => input.addEventListener('input', () => {
      document.querySelector('[value="Custom"]').checked = true;
      this.saveSettings();
    }));
    this.zoom.addEventListener('input', () => {
      this.updateZoom();
      this.saveSettings();
    });
    document.querySelectorAll('[name="position"]').forEach(input => input.addEventListener('change', () => {
      this.updatePosition();
      this.saveSettings();
    }));
    document.addEventListener('click', event => {
      if (!event.target.closest('.control-panel')) document.querySelectorAll('.control-panel[open]').forEach(panel => panel.removeAttribute('open'));
    });
    this.nightMode.addEventListener('change', () => document.body.classList.toggle('night-mode-active', this.nightMode.checked));
    this.bestTimeMode.addEventListener('change', () => {
      this.saveSettings();
      this.updateBestTimeBadge();
      this.updateTimer();
    });
    this.gameFrame.addEventListener('mousedown', event => {
      if (!event.target.closest('.cell, .face')) event.preventDefault();
    });
    this.gameFrame.addEventListener('contextmenu', event => event.preventDefault());

    this.boardElement.addEventListener('mousedown', event => {
      const button = event.target.closest('.cell');
      if (!button) return;

      this.updateTimer();
      const tile = this.tileFor(button);
      if (event.buttons === 3 || event.button === 1) {
        this.pressedCell = null;
        event.preventDefault();
        tile.chord();
        if (!this.game.getIsGameOver()) this.setFace('smiley');
        this.render();
      } else if (event.button === 2 || event.ctrlKey && event.button === 0) {
        event.preventDefault();
        tile.pressSecondary();
        this.render();
      } else if (event.button === 0) {
        this.pressedCell = button;
        if (!this.game.getIsGameOver()) this.setFace('shocked');
        this.faceImage.src = `src/res/${this.face}.png`;
      }
    });

    document.addEventListener('mouseup', event => this.releasePrimary(event));

    this.boardElement.addEventListener('contextmenu', event => event.preventDefault());

    this.boardElement.addEventListener('dragstart', event => event.preventDefault());
    this.boardElement.addEventListener('mouseover', event => this.hoveredCell = event.target.closest('.cell'));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.newGame();
      } else if (event.code === 'Space' && this.hoveredCell && !event.target.closest('.control-panel, .share-result')) {
        event.preventDefault();
        this.updateTimer();
        const tile = this.tileFor(this.hoveredCell);
        tile.isRevealed ? tile.chord() : tile.pressSecondary();
        this.render();
      }
    });
  }

  /** Reveals tile under pointer when primary button is released over board. */
  releasePrimary(event) {
    if (event.button !== 0 || !this.pressedCell) return;

    this.pressedCell = null;
    this.updateTimer();
    const button = event.target.closest('.cell');
    if (button && !this.game.getIsGameOver()) this.tileFor(button).pressPrimary();
    if (!this.game.getIsGameOver()) this.setFace('smiley');
    this.render();
  }

  /** Applies selected preset or validated custom dimensions, then starts a game. */
  startSelectedGame() {
    this.applySelectedSettings();
    this.saveSettings();
    this.newGame();
  }

  /** Applies selected preset or validated custom dimensions. */
  applySelectedSettings() {
    const selected = document.querySelector('[name="game-mode"]:checked').value;
    const level = Program.levels[selected];

    if (level) {
      this.minefieldWidth = level.width;
      this.minefieldHeight = level.height;
      this.mines = level.mines;
      this.currentDifficulty = selected;
    } else {
      this.minefieldHeight = Math.min(99, Math.max(4, Math.floor(Number(this.customHeight.value)) || 4));
      this.minefieldWidth = Math.min(99, Math.max(4, Math.floor(Number(this.customWidth.value)) || 4));
      const maxMines = this.minefieldHeight * this.minefieldWidth - 9;
      this.mines = Math.min(maxMines, Math.max(1, Math.floor(Number(this.customMines.value)) || 1));
      this.customHeight.value = this.minefieldHeight;
      this.customWidth.value = this.minefieldWidth;
      this.customMines.value = this.mines;
      this.customMines.max = maxMines;
      this.currentDifficulty = 'Custom';
    }
  }

  /** Lets a shared link override saved board settings using the usual validation. */
  restoreSharedSettings() {
    const params = new URLSearchParams(window.location.search);
    const difficulty = params.get('difficulty');
    if (!Program.difficulties.includes(difficulty)) return;
    if (difficulty === 'Custom') {
      const values = ['height', 'width', 'mines'].map(key => params.get(key));
      if (!values.every(value => value !== null && value.trim() !== '' && Number.isSafeInteger(Number(value)))) return;
      [this.customHeight, this.customWidth, this.customMines].forEach((input, index) => input.value = values[index]);
    }
    document.querySelector(`[name="game-mode"][value="${difficulty}"]`).checked = true;
  }

  /** Applies zoom control and its displayed value. */
  updateZoom() {
    this.gameFrame.style.zoom = this.zoom.value / 100 * .9;
    document.querySelector('#zoom-value').textContent = `${this.zoom.value}%`;
  }

  /** Applies selected horizontal position. */
  updatePosition() {
    this.gameHero.dataset.position = document.querySelector('[name="position"]:checked').value;
  }

  /** Saves current game and display settings in this browser. */
  saveSettings() {
    const gameMode = document.querySelector('[name="game-mode"]:checked').value;
    const settings = {
      gameMode,
      bestTimeMode: this.bestTimeMode.checked,
      customHeight: this.customHeight.value,
      customWidth: this.customWidth.value,
      customMines: this.customMines.value,
      zoom: this.zoom.value,
      position: document.querySelector('[name="position"]:checked').value,
    };
    try { localStorage.setItem(Program.settingsKey, JSON.stringify(settings)); } catch { /* Storage unavailable. */ }
  }

  /** Restores valid saved game and display settings. */
  restoreSettings() {
    try {
      const settings = JSON.parse(localStorage.getItem(Program.settingsKey));
      if (!settings || typeof settings !== 'object') return;
      this.bestTimeMode.checked = settings.bestTimeMode === true;
      if (Program.levels[settings.gameMode] || settings.gameMode === 'Custom') document.querySelector(`[value="${settings.gameMode}"]`).checked = true;
      [this.customHeight, this.customWidth, this.customMines].forEach((input, index) => {
        const value = [settings.customHeight, settings.customWidth, settings.customMines][index];
        if (Number.isFinite(Number(value))) input.value = value;
      });
      const zoom = Number(settings.zoom);
      if (Number.isInteger(zoom) && zoom >= 50 && zoom <= 150 && zoom % 10 === 0) this.zoom.value = zoom;
      if (['left', 'center', 'right'].includes(settings.position)) document.querySelector(`[name="position"][value="${settings.position}"]`).checked = true;
    } catch { /* No valid saved settings. */ }
  }

  /** Uses a smaller, left-aligned board as the default on mobile screens. */
  setMobileDefaults() {
    if (!window.matchMedia('(max-width: 575.98px)').matches) return;
    this.zoom.value = 70;
    document.querySelector('[name="position"][value="left"]').checked = true;
  }

  /** Resets timer, face, board, and counters using selected difficulty. */
  newGame() {
    this.resultText = '';
    this.shareResult.hidden = true;
    this.shareText.hidden = true;
    this.copyStatus.textContent = '';
    this.timerStartedAt = 0;
    this.timerStoppedAt = null;
    this.face = 'smiley';
    this.game = new Game(this, this.minefieldHeight, this.minefieldWidth, this.mines);
    this.tilesToRender = null;
    this.render();
  }

  /** Renders counters, face, and only tiles whose visual state changed. */
  render() {
    this.updateBestTimeBadge();
    this.flagsCounter.textContent = this.game.getFlagsRemaining();
    this.timerCounter.textContent = this.timerText();
    this.faceImage.src = `src/res/${this.face}.png`;
    this.boardElement.style.gridTemplateColumns = `repeat(${this.minefieldWidth}, ${this.cellSize}px)`;

    const tiles = [];
    for (let row = 1; row <= this.minefieldHeight; row++) {
      for (let column = 1; column <= this.minefieldWidth; column++) {
        tiles.push(this.game.getBoard()[row][column]);
      }
    }

    if (this.boardElement.childElementCount !== tiles.length) {
      this.boardElement.replaceChildren(...tiles.map(tile => this.createTileButton(tile)));
      this.tilesToRender = new Set();
      return;
    }

    if (this.tilesToRender === null) {
      tiles.forEach((tile, index) => this.updateTileButton(this.boardElement.children[index], tile));
    } else {
      for (const tile of this.tilesToRender) {
        const index = (tile.row - 1) * this.minefieldWidth + tile.column - 1;
        this.updateTileButton(this.boardElement.children[index], tile);
      }
    }
    this.tilesToRender = new Set();
  }

  /** Queues a changed tile for the next incremental render. */
  markTileForRender(tile) { this.tilesToRender?.add(tile); }

  /** Queues every tile when a game-ending state changes their appearance. */
  markAllTilesForRender() { this.tilesToRender = null; }

  /**
   * Creates one HTML button from one Tile model.
   * @param {Tile} tile Tile to display.
   * @returns {HTMLButtonElement} Board button for tile.
   */
  createTileButton(tile) {
    const button = document.createElement('button');
    button.dataset.row = tile.row;
    button.dataset.column = tile.column;
    button.setAttribute('aria-label', `Row ${tile.row}, column ${tile.column}`);
    this.updateTileButton(button, tile);
    return button;
  }

  /** Updates one existing tile button when its rendered state changes. */
  updateTileButton(button, tile) {
    const state = this.stateFor(tile);
    const imageName = this.imageFor(state, tile);
    const renderKey = `${state}:${imageName || ''}`;
    if (button.dataset.renderKey === renderKey) return;

    button.className = `cell ${state}${imageName ? ` ${imageName}` : ''}`;
    button.dataset.renderKey = renderKey;
  }

  /** Decodes tile artwork before a reveal needs to paint it. */
  preloadImages() {
    this.preloadedImages = Program.imageNames.map(imageName => {
      const image = new Image();
      image.src = `src/res/${imageName}.png`;
      return image;
    });
    this.preloadedImages.forEach(image => image.decode?.().catch(() => undefined));
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
  startTimer() {
    this.timerStartedAt = Date.now();
    this.updateTimer();
  }

  /** Freezes elapsed time for every render after a win or loss. */
  stopTimer() { this.timerStoppedAt = Date.now(); }

  /** Saves a winning result and retains only ten fastest local times. */
  recordWin() {
    this.resultText = this.createResultText();
    this.shareResult.hidden = false;
    this.leaderboard.push({
      time: Number(this.timerText()),
      difficulty: this.currentDifficulty,
      timestamp: new Date().toISOString(),
    });
    this.leaderboard = Program.difficulties.flatMap(difficulty => this.leaderboard
      .filter(entry => entry.difficulty === difficulty)
      .sort((first, second) => first.time - second.time || first.timestamp.localeCompare(second.timestamp))
      .slice(0, 10));
    try { localStorage.setItem(Program.leaderboardKey, JSON.stringify(this.leaderboard)); } catch { /* Storage unavailable. */ }
    this.renderLeaderboard();
  }

  /** Builds a pasteable snapshot of the winning board, excluding its padding. */
  createResultText() {
    const symbols = ['⬛', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];
    const rows = this.game.getBoard().slice(1, -1).map(row => row.slice(1, -1)
      .map(tile => tile.isMine ? '🚩' : symbols[tile.numberMinesSurrounding]).join(''));
    const link = new URL('https://immichaelyeh.github.io/MySweeperOnline/');
    link.searchParams.set('difficulty', this.currentDifficulty);
    if (this.currentDifficulty === 'Custom') {
      link.searchParams.set('height', this.minefieldHeight);
      link.searchParams.set('width', this.minefieldWidth);
      link.searchParams.set('mines', this.mines);
    }
    const time = Number(this.timerText());
    return `MySweeper · ${this.currentDifficulty}\nTry to beat my time of ${time} ${time === 1 ? 'second' : 'seconds'} on a board with ${this.minefieldHeight} rows, ${this.minefieldWidth} columns, and ${this.mines} ${this.mines === 1 ? 'mine' : 'mines'}!\n\n${rows.join('\n')}\n\n${link.href}`;
  }

  /** Copies the saved win, with selectable text when clipboard access is unavailable. */
  async copyResult() {
    const text = this.resultText;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (this.resultText === text) this.copyStatus.textContent = 'Copied! Paste your result anywhere.';
    } catch {
      if (this.resultText !== text) return;
      this.copyStatus.textContent = 'Select and copy your result below.';
      this.shareText.value = text;
      this.shareText.hidden = false;
      this.shareText.focus();
      this.shareText.select();
    }
  }

  /** Loads valid leaderboard entries saved in this browser. */
  loadLeaderboard() {
    try {
      const entries = JSON.parse(localStorage.getItem(Program.leaderboardKey));
      if (!Array.isArray(entries)) return [];
      return Program.difficulties.flatMap(difficulty => entries
        .filter(entry => Number.isInteger(entry.time) && entry.time >= 0 && entry.difficulty === difficulty && typeof entry.timestamp === 'string')
        .sort((first, second) => first.time - second.time || first.timestamp.localeCompare(second.timestamp))
        .slice(0, 10));
    } catch { return []; }
  }

  /** Renders saved local results with their board details and timestamp. */
  renderLeaderboard() {
    this.updateBestTimeBadge();
    Program.leaderboardDifficulties.forEach(difficulty => {
      const entries = this.leaderboard.filter(entry => entry.difficulty === difficulty);
      this.leaderboardElements[difficulty].replaceChildren(...(entries.length ? entries : [{ time: null }]).map(entry => {
        const item = document.createElement('li');
        item.textContent = entry.time === null ? 'No wins yet.' : `${entry.time}s`;
        if (entry.timestamp) {
          const timestamp = document.createElement('time');
          timestamp.dateTime = entry.timestamp;
          timestamp.textContent = new Date(entry.timestamp).toLocaleString();
          item.append(timestamp);
        }
        return item;
      }));
    });
  }

  /** @returns {number} Fastest saved time for the active difficulty, or Infinity. */
  getBestTime() {
    return Math.min(...this.leaderboard
      .filter(entry => entry.difficulty === this.currentDifficulty)
      .map(entry => entry.time));
  }

  /** Shows the active mode and the time to beat above the board. */
  updateBestTimeBadge() {
    this.bestTimeBadge.hidden = !this.bestTimeMode.checked;
    const bestTime = this.getBestTime();
    this.bestTimeBadge.textContent = `Best Time Mode · ${Number.isFinite(bestTime) ? `Beat ${bestTime}s` : 'No best yet'}`;
  }

  /** Updates the active timer and ends runs that can no longer beat the best time. */
  updateTimer() {
    if (!this.game?.getIsGameStarted() || this.game.getIsGameOver()) return;
    this.timerCounter.textContent = this.timerText();
    if (!this.bestTimeMode.checked) return;
    if (Number(this.timerText()) >= this.getBestTime()) {
      this.game.gameOver(false);
      this.render();
    }
  }

  /** @returns {string} Three-digit elapsed time, capped at 999. */
  timerText() { return String(this.timerStartedAt ? Math.min(999, Math.floor(((this.timerStoppedAt ?? Date.now()) - this.timerStartedAt) / 1000)) : 0).padStart(3, '0'); }

  /** @param {string} face Original face PNG basename to display. */
  setFace(face) { this.face = face; }

  /** @returns {number} Mine count chosen for current difficulty. */
  getNumberMines() { return this.mines; }

  static levels = {
    Beginner: { width: 9, height: 9, mines: 10 },
    Intermediate: { width: 16, height: 16, mines: 40 },
    Expert: { width: 30, height: 16, mines: 99 },
  };

  static difficulties = ['Beginner', 'Intermediate', 'Expert', 'Custom'];
  static leaderboardDifficulties = ['Expert', 'Intermediate', 'Beginner'];
  static leaderboardKey = 'mysweeper-leaderboard';
  static settingsKey = 'mysweeper-settings';
  static numberImages = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
  static imageNames = [...Program.numberImages, 'tile', 'borderedbackground', 'flag', 'badflag', 'mine', 'mineclicked', 'smiley', 'shocked', 'dead', 'sunglasses'];
}

window.addEventListener('DOMContentLoaded', () => new Program());
