#!/usr/bin/env node
// src/index.ts

import blessed from 'blessed';
import chalk from 'chalk'; // chalk@4.1.2
import seedrandom from 'seedrandom';
import { loadData, saveData, SaveData, getDefaultSaveData } from './store';
import { StoneQualities, deriveStoneQualities, generateNewStoneSeed, mulberry32, createStone } from './stone';
import { generateShapeMask } from './shapeMasks';
import { renderStone } from './render';

// --- Global State ---
let screen: blessed.Widgets.Screen;
let currentSaveData: SaveData;
let currentStoneDetails: StoneQualities | null = null;
let gamePrng: seedrandom.PRNG; // General PRNG for game events like probabilities
let opponentQueue: StoneQualities[] = [];

// --- UI Elements ---
let mainLayout: blessed.Widgets.LayoutElement;
let currentStoneInfoBox: blessed.Widgets.BoxElement;
let stonePreviewBox: blessed.Widgets.BoxElement;
let menuListBox: blessed.Widgets.ListElement;
let messageLine: blessed.Widgets.TextElement;

let inventoryLayout: blessed.Widgets.LayoutElement | null = null;
let inventoryList: blessed.Widgets.ListElement | null = null;
let inventoryPreviewBox: blessed.Widgets.BoxElement | null = null;
let inventorySelectedIndex = 0;

// --- Helper Functions ---
function addStoneToInventory(stone: StoneQualities): void {
  currentSaveData.stones.push(stone);
  currentSaveData.stones.sort((a, b) => a.createdAt - b.createdAt); // Sort by createdAt, oldest first
  // saveData(currentSaveData); // Decided to save explicitly after all operations in a single action (e.g. Open)
}

// --- Opponent Queue Functions ---
function generateOpponentQueue(prng: seedrandom.PRNG, count: number): StoneQualities[] {
  const newQueue: StoneQualities[] = [];
  for (let i = 0; i < count; i++) {
    const stoneSeed = generateNewStoneSeed(prng);
    const opponentStone = createStone(stoneSeed);
    newQueue.push(opponentStone);
  }
  return newQueue;
}

