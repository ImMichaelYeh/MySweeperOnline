const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

test('renderer updates only changed tile buttons after the board is built', () => {
  const source = fs.readFileSync('src/Program.js', 'utf8');
  assert.match(source, /updateTileButton\(button, tile\)/);
  assert.match(source, /for \(const tile of this\.tilesToRender\)/);
  assert.match(source, /childElementCount !== tiles\.length/);
  assert.doesNotMatch(source, /replaceChildren\(\.\.\.buttons\)/);
});

test('counter font is self-hosted for consistent GitHub Pages rendering', () => {
  const css = fs.readFileSync('style.css', 'utf8');
  assert.match(css, /url\("src\/res\/press-start-2p\.woff2"\)/);
  assert.ok(fs.existsSync('src/res/press-start-2p.woff2'));
});
