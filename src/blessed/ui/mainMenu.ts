// src/blessed/ui/mainMenu.ts
import blessed from 'blessed';
import { screen } from '../index';
import {
  equippedStoneDetails,
  currentOpponentStore,
  updateCurrency,
  addStoneToInventory,
  removeStoneFromInventory,
  equipStone,
  saveGame,
  // advanceOpponent is part of fight outcome, not direct menu item here
} from '../../store';
import {
  createStone,
  generateNewStoneSeed,
} from '../../stone';
import { randomServiceInstance } from '../../services/serviceInstances';
import { logMessage, showMessage } from '../../messageStore';
import type { StoneQualities } from '../../interfaces';

export function showMainMenu(
  parent: blessed.Widgets.Box,
  onFight: () => void,
  onInventory: () => void,
  onQuit: () => void
) {
  // Clear parent content area if it had anything
  if (parent.children.length) {
    parent.children.forEach(child => child.destroy());
  }

  const menuList = blessed.list({
    parent: parent,
    label: 'Main Menu',
    top: 'center',
    left: 'center',
    width: '50%',
    height: 'shrink',
    border: 'line',
    items: [
      'Crack Open Stone',
      'Fight Opponent',
      'Salvage Stone',
      'Inventory',
      'Save Game',
      'Quit Game'
    ],
    keys: true,
    mouse: true,
    vi: true, // Use vi keys for navigation
    style: {
      selected: { bg: 'blue', fg: 'white' },
      item: { fg: 'white' },
      border: { fg: 'cyan' },
      label: { fg: 'white' }
    }
  });

  menuList.on('select', async (item, index) => {
    const action = item.getText().trim();
    const equipped = equippedStoneDetails();

    switch (action) {
      case 'Crack Open Stone':
        if (!equipped) {
          showMessage('No stone equipped to crack open!', 3000, 'error');
          return;
        }
        logMessage(`Attempting to crack open stone: ${equipped.seed}`);
        removeStoneFromInventory(equipped.seed); // This also handles unequipping

        const newStones: StoneQualities[] = [];
        const stone1Seed = generateNewStoneSeed(() => randomServiceInstance.getRandom());
        const stone1 = createStone(stone1Seed);
        newStones.push(stone1);
        addStoneToInventory(stone1);

        if (randomServiceInstance.getRandom() < 0.1) { // 10% chance for 2nd
          const stone2Seed = generateNewStoneSeed(() => randomServiceInstance.getRandom());
          const stone2 = createStone(stone2Seed);
          newStones.push(stone2);
          addStoneToInventory(stone2);
        }
        if (randomServiceInstance.getRandom() < 0.01) { // 1% chance for 3rd
          const stone3Seed = generateNewStoneSeed(() => randomServiceInstance.getRandom());
          const stone3 = createStone(stone3Seed);
          newStones.push(stone3);
          addStoneToInventory(stone3);
        }

        // GameStateManager.removeStoneFromInventory handles equipping next available.
        // If new stones found, equip the first one.
        if (newStones.length > 0) {
            equipStone(newStones[0].seed);
        }
        // If no new stones, GSM already handled equipping next or null.

        await saveGame();
        const newEquipped = equippedStoneDetails(); // get the newly equipped stone
        logMessage(`Cracked ${equipped.seed}. Found ${newStones.length}. New equipped: ${newEquipped?.seed || 'None'}`);
        showMessage(`Cracked ${equipped.name || equipped.seed}. Found ${newStones.length} new stone(s).`, 4000, 'success');
        break;

      case 'Fight Opponent':
        const opponent = currentOpponentStore();
        if (!equipped) {
          showMessage('No stone equipped to fight with!', 3000, 'error');
          return;
        }
        if (!opponent) {
          showMessage('No opponents available to fight!', 3000, 'error');
          // Potentially trigger opponent generation here or ensure it's handled by store
          return;
        }
        logMessage(`Initiating fight with opponent: ${opponent.seed}`);
        onFight(); // Call the callback
        break;

      case 'Salvage Stone':
        if (!equipped) {
          showMessage('No stone equipped to salvage!', 3000, 'error');
          return;
        }
        logMessage(`Attempting to salvage stone: ${equipped.seed}`);
        const salvageValue = equipped.rarity * 10; // Same logic as before
        updateCurrency(salvageValue);
        removeStoneFromInventory(equipped.seed); // This also handles unequipping

        await saveGame();
        logMessage(`Salvaged ${equipped.seed} for ${salvageValue}.`);
        showMessage(`Salvaged stone for ${salvageValue} currency.`, 4000, 'success');
        break;

      case 'Inventory':
        logMessage('Opening inventory.');
        onInventory(); // Call the callback
        break;

      case 'Save Game':
        await saveGame();
        showMessage('Game Saved!', 2000, 'success');
        logMessage('Game progress saved by player.');
        break;

      case 'Quit Game':
        onQuit();
        break;
    }
    // Re-focus after action, in case a message box took focus
    menuList.focus();
    screen.render();
  });

  menuList.focus();
  parent.append(menuList); // Append to the passed parent
  screen.render();

  return menuList; // Return the element if needed for external management
}
