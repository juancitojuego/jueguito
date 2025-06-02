#!/usr/bin/env node
// src/index.ts

import blessed from 'blessed';
import chalk from 'chalk'; // chalk@4.1.2
import seedrandom from 'seedrandom';
import { loadData, saveData, SaveData, getDefaultSaveData } from './store';
import {
  StoneQualities,
  deriveStoneQualities,
  generateNewStoneSeed,
  mulberry32,
  createStone,
  calculateStonePower,
} from './stone';
import { generateShapeMask } from './shapeMasks';
import { renderStone } from './render';

// --- Global State ---
/** The main blessed screen object, provides the terminal interface. */
let screen: blessed.Widgets.Screen;

// Console Log Panel Globals
const MAX_CONSOLE_MESSAGES = 100;
const consoleLogMessages: string[] = [];
/** Displays scrollable game event logs, errors, and other messages. */
let consoleLogBox: blessed.Widgets.Log | null = null;

let currentSaveData: SaveData;
let currentStoneDetails: StoneQualities | null = null;
let gamePrng: seedrandom.PRNG; // General PRNG for game events like probabilities
let opponentQueue: StoneQualities[] = [];

// --- UI Elements ---
/** The main layout container for the primary game interface (stone info, preview, menu). */
let mainLayout: blessed.Widgets.LayoutElement;
/** Displays detailed information about the currently selected/active stone. */
let currentStoneInfoBox: blessed.Widgets.BoxElement;
/** Visually renders the currently selected/active stone. */
let stonePreviewBox: blessed.Widgets.BoxElement;
/** Interactive list for main game actions (Crack Open, Fight, Salvage, Inventory, Quit). */
let menuListBox: blessed.Widgets.ListElement;
/** Single line at the bottom of the screen for temporary messages and user feedback. */
let messageLine: blessed.Widgets.TextElement; // Will be initialized early

/** Layout container for the inventory screen. */
let inventoryLayout: blessed.Widgets.LayoutElement | null = null;
/** Scrollable list displaying stones in the player's inventory. */
let inventoryList: blessed.Widgets.ListElement | null = null;
/** Displays the visual preview of the stone highlighted in the inventoryList. */
let inventoryPreviewBox: blessed.Widgets.BoxElement | null = null;
/** Displays detailed properties of the stone highlighted in the inventoryList. */
let inventoryDetailBox: blessed.Widgets.BoxElement | null = null;
let inventorySelectedIndex = 0;

// --- Helper Functions ---
function addStoneToInventory(stone: StoneQualities): void {
  currentSaveData.stones.push(stone);
  currentSaveData.stones.sort((a, b) => a.createdAt - b.createdAt); // Sort by createdAt, oldest first
  // saveData(currentSaveData); // Decided to save explicitly after all operations in a single action (e.g. Open)
}

// --- Opponent Queue Functions ---
function generateOpponentQueue(prng: seedrandom.PRNG, count: number): StoneQualities[] {
  logMessage(`Generating new opponent queue with ${count} opponents.`);
  const newQueue: StoneQualities[] = [];
  for (let i = 0; i < count; i++) {
    const stoneSeed = generateNewStoneSeed(prng);
    const opponentStone = createStone(stoneSeed);
    newQueue.push(opponentStone);
  }
  logMessage(`Generated ${newQueue.length} new opponents for the queue.`);
  return newQueue;
}

function getCurrentOpponent(): StoneQualities | null {
  if (currentSaveData.opponents_index >= opponentQueue.length && opponentQueue.length > 0) {
    logMessage(
      `Opponent index ${currentSaveData.opponents_index} is out of bounds for queue length ${opponentQueue.length}. Regenerating opponent queue.`
    );
    opponentQueue = generateOpponentQueue(gamePrng, 100); // generateOpponentQueue now logs its own start/finish
    currentSaveData.opponents_index = 0;
    try {
      saveData(currentSaveData); // Persist the reset index
      logMessage('Game data saved after opponent queue regeneration and index reset.');
    } catch (e: any) {
      logMessage(`Error saving game data after opponent queue regeneration: ${e.message}`);
      showMessage(`SAVE FAILED (opponent queue): ${e.message}`, 3000);
    }
  }

  if (opponentQueue.length > 0 && currentSaveData.opponents_index < opponentQueue.length) {
    return opponentQueue[currentSaveData.opponents_index];
  }

  // If queue is empty even after potential regeneration (e.g. count = 0 in generateOpponentQueue)
  // or if initial generation hasn't happened.
  logMessage('Opponent queue is empty or index is out of bounds and no regeneration occurred.');
  return null;
}

