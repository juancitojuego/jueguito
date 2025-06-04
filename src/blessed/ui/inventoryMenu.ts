// src/blessed/ui/inventoryMenu.ts
import blessed from 'blessed';
import { screen } from '../index';
import { gameState, equipStone, equippedStoneDetails } from '../../store';
import { calculateStonePower } from '../../stone';
import type { StoneQualities } from '../../interfaces';
import { showMessage, logMessage } from '../../messageStore';
import { gameStateManagerInstance } from '../../services/serviceInstances';

function formatStoneForList(stone: StoneQualities, isEquipped: boolean): string {
  const equippedMarker = isEquipped ? '{green-fg}[EQUIPPED]{/green-fg} ' : '';
  return `${equippedMarker}${blessed.helpers.escape(stone.name || `Stone ${stone.seed}`)} (R: ${stone.rarity}, P: ${calculateStonePower(stone)}, ID: ${stone.seed})`;
}

export function showInventoryMenu(
  parent: blessed.Widgets.Box,
  onBack: () => void
) {
  if (parent.children.length) {
    parent.children.forEach(child => child.destroy());
  }

  const inventoryContainer = blessed.box({
    parent: parent,
    label: 'Inventory - Select (Enter) or Esc to go back',
    top: 0, left: 0, width: '100%', height: '100%',
    border: 'line',
    style: { border: { fg: 'yellow' }, label: { fg: 'white' } },
    keys: true,
  });

  const stoneList = blessed.list({
    parent: inventoryContainer,
    top: 0, left: 0, width: '100%-2', height: '100%-2',
    items: [],
    keys: true, mouse: true, vi: true, tags: true,
    border: { type: 'none' },
    scrollbar: { ch: ' ', inverse: true },
    style: { selected: { bg: 'blue', fg: 'white' }, item: { fg: 'white' } }
  });

  const populateList = () => {
    if (inventoryContainer.detached) return;

    const equippedId = equippedStoneDetails()?.seed;
    const stoneItems = gameState.stones.map(stone => formatStoneForList(stone, stone.seed === equippedId));
    if (stoneItems.length === 0) {
      stoneList.setItems([' {center}Inventory is empty.{/center} ']);
    } else {
      stoneList.setItems(stoneItems);
    }
    screen.render();
  };

  populateList();

  const unsubscribe = gameStateManagerInstance.subscribe(populateList);

  stoneList.on('select', async (item, index) => {
    if (gameState.stones.length === 0) return;
    const selectedStone = gameState.stones[index];
    if (selectedStone) {
      const currentlyEquipped = equippedStoneDetails();
      if (currentlyEquipped?.seed === selectedStone.seed) {
        showMessage(`${selectedStone.name || `Stone ${selectedStone.seed}`} is already equipped.`, 2000, 'info');
      } else {
        equipStone(selectedStone.seed);
        logMessage(`Equipped stone: ${selectedStone.seed} from inventory.`);
        showMessage(`Equipped: ${selectedStone.name || `Stone ${selectedStone.seed}`}`, 2000, 'success');
      }
    }
    stoneList.focus();
  });

  const handleGoBack = () => {
    if (unsubscribe) {
      unsubscribe();
    }
    onBack();
  };

  stoneList.key('escape', handleGoBack);
  inventoryContainer.on('element keypress', (el, ch, key) => {
    if (key.name === 'escape' && el === inventoryContainer) {
        handleGoBack();
    }
  });

  inventoryContainer.focus();
  parent.append(inventoryContainer);
  screen.render();

  return inventoryContainer;
}
