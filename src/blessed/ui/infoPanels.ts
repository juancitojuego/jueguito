// src/blessed/ui/infoPanels.ts
import blessed from 'blessed';
import { screen } from '../index';
import { gameState, equippedStoneDetails, currentOpponentStore } from '../../store';
import type { StoneQualities } from '../../interfaces';
import { calculateStonePower } from '../../stone';
import { gameStateManagerInstance } from '../../services/serviceInstances';

function formatStoneDetails(stone: StoneQualities | null): string {
  if (!stone) return 'No Stone';
  return `{bold}${stone.name || `Stone ${stone.seed}`}{/bold}\nType: ${stone.color} ${stone.shape}\nRarity: ${stone.rarity}\nPower: ${calculateStonePower(stone)}`;
}

export function createPlayerStatsBox(parentContext: blessed.Widgets.NodeWithEvents | blessed.Widgets.Screen = screen) {
  const box = blessed.box({
    parent: parentContext,
    label: 'Player Stats',
    left: 0,
    top: 0,
    width: '25%',
    height: 5, // Fixed height
    border: 'line',
    tags: true,
    content: '',
  });

  const update = () => {
    box.setContent(`Name: ${gameState.playerStats.name}\nCurrency: ${gameState.currency}`);
    screen.render();
  };

  gameStateManagerInstance.subscribe(update);
  update(); // Initial content
  return { element: box, update };
}

export function createEquippedStoneBox(parentContext: blessed.Widgets.NodeWithEvents | blessed.Widgets.Screen = screen) {
  const box = blessed.box({
    parent: parentContext,
    label: 'Equipped Stone',
    left: '25%',
    top: 0,
    width: '40%',
    height: 5, // Fixed height
    border: 'line',
    tags: true,
    content: '',
  });

  const update = () => {
    const stone = equippedStoneDetails();
    box.setContent(formatStoneDetails(stone));
    screen.render();
  };

  gameStateManagerInstance.subscribe(update);
  update(); // Initial content
  return { element: box, update };
}

export function createOpponentStoneBox(parentContext: blessed.Widgets.NodeWithEvents | blessed.Widgets.Screen = screen) {
  const box = blessed.box({
    parent: parentContext,
    label: 'Current Opponent',
    left: '65%',
    top: 0,
    width: '35%',
    height: 5, // Fixed height
    border: 'line',
    tags: true,
    content: '',
  });

  const update = () => {
    const opponent = currentOpponentStore();
    box.setContent(formatStoneDetails(opponent));
    screen.render();
  };

  gameStateManagerInstance.subscribe(update);
  update(); // Initial content
  return { element: box, update };
}
