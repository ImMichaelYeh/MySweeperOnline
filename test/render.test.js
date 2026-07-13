const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

test('renderer updates existing tile buttons instead of rebuilding the board every move', () => {
  const source = fs.readFileSync('src/Program.js', 'utf8');
  assert.match(source, /updateTileButton\(button, tile\)/);
  assert.match(source, /childElementCount !== tiles\.length/);
  assert.doesNotMatch(source, /replaceChildren\(\.\.\.buttons\)/);
});
