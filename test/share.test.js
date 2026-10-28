const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

function createProgram(navigator = {}) {
  let now = 100000;
  const context = vm.createContext({
    URL,
    URLSearchParams,
    window: { addEventListener() {} },
    navigator,
    Date: class extends Date { static now() { return now; } },
    localStorage: { setItem() {} },
  });
  for (const file of ['Tile', 'Game', 'Program']) {
    vm.runInContext(fs.readFileSync(`src/${file}.js`, 'utf8'), context);
  }
  const program = vm.runInContext('Object.create(Program.prototype)', context);
  Object.assign(program, {
    currentDifficulty: 'Custom',
    minefieldWidth: 3,
    minefieldHeight: 2,
    mines: 1,
    leaderboard: [],
    shareResult: {},
    copyStatus: {},
    shareText: { focus() { this.focused = true; }, select() { this.selected = true; } },
    render() {},
    renderLeaderboard() {},
  });
  program.newGame();
  program.timerStartedAt = 29000;
  const board = program.game.getBoard();
  board[1][1].isMine = true;
  board[1][2].numberMinesSurrounding = 1;
  board[2][1].numberMinesSurrounding = 2;
  board[2][2].numberMinesSurrounding = 8;
  return { program, context, advanceTime() { now += 60000; } };
}

test('winning shows sharing and copies a frozen emoji board with time and dimensions', async () => {
  let copied;
  const { program, advanceTime } = createProgram({ clipboard: { async writeText(text) { copied = text; } } });
  assert.equal(program.shareResult.hidden, true);
  await program.copyResult();
  assert.equal(copied, undefined);

  program.game.gameOver(true);
  assert.equal(program.shareResult.hidden, false);
  assert.equal(program.resultText, 'MySweeper · Custom\nTry to beat my time of 71 seconds on a custom 2 x 3 board with 1 mine!\n\n🚩1️⃣⬛\n2️⃣8️⃣⬛\n\nhttps://immichaelyeh.github.io/MySweeperOnline/?difficulty=Custom&height=2&width=3&mines=1');
  assert.equal(program.leaderboard[0].time, 71);
  advanceTime();
  await program.copyResult();
  assert.equal(copied, program.resultText);
  assert.match(copied, /71 seconds/);
  assert.match(program.copyStatus.textContent, /Copied!/);

  program.newGame();
  assert.equal(program.resultText, '');
  assert.equal(program.shareResult.hidden, true);
  assert.equal(program.copyStatus.textContent, '');
});

test('shared invitations handle singular seconds and multiple mines', () => {
  const { program } = createProgram();
  program.timerStartedAt = 99000;
  program.mines = 2;
  assert.match(program.createResultText(), /1 second on a custom 2 x 3 board with 2 mines!/);
});

test('losses do not offer sharing', () => {
  const { program } = createProgram();
  program.game.gameOver(false);
  assert.equal(program.shareResult.hidden, true);
  assert.equal(program.resultText, '');
});

test('win and loss timers stay locked across later renders until a restart', () => {
  for (const win of [true, false]) {
    const { program, advanceTime } = createProgram();
    Object.assign(program, {
      bestTimeMode: { checked: false },
      bestTimeBadge: {},
      flagsCounter: {},
      timerCounter: {},
      faceImage: {},
      boardElement: {
        style: {},
        childElementCount: 6,
        children: Array.from({ length: 6 }, () => ({ dataset: {} })),
      },
      render: Object.getPrototypeOf(program).render,
    });
    program.game.gameOver(win);
    program.render();
    assert.equal(program.timerCounter.textContent, '071');

    advanceTime();
    program.render();
    assert.equal(program.timerCounter.textContent, '071');
    program.updateTimer();
    assert.equal(program.timerText(), '071');

    program.newGame();
    assert.equal(program.timerCounter.textContent, '000');
    program.startTimer();
    advanceTime();
    program.render();
    assert.equal(program.timerCounter.textContent, '060');
  }
});

