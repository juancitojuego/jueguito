// src/blessed/ui/startMenu.ts
import blessed from 'blessed';
import { screen } from '../index'; // Assuming screen is exported from index.ts
import { loadGame, resetGameDefaults, gameState } from '../../store';
import { gameStateManagerInstance, randomServiceInstance } from '../../services/serviceInstances'; // For new game seed

export function showStartMenu(onGameStart: () => void) {
  const menuBox = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: '50%',
    height: '50%',
    label: 'Start Menu',
    border: 'line',
    style: {
      border: { fg: 'cyan' },
    },
    keys: true,
    mouse: true,
    tags: true,
  });

  const newGameButton = blessed.button({
    parent: menuBox,
    content: 'New Game',
    top: 3,
    left: 'center',
    width: '50%',
    height: 3,
    shrink: true,
    mouse: true,
    keys: true,
    style: {
      focus: { bg: 'blue' },
      hover: { bg: 'blue' },
    },
    border: 'line',
    align: 'center',
    valign: 'middle',
  });

  const loadGameButton = blessed.button({
    parent: menuBox,
    content: 'Load Game',
    top: 7,
    left: 'center',
    width: '50%',
    height: 3,
    shrink: true,
    mouse: true,
    keys: true,
    style: {
      focus: { bg: 'blue' },
      hover: { bg: 'blue' },
    },
    border: 'line',
    align: 'center',
    valign: 'middle',
  });

  const quitButton = blessed.button({
    parent: menuBox,
    content: 'Quit',
    top: 11,
    left: 'center',
    width: '50%',
    height: 3,
    shrink: true,
    mouse: true,
    keys: true,
    style: {
      focus: { bg: 'blue' },
      hover: { bg: 'blue' },
    },
    border: 'line',
    align: 'center',
    valign: 'middle',
  });

  newGameButton.on('press', () => {
    const form = blessed.form<{ name: string; seed?: string }>({
      parent: screen,
      top: 'center',
      left: 'center',
      width: '60%',
      height: 10,
      border: 'line',
      label: 'New Game Setup',
      keys: true,
      mouse: true,
      tags: true,
    });

    blessed.text({ parent: form, content: 'Player Name:', top: 1, left: 2 });
    const nameInput = blessed.textbox({
      parent: form,
      name: 'name',
      top: 1,
      left: 15,
      height: 1,
      inputOnFocus: true,
      value: 'Player',
      border: { type: 'line' },
      style: { focus: { border: { fg: 'blue' }}}
    });

    blessed.text({ parent: form, content: 'Seed (optional):', top: 3, left: 2 });
    const seedInput = blessed.textbox({
      parent: form,
      name: 'seed',
      top: 3,
      left: 15,
      height: 1,
      inputOnFocus: true,
      border: { type: 'line' },
      style: { focus: { border: { fg: 'blue' }}}
    });

    const submitButton = blessed.button({
      parent: form,
      name: 'submit',
      content: 'Start',
      top: 5,
      left: 'center',
      width: 10,
      height: 1,
      shrink: true,
      mouse: true,
      keys: true,
      style: { focus: { bg: 'blue' }, hover: { bg: 'blue' } },
    });

    submitButton.on('press', () => {
      form.submit();
    });

    form.on('submit', async (data) => {
      const gameSeed = data.seed ? parseInt(data.seed, 10) : randomServiceInstance.generateSeed();
      if (isNaN(gameSeed)) {
        // Basic error display, can be improved
        const errBox = blessed.message({parent: screen, content: "Invalid seed. Must be a number.", top: 'center', left: 'center', height: 'shrink', width: 'shrink', border: 'line'});
        errBox.display("Invalid seed", 0, () => {});
        return;
      }
      await resetGameDefaults({ newGameSeed: gameSeed, playerName: data.name || 'Player' });
      form.destroy();
      menuBox.destroy();
      onGameStart();
    });

    const cancelButton = blessed.button({
        parent: form,
        name: 'cancel',
        content: 'Cancel',
        top: 7,
        left: 'center',
        width: 10,
        height: 1,
        shrink: true,
        mouse: true,
        keys: true,
        style: { focus: { bg: 'red' }, hover: { bg: 'red' } },
    });

    cancelButton.on('press', () => {
        form.destroy();
        newGameButton.focus(); // Return focus to the main menu
    });

    form.focus();
    screen.render();
  });

  loadGameButton.on('press', async () => {
    // Attempt to load game
    // GameStateManager's loadGame will handle if no save exists and start new.
    await loadGame();
    if (gameState.gameSeed === null || gameState.gameSeed === undefined) {
        // This case should ideally be handled by loadGame itself by starting a new game.
        // If it still results in a null gameSeed, it implies an issue or a specific design choice.
        // For now, we'll show a message and let the user decide.
        const noSaveBox = blessed.message({
            parent: screen,
            content: "No saved game found, or failed to load. Please start a new game.",
            top: 'center',
            left: 'center',
            height: 'shrink',
            width: 'shrink',
            border: 'line'
        });
        noSaveBox.display("Load Game", 0, () => {
            // Potentially refocus the new game button or allow closing the message.
        });
        return; // Stay on start menu
    }
    menuBox.destroy();
    onGameStart();
  });

  quitButton.on('press', () => {
    return process.exit(0);
  });

  menuBox.focus();
  screen.append(menuBox);
  screen.render();
}
