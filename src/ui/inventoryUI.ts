import * as blessed from 'blessed';
import { GameState, Stone } from '../types';
import { drawStoneShape, renderGrid } from '../core/drawing';

export function showInventoryScreen(gameState: GameState, globalSeed: string): Promise<void> {
  return new Promise<void>((resolve) => {
    const screen = blessed.screen({
      smartCSR: true,
      fullUnicode: true,
      title: 'Stone Inventory',
    });

    // Main layout box (optional, but can help structure)
    // const mainLayout = blessed.box({
    //   parent: screen,
    //   top: 0, left: 0, width: '100%', height: '100%',
    // });

    const stoneListBox = blessed.list({
      parent: screen, // mainLayout
      top: 0,
      left: 0,
      width: '30%',
      height: '90%',
      keys: true,
      vi: true,
      mouse: true,
      border: 'line',
      label: ' Stones ',
      style: {
        fg: 'white',
        border: { fg: 'cyan' },
        selected: { bg: 'blue', fg: 'white' },
        item: { hover: { bg: 'green' } },
      },
      scrollbar: {
        ch: ' ',
        track: { bg: 'grey' },
        style: { bg: 'cyan' }
      }
    });

    const helpBox = blessed.box({
      parent: screen, // mainLayout
      top: '90%',
      left: 0,
      width: '30%',
      height: '10%',
      border: 'line',
      label: ' Help ',
      content: '↑/↓ Navigate | Q/Esc Exit',
      style: { fg: 'yellow', border: { fg: 'cyan' } },
      align: 'center',
    });

    const detailContainer = blessed.box({
      parent: screen, // mainLayout
      top: 0,
      left: '30%',
      width: '70%',
      height: '100%',
      border: 'line',
      label: ' Selected Stone Details ',
      style: { fg: 'white', border: { fg: 'cyan' } },
    });

    const stoneDrawingBox = blessed.box({
      parent: detailContainer,
      top: 1,
      left: 1,
      width: 62, // 60 characters + 2 for border of this box if it had one
      height: 32, // Approx half of 60 for aspect ratio, allows 30 lines of text + padding
      content: '',
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: ' ',
        track: { bg: 'grey' },
        style: { bg: 'blue' },
      },
      style: { fg: 'white' }, // Text color for the drawing
    });

    const stoneInfoBox = blessed.box({
      parent: detailContainer,
      top: 33, // Immediately below stoneDrawingBox (1 top + 32 height)
      left: 1,
      right: 1, // blessed specific: right padding/offset
      bottom: 1, // blessed specific: bottom padding/offset
      content: '',
      scrollable: true,
      scrollbar: {
        ch: ' ',
        track: { bg: 'grey' },
        style: { bg: 'blue' },
      },
      style: { fg: 'white' },
    });

    const stoneItems = gameState.stones.map(
      (stone, index) => `[${index + 1}] ${stone.properties.color} ${stone.properties.shape} (R: ${stone.properties.rarity}, ID: ${stone.id})`
    );
    stoneListBox.setItems(stoneItems);

    function updateDetails(index: number): void {
      if (index < 0 || index >= gameState.stones.length) {
        stoneDrawingBox.setContent('');
        stoneInfoBox.setContent('No stone selected or inventory empty.');
        screen.render();
        return;
      }

      const stone = gameState.stones[index];
      if (stone) {
        const grid = drawStoneShape(stone, globalSeed);
        const renderedStone = renderGrid(grid);
        stoneDrawingBox.setContent(renderedStone);
        stoneDrawingBox.setScrollPerc(0); // Reset scroll to top

        let createdAtDisplay = `Order: ${stone.createdAt}`;
        if (stone.createdAt > 100000) { // Heuristic: if it's a large number, it's likely a timestamp
            createdAtDisplay = `Created: ${new Date(stone.createdAt * 1000).toLocaleString()}`;
        }


        stoneInfoBox.setContent(
          `ID: ${stone.id}\n` +
          `Shape: ${stone.properties.shape}\n` +
          `Color: ${stone.properties.color}\n` +
          `Weight: ${stone.properties.weight}\n` +
          `Hardness: ${stone.properties.hardness}\n` +
          `Rarity: ${stone.properties.rarity}\n` +
          createdAtDisplay
        );
        stoneInfoBox.setScrollPerc(0); // Reset scroll
      } else {
        stoneDrawingBox.setContent('');
        stoneInfoBox.setContent('No stone selected or inventory empty.');
      }
      screen.render();
    }

    stoneListBox.on('select item', (item, index) => {
      updateDetails(index);
    });

    // Initial selection and display
    if (gameState.stones.length > 0) {
        stoneListBox.select(0);
        updateDetails(0);
    } else {
        updateDetails(-1); // Show empty state
    }


    screen.key(['escape', 'q'], () => {
      screen.destroy();
      resolve();
    });

    stoneListBox.focus();
    screen.render();
  });
}
