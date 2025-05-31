#!/usr/bin/env node
// src/index.ts

import blessed from 'blessed';
import chalk from 'chalk'; // chalk@4.1.2
import { loadData, saveData, SaveData, getDefaultSaveData } from './store';
import { StoneQualities, deriveStoneQualities, generateNewStoneSeed, mulberry32 } from './stone';
import { renderStoneToAscii } from './render';

// --- Global State ---
let screen: blessed.Widgets.Screen;
let currentSaveData: SaveData;
let currentStoneDetails: StoneQualities | null = null;
let gamePrng: () => number; // General PRNG for game events like probabilities

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


// --- Core Functions ---

function updateCurrentStoneDetails() {
  if (currentSaveData.currentStoneSeed !== null) {
    currentStoneDetails = deriveStoneQualities(currentSaveData.currentStoneSeed);
  } else {
    currentStoneDetails = null;
  }
}

function refreshCurrentStoneDisplay() {
  if (currentStoneInfoBox && currentStoneInfoBox.screen) { // Check if part of a screen
    if (currentStoneDetails) {
      currentStoneInfoBox.setContent(`Current Stone:
Seed: ${currentStoneDetails.seed}
Color: ${currentStoneDetails.color}
Shape: ${currentStoneDetails.shape}
Rarity: ${currentStoneDetails.rarity}
Hardness: ${currentStoneDetails.hardness.toFixed(2)}
Weight: ${currentStoneDetails.weight}`);
    } else {
      currentStoneInfoBox.setContent("No current stone selected.");
    }
  }
  if (stonePreviewBox && stonePreviewBox.screen) { // Check if part of a screen
    if (currentStoneDetails) {
      const artLines = renderStoneToAscii(currentStoneDetails);
      stonePreviewBox.setContent(artLines.join('\n'));
    } else {
      stonePreviewBox.setContent("{center}Select or generate a stone.{/center}");
    }
  }
  if(screen && screen.focused) screen.render(); // Use screen.focused
}

function showMessage(msg: string, duration: number = 3000) {
    if (messageLine && messageLine.screen) {
        messageLine.setContent(msg);
        if(screen && screen.focused) screen.render(); // Use screen.focused
        if (duration > 0) {
            setTimeout(() => {
                if (messageLine && messageLine.screen && messageLine.getContent() === msg) {
                    messageLine.setContent('');
                    if(screen && screen.focused) screen.render(); // Use screen.focused
                }
            }, duration);
        }
    }
}

function shutdown(exitCode: number = 0) {
  if (currentSaveData) {
    saveData(currentSaveData);
  }
  if (screen) { // Simpler check for screen existence
    screen.destroy();
    // @ts-ignore: screen can be undefined after destroy
    screen = undefined;
  }
  process.exit(exitCode);
}

