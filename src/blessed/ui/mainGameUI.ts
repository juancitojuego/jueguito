// src/blessed/ui/mainGameUI.ts
import blessed from 'blessed';
import { screen } from '../index';
import { createPlayerStatsBox, createEquippedStoneBox, createOpponentStoneBox } from './infoPanels';
import { createMessageLine, createConsoleLog } from './messageLog';

export function showMainGameUI() {
  // Clear previous UI elements from the screen
  let child;
  while ((child = screen.children[screen.children.length - 1])) {
    child.destroy();
  }

  const mainContainer = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  });

  const topPanel = blessed.box({
    parent: mainContainer,
    top: 0,
    left: 0,
    width: '100%',
    height: 5,
  });
  createPlayerStatsBox(topPanel);
  createEquippedStoneBox(topPanel);
  createOpponentStoneBox(topPanel);

  const contentArea = blessed.box({
    parent: mainContainer,
    label: 'Interactive Area',
    top: 5,
    left: 0,
    width: '100%',
    height: '100%-11', // Total height - topPanel height - bottomPanel height
    border: 'line',
    tags: true,
  });

  const bottomPanel = blessed.box({
    parent: mainContainer,
    bottom: 0,
    left: 0,
    width: '100%',
    height: 6, // For message line (1) + console log (5 with border)
  });
  createMessageLine(bottomPanel);
  createConsoleLog(bottomPanel);

  screen.render();

  return contentArea;
}