// --- Logging Function ---
/**
 * Logs a message to the console log panel and internal message buffer.
 * Manages a circular buffer of messages (MAX_CONSOLE_MESSAGES).
 * Prepends a timestamp to each message.
 *
 * @param message The string message to log.
 */
function logMessage(message: string): void {
  const timestamp = new Date().toLocaleTimeString();
  const timedMessage = `[${timestamp}] ${message}`;

  consoleLogMessages.push(timedMessage);
  if (consoleLogMessages.length > MAX_CONSOLE_MESSAGES) {
    consoleLogMessages.shift(); // Keep the array size fixed, removing the oldest
  }

  if (consoleLogBox && consoleLogBox.screen) {
    consoleLogBox.log(timedMessage); // Use .log() method for blessed.Log
    if (screen && screen.focused) screen.render();
  }
}

// --- Core Functions ---

function updateCurrentStoneDetails() {
  if (currentSaveData.currentStoneSeed !== null) {
    currentStoneDetails = currentSaveData.stones.find((s) => s.seed === currentSaveData.currentStoneSeed) || null;
  } else {
    currentStoneDetails = null;
  }
}

function refreshCurrentStoneDisplay() {
  if (currentStoneInfoBox && currentStoneInfoBox.screen) {
    // Check if part of a screen
    if (currentStoneDetails) {
      // Added Magic and CreatedAt (optional, as it's a timestamp)
      currentStoneInfoBox.setContent(`Current Stone:
Seed: ${currentStoneDetails.seed}
Color: ${currentStoneDetails.color}
Shape: ${currentStoneDetails.shape}
Rarity: ${currentStoneDetails.rarity}
Hardness: ${currentStoneDetails.hardness.toFixed(2)}
Weight: ${currentStoneDetails.weight}
Magic: ${currentStoneDetails.magic}
Created: ${new Date(currentStoneDetails.createdAt).toLocaleTimeString()}
Currency: ${currentSaveData.currency}`);
    } else {
      currentStoneInfoBox.setContent(`No current stone selected.
Currency: ${currentSaveData.currency}`);
    }
  }
  if (stonePreviewBox && stonePreviewBox.screen) {
    // Check if part of a screen
    if (currentStoneDetails) {
      const mask = generateShapeMask(currentStoneDetails.shape);
      const stoneGrid = renderStone(mask, currentStoneDetails);
      const artString = stoneGrid.map((row) => row.join('')).join('\n');
      stonePreviewBox.setContent(artString);
    } else {
      stonePreviewBox.setContent('{center}Select or generate a stone.{/center}');
    }
  }
  if (screen && screen.focused) screen.render(); // Use screen.focused
}

function showMessage(msg: string, duration: number = 3000) {
  if (messageLine && messageLine.screen) {
    // Truncate message if it's too long for the messageLine
    // Assuming messageLine width is available and typical character width.
    // This is a rough estimate; blessed may handle overflow differently based on tags.
    const maxWidth = (messageLine.width as number) - 2; // Account for potential borders/padding
    const truncatedMsg = msg.length > maxWidth ? msg.substring(0, maxWidth - 3) + '...' : msg;
    messageLine.setContent(truncatedMsg);
    logMessage(`showMessage: ${msg}`); // Log the full original message

    if (screen && screen.focused) screen.render();
    if (duration > 0) {
      setTimeout(() => {
        if (messageLine && messageLine.screen && messageLine.getContent() === truncatedMsg) {
          messageLine.setContent('');
          if (screen && screen.focused) screen.render();
        }
      }, duration);
    }
  } else {
    // If messageLine isn't ready, still log it.
    logMessage(`showMessage (no UI): ${msg}`);
  }
}

function shutdown(exitCode: number = 0) {
  logMessage(`Shutting down with exit code ${exitCode}.`);
  if (currentSaveData) {
    try {
      saveData(currentSaveData);
      logMessage('Game data saved successfully during shutdown.');
    } catch (e: any) {
      logMessage(`Error saving game data during shutdown: ${e.message}`);
    }
  }
  if (screen) {
    screen.destroy();
    // @ts-ignore: screen can be undefined after destroy
    screen = undefined;
    console.log('Screen destroyed.'); // Log to actual console as blessed is gone
  }
  process.exit(exitCode);
}