function getCurrentOpponent(): StoneQualities | null {
  if (currentSaveData.opponents_index >= opponentQueue.length && opponentQueue.length > 0) {
    // Regenerate queue if index is out of bounds and queue was previously generated
    opponentQueue = generateOpponentQueue(gamePrng, 100);
    currentSaveData.opponents_index = 0;
    saveData(currentSaveData); // Persist the reset index and potentially new salt from new save data if gameSeed changes
  }

  if (opponentQueue.length > 0 && currentSaveData.opponents_index < opponentQueue.length) {
    return opponentQueue[currentSaveData.opponents_index];
  }

  // If queue is empty even after potential regeneration (e.g. count = 0 in generateOpponentQueue)
  // or if initial generation hasn't happened.
  return null;
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
Created: ${new Date(currentStoneDetails.createdAt).toLocaleTimeString()}`); // Example formatting
    } else {
      currentStoneInfoBox.setContent('No current stone selected.');
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
    messageLine.setContent(msg);
    if (screen && screen.focused) screen.render(); // Use screen.focused
    if (duration > 0) {
      setTimeout(() => {
        if (messageLine && messageLine.screen && messageLine.getContent() === msg) {
          messageLine.setContent('');
          if (screen && screen.focused) screen.render(); // Use screen.focused
        }
      }, duration);
    }
  }
}

function shutdown(exitCode: number = 0) {
  if (currentSaveData) {
    saveData(currentSaveData);
  }
  if (screen) {
    // Simpler check for screen existence
    screen.destroy();
    // @ts-ignore: screen can be undefined after destroy
    screen = undefined;
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
      height: '100%-1',
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
      items: ['Open', 'Salvage', 'Inventory', 'Quit'],
      keys: true,
      vi: true,
      mouse: true,
      border: 'line',
      style: { border: { fg: 'blue' }, selected: { bg: 'green' }, item: { hover: { bg: 'blue' } } },
      tags: true,
    });

    if (!messageLine || !messageLine.screen) {
      messageLine = blessed.text({
        parent: screen,
        bottom: 0,
        left: 0,
        height: 1,
        width: '100%',
        content: 'Welcome to Stone-Crafter!',
        style: { bg: 'grey', fg: 'white' },
        tags: true,
      });
    } else {
      messageLine.setFront();
    }

    menuListBox.on('select', (itemEl, index) => {
      const actionText = menuListBox.getItem(index).getContent(); // Use getItem(index).getContent()

      if (actionText === 'Quit') {
        shutdown();
      } else if (actionText === 'Inventory') {
        if (mainLayout && mainLayout.screen) mainLayout.hide();
        showInventoryMenu();
      } else if (actionText === 'Open') {
        if (!currentSaveData.currentStoneSeed) {
          showMessage('No current stone to open!');
          if (menuListBox && menuListBox.screen) setTimeout(() => menuListBox.focus(), 0);
          return;
        }
        const openedStoneSeed = currentSaveData.currentStoneSeed;
        if (!openedStoneSeed) {
          // Should not happen due to earlier check, but good practice
          showMessage('Error: No stone seed to open!');
          if (menuListBox && menuListBox.screen) setTimeout(() => menuListBox.focus(), 0);
          return;
        }

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

        saveData(currentSaveData); // Save once after all stones are added and sorted by addStoneToInventory

        currentSaveData.currentStoneSeed =
          newStones.length > 0
            ? newStones[0].seed
            : currentSaveData.stones.length > 0
              ? currentSaveData.stones[0].seed
              : null;

        updateCurrentStoneDetails();
        refreshCurrentStoneDisplay();
        showMessage(
          `Opened stone ${openedStoneSeed}. Obtained ${newStones.length} new stone(s). First new one is now current.`
        );
        if (menuListBox && menuListBox.screen) setTimeout(() => menuListBox.focus(), 0);
      } else if (actionText === 'Salvage') {
        if (!currentSaveData.currentStoneSeed || !currentStoneDetails) {
          showMessage('No current stone to salvage!');
          if (menuListBox && menuListBox.screen) setTimeout(() => menuListBox.focus(), 0);
          return;
        }
        const salvagedStoneSeed = currentSaveData.currentStoneSeed; // This is a number (seed)
        const stoneToSalvage = currentStoneDetails; // This is StoneQualities | null

        if (!salvagedStoneSeed || !stoneToSalvage) {
          showMessage('Error: No stone details for salvage!');
          if (menuListBox && menuListBox.screen) setTimeout(() => menuListBox.focus(), 0);
          return;
        }

        const salvageValue = stoneToSalvage.rarity * 10; // Use details from currentStoneDetails
        currentSaveData.currency += salvageValue;

        currentSaveData.stones = currentSaveData.stones.filter((s) => s.seed !== salvagedStoneSeed);

        if (currentSaveData.stones.length > 0) {
          currentSaveData.currentStoneSeed = currentSaveData.stones[0].seed;
        } else {
          currentSaveData.currentStoneSeed = null;
        }

        saveData(currentSaveData); // Explicitly save after salvage
        updateCurrentStoneDetails();
        refreshCurrentStoneDisplay();
        showMessage(
          `Salvaged stone ${salvagedStoneSeed} for ${salvageValue} currency. Current currency: ${currentSaveData.currency}`
        );
        if (menuListBox && menuListBox.screen) setTimeout(() => menuListBox.focus(), 0);
      }
    });
  }

  if (mainLayout && mainLayout.hidden) mainLayout.show();
  if (messageLine && messageLine.screen) messageLine.setFront();

  updateCurrentStoneDetails();
  refreshCurrentStoneDisplay();
  if (menuListBox && menuListBox.screen) menuListBox.focus();
  if (screen && screen.focused) screen.render(); // Use screen.focused
}

function refreshInventoryPreview() {
  if (!inventoryPreviewBox || !inventoryPreviewBox.screen || !inventoryList || !inventoryList.screen) return;

  const currentInventorySelectionIndex = (inventoryList as any).selected as number; // Cast to any then number

  if (currentSaveData.stones.length > 0 && currentInventorySelectionIndex < currentSaveData.stones.length) {
    const selectedStone = currentSaveData.stones[currentInventorySelectionIndex]; // Now a StoneQualities object
    const mask = generateShapeMask(selectedStone.shape);
    const stoneGrid = renderStone(mask, selectedStone);
    const artString = stoneGrid.map((row) => row.join('')).join('\n');
    inventoryPreviewBox.setContent(artString);
  } else {
    inventoryPreviewBox.setContent('{center}Inventory is empty or no stone selected.{/center}');
  }
  if (screen && screen.focused) screen.render(); // Use screen.focused
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
      height: '100%',
      border: 'line',
      style: { border: { fg: 'green' } },
      content: '',
      tags: true,
      align: 'center',
      valign: 'middle',
    });

    inventoryList.on('select item', (itemEl, index) => {
      refreshInventoryPreview();
    });

    inventoryList.on('select', (itemEl, index) => {
      if (currentSaveData.stones.length > 0 && index < currentSaveData.stones.length) {
        currentSaveData.currentStoneSeed = currentSaveData.stones[index].seed; // Set the seed
        saveData(currentSaveData); // Explicitly save after changing current stone
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
          showMessage(`Invalid number. Generated one based on text: ${seedNum}`, 5000);
        }
      }
      seedNum = seedNum >>> 0;

      if (startMenuForm.screen) startMenuForm.destroy();
      resolve(seedNum);
    });

    startMenuForm.key(['escape'], () => {
      if (startMenuForm.screen) startMenuForm.destroy();
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

  screen.key(['C-c'], () => shutdown(0));

  currentSaveData = loadData(); // loadData now returns SaveData with gameSeed, salt, opponents_index

  if (currentSaveData.gameSeed === null) {
    // Check against null explicitly, as 0 is a valid seed
    try {
      const initialGameSeed = await showStartMenu();
      currentSaveData.gameSeed = initialGameSeed;
      gamePrng = seedrandom(initialGameSeed.toString());

      const newStoneInternalSeed = generateNewStoneSeed(gamePrng);
      const firstStone = createStone(newStoneInternalSeed);

      addStoneToInventory(firstStone); // Use the new helper
      currentSaveData.currentStoneSeed = firstStone.seed;
      saveData(currentSaveData); // Save after initial stone is added

      showMessage(`Game started with new game seed: ${currentSaveData.gameSeed}. Your first stone is active.`, 5000);
    } catch (err: any) {
      showMessage(err.message || 'Exited during setup.', 2000);
      await new Promise((r) => setTimeout(r, 2000));
      shutdown(1);
      return;
    }
  } else {
    gamePrng = seedrandom(currentSaveData.gameSeed.toString());
  }

  opponentQueue = generateOpponentQueue(gamePrng, 100); // Populate opponent queue

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

  updateCurrentStoneDetails(); // Call this once after PRNG and save data are settled
  showMainMenu(); // This will call refreshCurrentStoneDisplay
}

// --- Program Entry ---
if (require.main === module) {
  main().catch((err) => {
    if (screen) {
      // Simpler check for screen existence before destroy
      screen.destroy();
      // @ts-ignore
      screen = undefined;
    }
    console.error(chalk.red('Stone-Crafter encountered a critical error:'), err);
    process.exit(1);
  });
}