test('unavailable or rejected clipboard access shows selected text for manual copying', async () => {
  for (const navigator of [{}, { clipboard: { async writeText() { throw new Error('Denied'); } } }]) {
    const { program } = createProgram(navigator);
    program.game.gameOver(true);
    await program.copyResult();
    assert.equal(program.shareText.hidden, false);
    assert.equal(program.shareText.value, program.resultText);
    assert.equal(program.shareText.focused, true);
    assert.equal(program.shareText.selected, true);
    assert.match(program.copyStatus.textContent, /copy your result below/);
    program.newGame();
    assert.equal(program.shareText.hidden, true);
  }
});

test('a clipboard response after a restart does not show stale feedback', async () => {
  let finish;
  const { program } = createProgram({ clipboard: { writeText() { return new Promise(resolve => { finish = resolve; }); } } });
  program.game.gameOver(true);
  const copying = program.copyResult();
  program.newGame();
  finish();
  await copying;
  assert.equal(program.copyStatus.textContent, '');
  assert.equal(program.shareResult.hidden, true);
});

function followSharedLink(program, context, link) {
  let selected = 'Expert';
  context.window.location = new URL(link);
  context.document = {
    querySelector(selector) {
      if (selector === '[name="game-mode"]:checked') return { value: selected };
      return { set checked(value) { if (value) selected = selector.match(/value="([^"]+)"/)[1]; } };
    },
  };
  program.customHeight = { value: 20 };
  program.customWidth = { value: 30 };
  program.customMines = { value: 145 };
  program.restoreSharedSettings();
  program.applySelectedSettings();
}

test('shared preset links open the same difficulty over saved settings', () => {
  for (const [difficulty, width, height, mines] of [
    ['Beginner', 9, 9, 10], ['Intermediate', 16, 16, 40], ['Expert', 30, 16, 99],
  ]) {
    const { program, context } = createProgram();
    Object.assign(program, { currentDifficulty: difficulty, minefieldWidth: width, minefieldHeight: height, mines });
    program.newGame();
    program.timerStartedAt = 29000;
    const result = program.createResultText();
    assert.equal(result.split('\n')[1], `Try to beat my time of 71 seconds on ${difficulty.toLowerCase()} mode!`);
    const link = result.split('\n').at(-1);
    assert.equal(link, `https://immichaelyeh.github.io/MySweeperOnline/?difficulty=${difficulty}`);
    followSharedLink(program, context, link);
    assert.equal(program.currentDifficulty, difficulty);
    assert.deepEqual([program.minefieldWidth, program.minefieldHeight, program.mines], [width, height, mines]);
  }
});

test('shared custom links preserve dimensions and mine count', () => {
  const { program, context } = createProgram();
  Object.assign(program, { minefieldHeight: 12, minefieldWidth: 24, mines: 50 });
  program.newGame();
  const link = program.createResultText().split('\n').at(-1);
  followSharedLink(program, context, link);
  assert.equal(program.currentDifficulty, 'Custom');
  assert.deepEqual([program.minefieldHeight, program.minefieldWidth, program.mines], [12, 24, 50]);
});

test('malformed shared settings leave the selected board alone', () => {
  for (const query of [
    '', '?difficulty=Unknown', '?difficulty=__proto__', '?difficulty=Custom',
    '?difficulty=Custom&height=12&width=no&mines=10',
    '?difficulty=Custom&height=12&width=24&mines=',
    '?difficulty=Custom&height=12&width=24&mines=1.5',
    '?difficulty=Custom&height=Infinity&width=24&mines=10',
  ]) {
    const { program, context } = createProgram();
    followSharedLink(program, context, `https://immichaelyeh.github.io/MySweeperOnline/${query}`);
    assert.equal(program.currentDifficulty, 'Expert');
    assert.deepEqual([program.minefieldHeight, program.minefieldWidth, program.mines], [16, 30, 99]);
  }
});

test('shared custom values use existing board size and mine safety limits', () => {
  const { program, context } = createProgram();
  followSharedLink(program, context, 'https://immichaelyeh.github.io/MySweeperOnline/?difficulty=Custom&height=-1&width=1000&mines=99999');
  assert.deepEqual([program.minefieldHeight, program.minefieldWidth, program.mines], [4, 99, 387]);
});