function showMainMenu() {
  if (inventoryLayout && !inventoryLayout.hidden) inventoryLayout.hide();
  if (mainLayout && mainLayout.screen && !mainLayout.hidden) {
    if (menuListBox && menuListBox.screen) menuListBox.focus();
    if (screen && screen.focused) screen.render(); // Use screen.focused
    return;
  }

  if (!mainLayout || !mainLayout.screen) {
    mainLayout = blessed.layout({
      parent: screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%-11', // Adjusted for consoleLogBox (10 lines) + messageLine (1 line)
      // No 'layout' property for manual positioning
    } as any);

    currentStoneInfoBox = blessed.box({
      parent: mainLayout,
      top: 0,
      left: 0,
      width: '30%',
      height: '50%',
      label: 'Stone Info',
      border: 'line',
      style: { border: { fg: 'blue' } },
      content: '',
      tags: true,
      padding: 1,
    });

    stonePreviewBox = blessed.box({
      parent: mainLayout,
      top: 0,
      left: '30%',
      width: '70%',
      height: '90%',
      label: 'Stone Preview',
      border: 'line',
      style: { border: { fg: 'blue' } },
      content: '',
      tags: true,
      align: 'center',
      valign: 'middle',
    });

    menuListBox = blessed.list({
      parent: mainLayout,
      label: 'Main Menu',
      bottom: 0,
      left: 0,
      width: '30%',
      height: '50%',
      items: ['Crack Open Current Stone', 'Fight', 'Salvage', 'Inventory', 'Quit'],
      keys: true,
      vi: true,
      mouse: true,
      border: 'line',
      style: { border: { fg: 'blue' }, selected: { bg: 'green' }, item: { hover: { bg: 'blue' } } },
      tags: true,
    });

    // messageLine is initialized in main() before showMainMenu is called
    if (messageLine && messageLine.screen) {
        messageLine.setFront(); // Ensure it's on top if it was somehow covered
    }


    menuListBox.on('select', (itemEl, index) => {
      const actionText = menuListBox.getItem(index).getContent(); // Use getItem(index).getContent()

      if (actionText === 'Quit') {
        shutdown();
      } else if (actionText === 'Inventory') {
        if (mainLayout && mainLayout.screen) mainLayout.hide();
        showInventoryMenu();
      } else if (actionText === 'Crack Open Current Stone') {
        if (!currentSaveData.currentStoneSeed) {
          const msg = 'No current stone to crack open! Select one from inventory or start a new game if empty.';
          showMessage(msg);
          // logMessage is called by showMessage, no need for specific logMessage(`Open action failed: ${msg}`);
          if (menuListBox && menuListBox.screen) setTimeout(() => menuListBox.focus(), 0);
          return;
        }
        const openedStoneSeed = currentSaveData.currentStoneSeed;
        // This check is somewhat redundant given the one above, but kept for safety.
        if (!openedStoneSeed) { // Should ideally never be hit if currentStoneSeed is set
          const msg = 'Error: No stone seed to open despite currentStoneSeed being set!';
          showMessage(msg);
          if (menuListBox && menuListBox.screen) setTimeout(() => menuListBox.focus(), 0);
          return;
        }
        logMessage(`Attempting to crack open stone: ${openedStoneSeed}`);
        currentSaveData.stones = currentSaveData.stones.filter((s) => s.seed !== openedStoneSeed);

        const newStones: StoneQualities[] = [];
        // Use a PRNG specific to the opened stone's seed for deterministic output if desired,
        // or gamePrng for more global randomness. For variety, let's use gamePrng here.
        // const stoneSpecificPrng = mulberry32(openedStoneSeed ^ Date.now()); // Old way

        const stone1Seed = generateNewStoneSeed(gamePrng);
        const stone1 = createStone(stone1Seed);
        newStones.push(stone1);
        addStoneToInventory(stone1);

        if (gamePrng() < 0.1) {
          // 10% chance for a second stone
          const stone2Seed = generateNewStoneSeed(gamePrng);
          const stone2 = createStone(stone2Seed);
          newStones.push(stone2);
          addStoneToInventory(stone2);
        }
        if (gamePrng() < 0.01) {
          // 1% chance for a third stone (compounded)
          const stone3Seed = generateNewStoneSeed(gamePrng);
          const stone3 = createStone(stone3Seed);
          newStones.push(stone3);
          addStoneToInventory(stone3);
        }
        try {
          saveData(currentSaveData); // Save once after all stones are added and sorted by addStoneToInventory
          logMessage('Game data saved after opening stone.');
        } catch (e: any) {
          logMessage(`Error saving game data after opening stone: ${e.message}`);
          showMessage(`SAVE FAILED: ${e.message}`, 3000); // Also inform user on main message line
        }

        const oldStoneSeed = currentSaveData.currentStoneSeed;
        currentSaveData.currentStoneSeed =
          newStones.length > 0
            ? newStones[0].seed
            : currentSaveData.stones.length > 0
              ? currentSaveData.stones[0].seed
              : null;
        logMessage(`Previous stone ${oldStoneSeed} opened. New current stone: ${currentSaveData.currentStoneSeed}. Found ${newStones.length} stones.`);

        updateCurrentStoneDetails();
        refreshCurrentStoneDisplay();
        showMessage(
          `Opened stone ${openedStoneSeed}. Obtained ${newStones.length} new stone(s). ${currentSaveData.currentStoneSeed ? 'First new one is now current.' : 'Inventory is now empty.'}`
        );
        if (menuListBox && menuListBox.screen) setTimeout(() => menuListBox.focus(), 0);
      } else if (actionText === 'Fight') {
        if (!currentStoneDetails) {
          const msg = 'No stone selected to fight with! Select one from inventory.';
          showMessage(msg);
          // logMessage(`Fight action failed: ${msg}`); // Covered by showMessage
          if (menuListBox && menuListBox.screen) setTimeout(() => menuListBox.focus(), 0);
          return;
        }

        const opponentStone = getCurrentOpponent();
        if (!opponentStone) {
          const msg = 'No opponents available to fight! (Queue might be empty).';
          showMessage(msg);
          // logMessage(`Fight action failed: ${msg}`); // Covered by showMessage
          if (menuListBox && menuListBox.screen) setTimeout(() => menuListBox.focus(), 0);
          return;
        }
        logMessage(`Fight started: Player (${currentStoneDetails.seed}) vs Opponent (${opponentStone.seed})`);

        let playerPower = calculateStonePower(currentStoneDetails);
        let opponentPower = calculateStonePower(opponentStone);

        // Apply variance: +/- 15%
        playerPower *= 1 + (gamePrng() * 0.3 - 0.15);
        opponentPower *= 1 + (gamePrng() * 0.3 - 0.15);

        let fightMessage = `Your stone (P: ${playerPower.toFixed(
          2
        )}) vs Opponent (P: ${opponentPower.toFixed(2)}). `;

        if (playerPower > opponentPower) {
          // Player wins
          currentSaveData.currency += 10;
          fightMessage += `You WIN! +10 currency. Current: ${currentSaveData.currency}.`;

          if (gamePrng() < 0.2) {
            // 20% chance for an extra stone
            const newStoneSeed = generateNewStoneSeed(gamePrng);
            const extraStone = createStone(newStoneSeed);
            addStoneToInventory(extraStone);
            fightMessage += ' You found an extra stone!';
          }
        } else if (playerPower < opponentPower) {
          // Player loses
          fightMessage += 'You LOST. ';
          if (gamePrng() < 0.3) {
            // 30% chance to destroy player's stone
            const lostStoneSeed = currentStoneDetails.seed;
            currentSaveData.stones = currentSaveData.stones.filter((s) => s.seed !== lostStoneSeed);
            fightMessage += 'Your stone was destroyed!';

            if (currentSaveData.stones.length > 0) {
              currentSaveData.currentStoneSeed = currentSaveData.stones[0].seed;
            } else {
              currentSaveData.currentStoneSeed = null;
            }
            updateCurrentStoneDetails(); // Update global currentStoneDetails
          }
        } else {
          // Tie
          fightMessage += "It's a TIE.";
        }

        currentSaveData.opponents_index++; // Advance to next opponent
        logMessage(`Fight result: ${fightMessage}. Next opponent index: ${currentSaveData.opponents_index}`);

        showMessage(fightMessage);
        try {
          saveData(currentSaveData);
          logMessage('Game data saved after fight.');
        } catch (e: any) {
          logMessage(`Error saving game data after fight: ${e.message}`);
          showMessage(`SAVE FAILED: ${e.message}`, 3000);
        }
        refreshCurrentStoneDisplay();
        if (menuListBox && menuListBox.screen) setTimeout(() => menuListBox.focus(), 0);
      } else if (actionText === 'Salvage') {
        if (!currentSaveData.currentStoneSeed || !currentStoneDetails) {
          const msg = 'No current stone to salvage! Select one from inventory.';
          showMessage(msg);
          // logMessage(`Salvage action failed: ${msg}`); // Covered by showMessage
          if (menuListBox && menuListBox.screen) setTimeout(() => menuListBox.focus(), 0);
          return;
        }
        const salvagedStoneSeed = currentSaveData.currentStoneSeed;
        const stoneToSalvage = currentStoneDetails;

        // Redundant check, currentStoneDetails implies currentSaveData.currentStoneSeed is valid
        if (!salvagedStoneSeed || !stoneToSalvage) {
          const msg = 'Error: No stone details for salvage despite earlier checks!';
          showMessage(msg);
          logMessage(`Salvage action error: ${msg}`);
          if (menuListBox && menuListBox.screen) setTimeout(() => menuListBox.focus(), 0);
          return;
        }
        logMessage(`Attempting to salvage stone: ${salvagedStoneSeed}`);

        const salvageValue = stoneToSalvage.rarity * 10;
        currentSaveData.currency += salvageValue;

        currentSaveData.stones = currentSaveData.stones.filter((s) => s.seed !== salvagedStoneSeed);

        if (currentSaveData.stones.length > 0) {
          currentSaveData.currentStoneSeed = currentSaveData.stones[0].seed;
        } else {
          currentSaveData.currentStoneSeed = null;
        }
        try {
          saveData(currentSaveData); // Explicitly save after salvage
          logMessage('Game data saved after salvaging stone.');
        } catch (e: any) {
          logMessage(`Error saving game data after salvaging stone: ${e.message}`);
          showMessage(`SAVE FAILED: ${e.message}`, 3000);
        }
        updateCurrentStoneDetails();
        refreshCurrentStoneDisplay();
        const salvageMsg = `Salvaged stone ${salvagedStoneSeed} for ${salvageValue} currency. Current currency: ${currentSaveData.currency}. New current stone: ${currentSaveData.currentStoneSeed || 'none'}.`;
        showMessage(salvageMsg);
        logMessage(salvageMsg); // showMessage already logs, but this adds more detail if needed
        if (menuListBox && menuListBox.screen) setTimeout(() => menuListBox.focus(), 0);
      }
    });
  }

  if (mainLayout && mainLayout.hidden) mainLayout.show();
  // messageLine is global and should be managed by main screen render cycle
  // if (messageLine && messageLine.screen) messageLine.setFront(); // Already handled by screen.render usually

  updateCurrentStoneDetails();
  refreshCurrentStoneDisplay();
  if (menuListBox && menuListBox.screen) menuListBox.focus();
  if (screen && screen.focused) screen.render();
}

