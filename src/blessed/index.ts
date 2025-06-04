// src/blessed/index.ts
import blessed from 'blessed';
import { showStartMenu } from './ui/startMenu';
import { showMainGameUI } from './ui/mainGameUI';
import { showMainMenu } from './ui/mainMenu';
import { showInventoryMenu } from './ui/inventoryMenu';
import { showFightUI } from './ui/fightUI'; // Import showFightUI
import { logMessage, showMessage } from '../messageStore';

export const screen = blessed.screen({
  smartCSR: true,
  title: 'Stone Crafter - Blessed Edition',
  fullUnicode: true,
});

function handleQuit() {
    logMessage("Player initiated game quit.");
    screen.destroy();
    process.exit(0);
}

// Global C-c for forced exit
screen.key(['C-c'], () => process.exit(0));

function startGame() {
  const mainContentArea = showMainGameUI();

  const navigateToFight = () => {
    // Clear mainContentArea before showing fight UI
    if (mainContentArea.children.length) {
        mainContentArea.children.forEach(child => child.destroy());
    }
    showFightUI(mainContentArea, () => {
      // This is onFightEnd: re-show main menu
      showMainMenuScreen();
    });
  };

  const navigateToInventory = () => {
    if (mainContentArea.children.length) {
        mainContentArea.children.forEach(child => child.destroy());
    }
    showInventoryMenu(mainContentArea, () => {
      showMainMenuScreen();
    });
  };

  const showMainMenuScreen = () => {
    if (mainContentArea.children.length) {
        mainContentArea.children.forEach(child => child.destroy());
    }
    showMainMenu(mainContentArea, navigateToFight, navigateToInventory, handleQuit);
  };

  showMainMenuScreen(); // Initial call to show main menu within startGame
  screen.render();
}

showStartMenu(startGame); // Initial call to show start menu from the very beginning