function showMainMenu() {
  if (inventoryLayout && !inventoryLayout.hidden) inventoryLayout.hide();
  if (mainLayout && mainLayout.screen && !mainLayout.hidden) {
      if(menuListBox && menuListBox.screen) menuListBox.focus();
      if(screen && screen.focused) screen.render(); // Use screen.focused
      return;
  }

  if (!mainLayout || !mainLayout.screen) {
    mainLayout = blessed.layout({
      parent: screen,
      top: 0, left: 0, width: '100%', height: '100%-1'
      // No 'layout' property for manual positioning
    } as any);

    currentStoneInfoBox = blessed.box({
      parent: mainLayout,
      top: 0, left: 0, width: '30%', height: '50%',
      label: 'Stone Info', border: 'line', style: { border: { fg: 'blue' } },
      content: '', tags: true, padding: 1
    });

    stonePreviewBox = blessed.box({
      parent: mainLayout,
      top: 0, left: '30%', width: '70%', height: '90%',
      label: 'Stone Preview', border: 'line', style: { border: { fg: 'blue' } },
      content: '', tags: true, align: 'center', valign: 'middle'
    });

    menuListBox = blessed.list({
      parent: mainLayout,
      label: 'Main Menu',
      bottom: 0, left: 0, width: '30%', height: '50%',
      items: ['Open', 'Salvage', 'Inventory', 'Quit'],
      keys: true, vi: true, mouse: true,
      border: 'line', style: { border: { fg: 'blue' }, selected: { bg: 'green' }, item: { hover: { bg: 'blue'}}},
      tags: true
    });

    if (!messageLine || !messageLine.screen) {
        messageLine = blessed.text({
            parent: screen,
            bottom: 0, left: 0, height: 1, width: '100%',
            content: 'Welcome to Stone-Crafter!', style: { bg: 'grey', fg: 'white' },
            tags: true
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
          showMessage("No current stone to open!");
          if(menuListBox && menuListBox.screen) setTimeout(() => menuListBox.focus(), 0);
          return;
        }
        const openedStoneSeed = currentSaveData.currentStoneSeed;

        currentSaveData.stones = currentSaveData.stones.filter(s => s !== openedStoneSeed);

        const newSeeds: number[] = [];
        const stoneSpecificPrng = mulberry32(openedStoneSeed ^ Date.now());

        const seed1 = generateNewStoneSeed(stoneSpecificPrng);
        newSeeds.push(seed1);
        currentSaveData.stones.push(seed1);

        if (gamePrng() < 0.10) {
          const seed2 = generateNewStoneSeed(stoneSpecificPrng);
          newSeeds.push(seed2);
          currentSaveData.stones.push(seed2);
        }
        if (gamePrng() < 0.01) {
          const seed3 = generateNewStoneSeed(stoneSpecificPrng);
          newSeeds.push(seed3);
          currentSaveData.stones.push(seed3);
        }

        currentSaveData.currentStoneSeed = newSeeds.length > 0 ? newSeeds[0] : (currentSaveData.stones.length > 0 ? currentSaveData.stones[0] : null);

        saveData(currentSaveData);
        updateCurrentStoneDetails();
        refreshCurrentStoneDisplay();
        showMessage(`Opened stone ${openedStoneSeed}. Obtained ${newSeeds.length} new stone(s). First new one is now current.`);
        if(menuListBox && menuListBox.screen) setTimeout(() => menuListBox.focus(), 0);

      } else if (actionText === 'Salvage') {
        if (!currentSaveData.currentStoneSeed || !currentStoneDetails) {
          showMessage("No current stone to salvage!");
          if(menuListBox && menuListBox.screen) setTimeout(() => menuListBox.focus(), 0);
          return;
        }
        const salvagedStoneSeed = currentSaveData.currentStoneSeed;
        const salvageValue = currentStoneDetails.rarity * 10;
        currentSaveData.currency += salvageValue;

        currentSaveData.stones = currentSaveData.stones.filter(s => s !== salvagedStoneSeed);

        if (currentSaveData.stones.length > 0) {
          currentSaveData.currentStoneSeed = currentSaveData.stones[0];
        } else {
          currentSaveData.currentStoneSeed = null;
        }

        saveData(currentSaveData);
        updateCurrentStoneDetails();
        refreshCurrentStoneDisplay();
        showMessage(`Salvaged stone ${salvagedStoneSeed} for ${salvageValue} currency. Current currency: ${currentSaveData.currency}`);
        if(menuListBox && menuListBox.screen) setTimeout(() => menuListBox.focus(), 0);
      }
    });
  }

  if(mainLayout && mainLayout.hidden) mainLayout.show();
  if(messageLine && messageLine.screen) messageLine.setFront();

  updateCurrentStoneDetails();
  refreshCurrentStoneDisplay();
  if(menuListBox && menuListBox.screen) menuListBox.focus();
  if(screen && screen.focused) screen.render(); // Use screen.focused
}

function refreshInventoryPreview() {
    if (!inventoryPreviewBox || !inventoryPreviewBox.screen || !inventoryList || !inventoryList.screen) return;

    const currentInventorySelectionIndex = (inventoryList as any).selected as number; // Cast to any then number

    if (currentSaveData.stones.length > 0 && currentInventorySelectionIndex < currentSaveData.stones.length) {
      const selectedSeed = currentSaveData.stones[currentInventorySelectionIndex];
      const qualities = deriveStoneQualities(selectedSeed);
      const artLines = renderStoneToAscii(qualities);
      inventoryPreviewBox.setContent(artLines.join('\n'));
    } else {
      inventoryPreviewBox.setContent("{center}Inventory is empty or no stone selected.{/center}");
    }
    if(screen && screen.focused) screen.render(); // Use screen.focused
}