function refreshInventoryPreview() {
  if (!inventoryPreviewBox || !inventoryPreviewBox.screen ||
      !inventoryDetailBox || !inventoryDetailBox.screen ||
      !inventoryList || !inventoryList.screen) {
    logMessage('Inventory preview refresh skipped: UI elements not ready.');
    return;
  }

  const currentInventorySelectionIndex = (inventoryList as any).selected as number;

  if (currentSaveData.stones.length > 0 &&
      currentInventorySelectionIndex >= 0 && // Ensure index is valid
      currentInventorySelectionIndex < currentSaveData.stones.length) {
    const selectedStone = currentSaveData.stones[currentInventorySelectionIndex];

    // Update Preview Box (Stone Art)
    const mask = generateShapeMask(selectedStone.shape);
    const stoneGrid = renderStone(mask, selectedStone); // renderStone should return a 2D array of strings
    const artString = stoneGrid.map((row) => row.join('')).join('\n');
    inventoryPreviewBox.setContent(artString);

    // Update Detail Box (Stone Properties)
    const detailString = `Seed: ${selectedStone.seed}
Color: ${selectedStone.color}
Shape: ${selectedStone.shape}
Rarity: ${selectedStone.rarity}
Hardness: ${selectedStone.hardness.toFixed(2)}
Weight: ${selectedStone.weight.toFixed(2)}
Magic: ${selectedStone.magic.toFixed(2)}
Created: ${new Date(selectedStone.createdAt).toLocaleString()}`;
    inventoryDetailBox.setContent(detailString);
    logMessage(`Inventory preview updated for stone: ${selectedStone.seed}`);

  } else {
    const emptyMsg = '{center}Inventory is empty or no stone selected.{/center}';
    inventoryPreviewBox.setContent(emptyMsg);
    inventoryDetailBox.setContent(emptyMsg);
    logMessage('Inventory preview shows empty/no selection.');
  }

  if (screen && screen.focused) {
    screen.render();
  }
}

