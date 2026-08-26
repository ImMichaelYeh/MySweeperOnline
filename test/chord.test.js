const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const context = { globalThis: {} };
vm.runInNewContext(fs.readFileSync('src/Tile.js', 'utf8'), context);
const Tile = context.globalThis.Tile;

test('chording with a wrong flag reveals only the mine', () => {
  const game = {
    isGameOver: false,
    safeCellsRemaining: 1,
    getIsGameStarted: () => true,
    getIsGameOver() { return this.isGameOver; },
    getNumberSafeCellsRemaining() { return this.safeCellsRemaining; },
    subtractSafeCell() { this.safeCellsRemaining--; },
    gameOver(win) { this.isGameOver = true; this.win = win; },
  };
  const program = { markTileForRender() {} };
  const center = new Tile(program, game, 1, 1);
  const safe = new Tile(program, game, 1, 2);
  const mine = new Tile(program, game, 1, 3);
  const wrongFlag = new Tile(program, game, 2, 1);
  center.isRevealed = true;
  center.numberMinesSurrounding = 1;
  safe.numberMinesSurrounding = 1;
  mine.isMine = true;
  wrongFlag.isFlagged = true;
  center.getSurroundingTiles = () => [safe, mine, wrongFlag];

  center.chord();

  assert.equal(safe.isRevealed, false);
  assert.equal(mine.isRevealed, true);
  assert.equal(game.win, false);
});
