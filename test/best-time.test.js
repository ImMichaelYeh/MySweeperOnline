const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

function createProgram({ enabled = true, entries = [{ difficulty: 'Expert', time: 71 }] } = {}) {
  let now = 1000;
  let savedSettings;
  const context = vm.createContext({
    window: { addEventListener() {} },
    Date: class extends Date { static now() { return now; } },
    localStorage: {
      setItem(key, value) { savedSettings = value; },
      getItem() { return savedSettings; },
    },
    document: {
      querySelector(selector) { return { value: selector.includes('position') ? 'center' : 'Expert' }; },
    },
  });
  vm.runInContext(fs.readFileSync('src/Game.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('src/Program.js', 'utf8'), context);
  const program = vm.runInContext('Object.create(Program.prototype)', context);
  const game = vm.runInContext('Object.create(Game.prototype)', context);
  Object.assign(program, {
    bestTimeMode: { checked: enabled },
    bestTimeBadge: {},
    leaderboard: entries,
    currentDifficulty: 'Expert',
    timerStartedAt: 1000,
    timerCounter: {},
    customHeight: { value: 20 },
    customWidth: { value: 30 },
    customMines: { value: 145 },
    zoom: { value: 100 },
    game,
    renders: 0,
    wins: 0,
    render() { this.renders++; },
    recordWin() { this.wins++; },
  });
  Object.assign(game, { programInstance: program, isGameStarted: true, isGameOver: false });
  return { program, at(seconds) { now = 1000 + seconds * 1000; } };
}

test('Best Time Mode loses at the best time, reveals the board, and saves no win', () => {
  const { program, at } = createProgram();
  at(70.999);
  program.updateTimer();
  assert.equal(program.game.getIsGameOver(), false);
  assert.equal(program.timerCounter.textContent, '070');

  at(71);
  program.updateTimer();
  assert.equal(program.game.getIsGameOver(), true);
  assert.equal(program.timerCounter.textContent, '071');
  assert.equal(program.face, 'dead');
  assert.equal(program.tilesToRender, null);
  assert.equal(program.renders, 1);
  assert.equal(program.wins, 0);

  at(72);
  program.updateTimer();
  assert.equal(program.timerCounter.textContent, '071');
  assert.equal(program.timerText(), '071');
});

test('disabled mode, no matching best, unstarted games, and finished games have no cutoff', () => {
  for (const options of [
    { enabled: false },
    { entries: [] },
    { entries: [{ difficulty: 'Beginner', time: 10 }] },
  ]) {
    const { program, at } = createProgram(options);
    at(100);
    program.updateTimer();
    assert.equal(program.game.getIsGameOver(), false);
  }
  for (const state of [{ isGameStarted: false }, { isGameOver: true }]) {
    const { program, at } = createProgram();
    Object.assign(program.game, state);
    at(100);
    program.updateTimer();
    assert.equal(program.renders, 0);
  }
});

test('uses the fastest matching time and catches delayed ticks or mid-run enabling', () => {
  const { program, at } = createProgram({ enabled: false, entries: [
    { difficulty: 'Expert', time: 90 },
    { difficulty: 'Beginner', time: 10 },
    { difficulty: 'Expert', time: 71 },
  ] });
  at(75);
  program.updateTimer();
  assert.equal(program.game.getIsGameOver(), false);
  program.bestTimeMode.checked = true;
  program.updateTimer();
  assert.equal(program.game.getIsGameOver(), true);
});

test('a faster win is allowed, and a zero-second best ends at zero', () => {
  const { program, at } = createProgram();
  at(70);
  program.updateTimer();
  program.game.gameOver(true);
  assert.equal(program.wins, 1);
  assert.equal(program.face, 'sunglasses');

  const zero = createProgram({ entries: [{ difficulty: 'Expert', time: 0 }] }).program;
  zero.startTimer();
  assert.equal(zero.game.getIsGameOver(), true);
});

test('a winning click at the cutoff is blocked before the next interval tick', () => {
  const { program, at } = createProgram();
  let clicks = 0;
  program.pressedCell = {};
  program.tileFor = () => ({ pressPrimary() { clicks++; program.game.gameOver(true); } });
  at(71);
  program.releasePrimary({ button: 0, target: { closest: () => ({}) } });
  assert.equal(clicks, 0);
  assert.equal(program.wins, 0);
  assert.equal(program.game.getIsGameOver(), true);
});

test('Best Time Mode persists and old settings default to disabled', () => {
  const { program } = createProgram();
  program.saveSettings();
  program.bestTimeMode.checked = false;
  program.restoreSettings();
  assert.equal(program.bestTimeMode.checked, true);

  delete program.bestTimeMode.checked;
  program.saveSettings();
  program.bestTimeMode.checked = true;
  program.restoreSettings();
  assert.equal(program.bestTimeMode.checked, false);
});

test('badge follows the toggle, active difficulty, and updated best times', () => {
  const { program } = createProgram();
  program.updateBestTimeBadge();
  assert.equal(program.bestTimeBadge.hidden, false);
  assert.equal(program.bestTimeBadge.textContent, 'Best Time Mode · Beat 71s');

  program.leaderboard.push({ difficulty: 'Expert', time: 65 });
  program.updateBestTimeBadge();
  assert.equal(program.bestTimeBadge.textContent, 'Best Time Mode · Beat 65s');

  program.currentDifficulty = 'Beginner';
  program.updateBestTimeBadge();
  assert.equal(program.bestTimeBadge.textContent, 'Best Time Mode · No best yet');

  program.bestTimeMode.checked = false;
  program.updateBestTimeBadge();
  assert.equal(program.bestTimeBadge.hidden, true);
});