function showInventoryMenu() {
  if (!inventoryLayout || !inventoryLayout.screen) {
    inventoryLayout = blessed.layout({
      parent: screen,
      hidden: true,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%-1',
      // No 'layout' property for manual positioning
    } as any);

    inventoryList = blessed.list({
      parent: inventoryLayout,
      label: 'Inventory (Enter to Set Current, Esc/Q to Close)',
      top: 0,
      left: 0,
      width: '30%',
      height: '100%',
      items: [],
      keys: true,
      vi: true,
      mouse: true,
      border: 'line',
      style: { border: { fg: 'green' }, selected: { bg: 'blue' }, item: { hover: { bg: 'magenta' } } },
      tags: true,
    });

    inventoryPreviewBox = blessed.box({
      parent: inventoryLayout,
      label: 'Selected Stone Preview',
      top: 0,
      left: '30%',
      width: '70%',
      height: '70%', // Adjusted height for preview
      border: 'line',
      style: { border: { fg: 'green' } },
      content: '',
      tags: true,
      align: 'center',
      valign: 'middle',
    });

    inventoryDetailBox = blessed.box({
      parent: inventoryLayout,
      label: 'Stone Details',
      top: '70%', // Positioned below the preview box
      left: '30%',
      width: '70%',
      height: '30%', // Takes the remaining 30% of the right panel height
      border: 'line',
      style: { border: { fg: 'cyan' } }, // Different border color for distinction
      content: '',
      tags: true,
      padding: 1,
    });

    inventoryList.on('select item', (itemEl, index) => { // This event fires when selection changes
      refreshInventoryPreview();
    });

    inventoryList.on('select', (itemEl, index) => { // This event fires when Enter is pressed on an item
      if (currentSaveData.stones.length > 0 && index < currentSaveData.stones.length) {
        currentSaveData.currentStoneSeed = currentSaveData.stones[index].seed; // Set the seed
        try {
          saveData(currentSaveData); // Explicitly save after changing current stone
          logMessage(`Game data saved. New current stone selected: ${currentSaveData.currentStoneSeed}`);
        } catch (e: any) {
          logMessage(`Error saving game data after selecting new stone: ${e.message}`);
          showMessage(`SAVE FAILED: ${e.message}`, 3000);
        }
        updateCurrentStoneDetails(); // This will find the full stone object
      }
      if (inventoryLayout && inventoryLayout.screen) inventoryLayout.hide();
      showMainMenu(); // This will refresh display using the new currentStoneDetails
    });

    inventoryList.key(['escape', 'q'], () => {
      if (inventoryLayout && inventoryLayout.screen) inventoryLayout.hide();
      showMainMenu();
    });
  }

  const displayItems = currentSaveData.stones.map((stone) => {
    // Iterate over StoneQualities objects
    // const stone = deriveStoneQualities(seed); // No longer needed
    return `${stone.seed.toString().substring(0, 8)}.. - ${stone.color} ${stone.shape} (R${stone.rarity})`;
  });
  if (inventoryList && inventoryList.screen) {
    inventoryList.setItems(displayItems);
    if (displayItems.length > 0) {
      inventoryList.select(((inventoryList as any).selected as number) || 0); // Cast to any then number
    }
  }

  refreshInventoryPreview();
  if (inventoryLayout && inventoryLayout.screen) inventoryLayout.show();
  if (inventoryList && inventoryList.screen) inventoryList.focus();
  if (screen && screen.focused) screen.render(); // Use screen.focused
}

