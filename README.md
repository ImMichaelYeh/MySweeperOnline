# MySweeper Online

Static browser version of MySweeper. Open `index.html` locally or publish this repository with GitHub Pages.

## Structure

```text
index.html       Page shell and script load order
style.css        Portfolio theme and Minesweeper board styling
src/Game.js      Board state, mine placement, counters, win/loss state
src/Tile.js      Individual tile state and reveal, flag, chord actions
src/Program.js   DOM events, timer, and rendering
src/res/         Original MySweeper PNG resources
```

## Logic and render flow

```text
Browser input
  → Program event listener
  → Tile action: pressPrimary / pressSecondary / chord
  → Game state: startGame / flags / safe cells / gameOver
  → Program.render()
  → Rebuild counters, face, and every board button from Game + Tile state
```

`Program` owns the HTML. `Game` owns the padded board and game-wide state. Each `Tile` owns its mine, flag, reveal, and adjacent-mine state.

On the first left-click, `Tile.pressPrimary()` calls `Game.startGame(tile)`. Mines are placed only after that click, and the clicked tile plus its eight neighbors are marked safe. `Tile.click()` reveals tiles, flood-reveals empty areas, and ends the game when a mine is clicked or all safe tiles are revealed.

`Tile.chord()` is the newer feature: on a revealed numbered tile, it reveals unflagged neighbors only when the number of neighboring flags matches that tile's adjacent-mine count.

The browser does not need JavaFX's old `tilesToReveal` list. Every action updates the model first, then `Program.render()` redraws the complete board from final tile state.

## GitHub Pages

In GitHub: **Settings → Pages → Deploy from a branch → `main` / `/ (root)`**.
