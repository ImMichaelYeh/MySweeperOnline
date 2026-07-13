const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const context = { globalThis: {} };
vm.runInNewContext(fs.readFileSync('src/Tile.js', 'utf8'), context);
const Tile = context.globalThis.Tile;

test('chording with a wrong flag loses even when a safe neighbor would complete the board first', () => {
  const game = {
    isGameOver: false,
    safeCellsRemaining: 1,
    getIsGameStarted: () => true,
    getIsGameOver() { return this.isGameOver; },
    getNumberSafeCellsRemaining() { return this.safeCellsRemaining; },
    subtractSafeCell() { this.safeCellsRemaining--; },
    gameOver(win) { this.isGameOver = true; this.win = win; },
  };
  const center = new Tile({}, game, 1, 1);
  const safe = new Tile({}, game, 1, 2);
  const mine = new Tile({}, game, 1, 3);
  const wrongFlag = new Tile({}, game, 2, 1);
  center.isRevealed = true;
  center.numberMinesSurrounding = 1;
  safe.numberMinesSurrounding = 1;
  mine.isMine = true;
  wrongFlag.isFlagged = true;
  center.getSurroundingTiles = () => [safe, mine, wrongFlag];

  center.chord();

  assert.equal(safe.isRevealed, true);
  assert.equal(game.win, false);
});