async function showStartMenu(): Promise<number> {
  const startMenuForm = blessed.form<{ seed?: string }>({
    parent: screen,
    width: '50%',
    height: 7,
    top: 'center',
    left: 'center',
    label: 'Stone-Crafter (New Player Setup)',
    border: 'line',
    keys: true,
    style: { border: { fg: 'green' }, label: { fg: 'green' } },
  });

  blessed.text({
    parent: startMenuForm,
    content: 'Enter initial seed (number) or leave blank for random:',
    top: 1,
    left: 2,
  });

  const seedInput = blessed.textbox({
    parent: startMenuForm,
    name: 'seed',
    inputOnFocus: true,
    top: 2,
    left: 2,
    height: 1,
    width: '90%-4',
    style: { bg: 'blue', focus: { bg: 'cyan' } },
  });

  const startButton = blessed.button({
    parent: startMenuForm,
    name: 'submit',
    content: 'Start Game',
    bottom: 1,
    left: 2,
    width: 'shrink',
    height: 1,
    style: { bg: 'green', focus: { bg: 'lime' } },
    padding: { left: 1, right: 1 },
  });

  seedInput.focus();

  return new Promise<number>((resolve, reject) => {
    startButton.on('press', () => startMenuForm.submit());

    startMenuForm.on('submit', (data) => {
      const seedStr = data.seed || '';
      let seedNum: number;
      if (seedStr.trim() === '') {
        const tempRng = mulberry32(Date.now() + Math.random() * 10000); // Math.random() for quick non-determinism
        seedNum = generateNewStoneSeed(tempRng) >>> 0;
        showMessage(`No seed entered. Using random: ${seedNum}`, 5000);
      } else {
        seedNum = parseInt(seedStr, 10);
        if (isNaN(seedNum)) {
          const tempRng = mulberry32(Date.now());
          for (let i = 0; i < seedStr.length; i++) tempRng();
          seedNum = generateNewStoneSeed(tempRng) >>> 0;
          const msg = `Invalid number entered for seed. Generated one based on text: ${seedNum}`;
          showMessage(msg, 5000); // showMessage also logs
          // logMessage(msg); // No longer needed as showMessage handles it
        }
      }
      seedNum = seedNum >>> 0;
      logMessage(`Seed resolved from start menu: ${seedNum}`);

      if (startMenuForm.screen) startMenuForm.destroy();
      resolve(seedNum);
    });

    startMenuForm.key(['escape'], () => {
      if (startMenuForm.screen) startMenuForm.destroy();
      logMessage('User exited start menu via escape key.');
      reject(new Error('User exited start menu.'));
    });
    if (screen && screen.focused) screen.render(); // Use screen.focused
  });
}