function showInventoryMenu() {
  if (!inventoryLayout || !inventoryLayout.screen) {
    inventoryLayout = blessed.layout({
      parent: screen, hidden: true, top: 0, left: 0, width: '100%', height: '100%-1'
      // No 'layout' property for manual positioning
    } as any);

    inventoryList = blessed.list({
      parent: inventoryLayout,
      label: 'Inventory (Enter to Set Current, Esc/Q to Close)',
      top: 0, left: 0, width: '30%', height: '100%',
      items: [],
      keys: true, vi: true, mouse: true, border: 'line',
      style: { border: { fg: 'green' }, selected: { bg: 'blue' }, item: { hover: {bg: 'magenta'}}},
      tags: true
    });

    inventoryPreviewBox = blessed.box({
      parent: inventoryLayout,
      label: 'Selected Stone Preview',
      top: 0, left: '30%', width: '70%', height: '100%',
      border: 'line', style: { border: { fg: 'green' } },
      content: '', tags: true, align: 'center', valign: 'middle'
    });

    inventoryList.on('select item', (itemEl, index) => {
       refreshInventoryPreview();
    });

    inventoryList.on('select', (itemEl, index) => {
        if (currentSaveData.stones.length > 0 && index < currentSaveData.stones.length) {
            currentSaveData.currentStoneSeed = currentSaveData.stones[index];
            saveData(currentSaveData);
            updateCurrentStoneDetails();
        }
        if (inventoryLayout && inventoryLayout.screen) inventoryLayout.hide();
        showMainMenu();
    });


    inventoryList.key(['escape', 'q'], () => {
      if (inventoryLayout && inventoryLayout.screen) inventoryLayout.hide();
      showMainMenu();
    });
  }

  const displayItems = currentSaveData.stones.map(seed => {
      const stone = deriveStoneQualities(seed);
      return `${seed.toString().substring(0,8)}.. - ${stone.color} ${stone.shape} (R${stone.rarity})`;
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
    width: '50%', height: 7, top: 'center', left: 'center',
    label: 'Stone-Crafter (New Player Setup)', border: 'line', keys: true,
    style: { border: { fg: 'green' }, label: { fg: 'green' } }
  });

  blessed.text({
    parent: startMenuForm,
    content: 'Enter initial seed (number) or leave blank for random:',
    top: 1, left: 2
  });

  const seedInput = blessed.textbox({
    parent: startMenuForm,
    name: 'seed',
    inputOnFocus: true,
    top: 2, left: 2, height: 1, width: '90%-4',
    style: { bg: 'blue', focus: { bg: 'cyan' } }
  });

  const startButton = blessed.button({
    parent: startMenuForm,
    name: 'submit',
    content: 'Start Game',
    bottom: 1, left: 2, width: 'shrink', height: 1,
    style: { bg: 'green', focus: { bg: 'lime' } },
    padding: { left: 1, right: 1 }
  });

  seedInput.focus();

  return new Promise<number>((resolve, reject) => {
    startButton.on('press', () => startMenuForm.submit());

    startMenuForm.on('submit', (data) => {
      const seedStr = data.seed || '';
      let seedNum: number;
      if (seedStr.trim() === '') {
        const tempRng = mulberry32(Date.now() + Math.random()*10000); // Math.random() for quick non-determinism
        seedNum = generateNewStoneSeed(tempRng) >>> 0;
        showMessage(`No seed entered. Using random: ${seedNum}`, 5000);
      } else {
        seedNum = parseInt(seedStr, 10);
        if (isNaN(seedNum)) {
          const tempRng = mulberry32(Date.now());
          for(let i=0; i < seedStr.length; i++) tempRng();
          seedNum = generateNewStoneSeed(tempRng) >>> 0;
          showMessage(`Invalid number. Generated one based on text: ${seedNum}`, 5000);
        }
      }
      seedNum = seedNum >>> 0;

      if(startMenuForm.screen) startMenuForm.destroy();
      resolve(seedNum);
    });

    startMenuForm.key(['escape'], () => {
        if(startMenuForm.screen) startMenuForm.destroy();
        reject(new Error("User exited start menu."));
    });
    if(screen && screen.focused) screen.render(); // Use screen.focused
  });
}


async function main() {
  screen = blessed.screen({
    smartCSR: true,
    title: 'Stone-Crafter',
    fullUnicode: true,
  });

  screen.key(['C-c'], () => shutdown(0));

  currentSaveData = loadData();
  gamePrng = mulberry32(Date.now());

  if (currentSaveData.stones.length === 0 && currentSaveData.currentStoneSeed === null) {
    try {
        const initialSeed = await showStartMenu();
        currentSaveData.currentStoneSeed = initialSeed;
        if (!currentSaveData.stones.includes(initialSeed)) {
            currentSaveData.stones.push(initialSeed);
        }
        saveData(currentSaveData);
        showMessage(`Game started with new seed: ${initialSeed}. Your first stone is active.`, 5000);
    } catch (err: any) {
        showMessage(err.message || "Exited during setup.", 2000);
        await new Promise(r => setTimeout(r, 2000));
        shutdown(1);
        return;
    }
  }

  if(currentSaveData.currentStoneSeed === null && currentSaveData.stones.length > 0) {
    currentSaveData.currentStoneSeed = currentSaveData.stones[0];
  } else if (currentSaveData.currentStoneSeed !== null && !currentSaveData.stones.includes(currentSaveData.currentStoneSeed)) {
    currentSaveData.currentStoneSeed = currentSaveData.stones.length > 0 ? currentSaveData.stones[0] : null;
  }

  showMainMenu();
}

// --- Program Entry ---
if (require.main === module) {
  main().catch(err => {
    if (screen) { // Simpler check for screen existence before destroy
        screen.destroy();
        // @ts-ignore
        screen = undefined;
    }
    console.error(chalk.red("Stone-Crafter encountered a critical error:"), err);
    process.exit(1);
  });
}