async function main() {
  screen = blessed.screen({
    smartCSR: true,
    title: 'Stone-Crafter',
    fullUnicode: true,
  });
  logMessage('Screen initialized.');

  // Initialize messageLine and consoleLogBox early
  messageLine = blessed.text({
    parent: screen,
    bottom: 0,
    left: 0,
    width: '100%',
    height: 1,
    content: 'Welcome to Stone-Crafter! Initializing...',
    style: { fg: 'white', bg: 'blue' },
    align: 'center',
    tags: true,
  });
  logMessage('MessageLine initialized.');

  consoleLogBox = blessed.log({
    parent: screen,
    bottom: 1, // Positioned above the messageLine
    width: '100%',
    height: 10, // Height of the console log panel (10 lines)
    border: { type: 'line' },
    style: {
      fg: 'green',
      bg: 'black',
      border: { fg: '#f0f0f0' },
    },
    scrollable: true,
    alwaysScroll: true,
    scrollbar: { ch: ' ', track: { bg: 'grey' }, style: { inverse: true } },
    label: 'Console Log',
    tags: true,
  });
  logMessage('ConsoleLogBox initialized.');

  // Replay any early messages that were logged before consoleLogBox was ready
  if (consoleLogBox) {
    consoleLogMessages.forEach(msg => {
      if (consoleLogBox) consoleLogBox.log(msg); // Check again, TS paranoia
    });
  }
  logMessage('Early log messages replayed to ConsoleLogBox.');


  screen.key(['C-c'], () => shutdown(0));
  logMessage('Ctrl+C handler registered for shutdown.');

  try {
    currentSaveData = loadData();
    logMessage(`Save data loaded. Game seed: ${currentSaveData.gameSeed}. Stone count: ${currentSaveData.stones.length}. Currency: ${currentSaveData.currency}.`);
  } catch (error: any) {
    currentSaveData = getDefaultSaveData(); // Load default if any error
    logMessage(`Error loading data: ${error.message}. Using default save data.`);
    showMessage(`Error loading data: ${error.message}. Defaults used.`, 5000);
  }


  if (currentSaveData.gameSeed === null) {
    logMessage('No game seed found. Initiating new player setup.');
    try {
      const initialGameSeed = await showStartMenu(); // showStartMenu also logs
      currentSaveData.gameSeed = initialGameSeed;
      gamePrng = seedrandom(initialGameSeed.toString());
      logMessage(`PRNG initialized with new game seed: ${currentSaveData.gameSeed}`);

      const newStoneInternalSeed = generateNewStoneSeed(gamePrng);
      const firstStone = createStone(newStoneInternalSeed);
      logMessage(`Generated first stone with seed: ${firstStone.seed}`);

      addStoneToInventory(firstStone);
      currentSaveData.currentStoneSeed = firstStone.seed;
      try {
        saveData(currentSaveData);
        logMessage('Game data saved after initial new player setup.');
      } catch (e: any) {
        logMessage(`Error saving game data after initial setup: ${e.message}`);
        // This is a critical save, might want to alert user more strongly or handle differently
        showMessage(`CRITICAL SAVE FAILED: ${e.message}. Progress may not be saved.`, 5000);
      }

      showMessage(`Game started with new game seed: ${currentSaveData.gameSeed}. Your first stone is active.`, 5000);
    } catch (err: any) {
      const errMsg = err.message || 'Exited during setup.';
      logMessage(`Error during new player setup: ${errMsg}`);
      showMessage(errMsg, 3000);
      await new Promise((r) => setTimeout(r, 3000));
      shutdown(1);
      return;
    }
  } else {
    gamePrng = seedrandom(currentSaveData.gameSeed.toString());
    logMessage(`PRNG initialized from existing game seed: ${currentSaveData.gameSeed}.`);
  }

  opponentQueue = generateOpponentQueue(gamePrng, 100);
  logMessage(`Opponent queue generated with ${opponentQueue.length} opponents.`);

  // Ensure currentStoneSeed is valid or set a default
  if (currentSaveData.currentStoneSeed === null && currentSaveData.stones.length > 0) {
    currentSaveData.currentStoneSeed = currentSaveData.stones[0].seed; // Get seed from first stone object
  } else if (
    currentSaveData.currentStoneSeed !== null &&
    !currentSaveData.stones.some((s) => s.seed === currentSaveData.currentStoneSeed)
  ) {
    // If currentStoneSeed is somehow invalid (not in stones array of objects), default to first or null
    currentSaveData.currentStoneSeed = currentSaveData.stones.length > 0 ? currentSaveData.stones[0].seed : null;
  }
  // If stones array is empty, currentStoneSeed will remain/become null.

  updateCurrentStoneDetails();
  logMessage(`Current stone details updated: ${currentStoneDetails ? currentStoneDetails.seed : 'None'}`);
  showMainMenu();
  logMessage('Main menu displayed. Application setup complete.');
}

// --- Program Entry ---
if (require.main === module) {
  // Log unhandled errors to the console log if possible, then to stderr
  process.on('uncaughtException', (err) => {
    const errorMsg = `UNCAUGHT EXCEPTION: ${err.message}\n${err.stack}`;
    logMessage(errorMsg); // Try to log to blessed console if active

    // Ensure it also goes to stderr for cases where blessed might be broken
    console.error(chalk.red('Stone-Crafter UNCAUGHT EXCEPTION:'), err);

    if (screen) { // Attempt graceful shutdown if possible
        screen.destroy();
        // @ts-ignore
        screen = undefined;
    }
    process.exit(1);
  });

  main().catch((err) => { // Catch errors from the main async function
    const errorMsg = `Critical error during main execution: ${err.message}\n${err.stack}`;
    logMessage(errorMsg); // Log to blessed console if active

    if (screen) {
      screen.destroy();
      // @ts-ignore
      screen = undefined;
    }
    console.error(chalk.red('Stone-Crafter encountered a critical error during main:'), err);
    process.exit(1);
  });
}
