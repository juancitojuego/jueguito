import {
  promptForSeed,
  initializeRNG,
  generateSeedProperties,
  displaySeedProperties,
} from './core/seed';
import { openStone } from './core/stone';
import { loadGame, saveGame } from './core/inventory';
import { GameState, RNG, Stone, SeedProperties } from './types';
import { showInventoryScreen } from './ui/inventoryUI';
import { displayMainMenuOptions, promptMenuChoice, promptForKeyPress } from './ui/menu';

async function main() {
  let globalRNG: RNG;
  let currentGameState: GameState;

  // Clear console at the very start
  console.clear();
  const loadedState = await loadGame();

  if (loadedState) {
    currentGameState = loadedState;
    globalRNG = initializeRNG(currentGameState.seed);

    // Advance RNG state to reflect existing seed properties.
    // This ensures that if generateSeedProperties itself uses RNG beyond what's saved in its direct output,
    // that RNG usage is accounted for before further game actions.
    // Our current generateSeedProperties uses the RNG to pick color/shape etc.
    // These are saved in seedProperties. So, we call it to advance the RNG state.
    const _ = generateSeedProperties(currentGameState.seed, globalRNG);

    console.log("Loaded game from save file.");
    // displaySeedProperties(currentGameState.seedProperties); // Displayed in menu now
    // console.log("\n--- Current Inventory ---"); // Not shown on load, accessed via menu
    // currentGameState.stones.forEach(stone => {
    //   console.log(`Stone ID: ${stone.id}, Color: ${stone.properties.color}, Shape: ${stone.properties.shape}, Weight: ${stone.properties.weight}, Hardness: ${stone.properties.hardness}, Rarity: ${stone.properties.rarity}, CreatedAt: ${stone.createdAt}`);
    // });
    // console.log("Next stone ID will be:", currentGameState.nextStoneIdCounter + 1);
    console.log("----------------------\n");
    await promptForKeyPress("Press Enter to continue to the main menu...");

  } else {
    const seed = await promptForSeed();
    globalRNG = initializeRNG(seed);
    const seedProps = generateSeedProperties(seed, globalRNG);

    currentGameState = {
      seed: seed,
      seedProperties: seedProps,
      stones: [],
      nextStoneIdCounter: 0,
    };
    // displaySeedProperties(currentGameState.seedProperties); // Displayed in menu
    await saveGame(currentGameState);
    console.log("New game started and initial state saved.");
    await promptForKeyPress("Press Enter to continue to the main menu...");
  }

  let running = true;
  while (running) {
    console.clear();
    displayMainMenuOptions(currentGameState.seedProperties);
    const choice = await promptMenuChoice();

    switch (choice) {
      case '1': // Open a stone package
        console.clear();
        const { newStones, nextStoneIdCounter } = openStone(globalRNG, currentGameState.nextStoneIdCounter);
        if (newStones.length > 0) {
          currentGameState.stones.push(...newStones);
          currentGameState.nextStoneIdCounter = nextStoneIdCounter;
          console.log(`You opened a stone package and found ${newStones.length} new stone(s):`);
          newStones.forEach((stone, idx) => {
            let createdAtDisplay = `Order: ${stone.createdAt}`;
            if (stone.createdAt > 100000) { // Heuristic for timestamp
                createdAtDisplay = `Created: ${new Date(stone.createdAt * 1000).toLocaleDateString()}`;
            }
            console.log(`  Stone ${idx + 1}: ${stone.properties.color} ${stone.properties.shape}, Rarity ${stone.properties.rarity}`);
            console.log(`           (ID: ${stone.id}, ${createdAtDisplay})`);
          });
          await saveGame(currentGameState);
        } else {
          console.log("No new stones found in this package.");
        }
        await promptForKeyPress("Press Enter to return to the menu...");
        break;

      case '2': // View inventory
        console.clear();
        if (currentGameState.stones.length === 0) {
          console.log("Your inventory is empty. Try opening some stones first!");
          await promptForKeyPress("Press Enter to return to the menu...");
        } else {
          // Blessed will take over the screen. It should clear itself on exit.
          await showInventoryScreen(currentGameState, currentGameState.seed);
          // After blessed exits, the console might need a clear before showing the menu again.
          // The loop will call console.clear() anyway.
        }
        break;

      case '3': // Exit game
        console.clear();
        await saveGame(currentGameState); // Save one last time
        console.log("Game saved. Thank you for playing Idle Stone Collector!");
        running = false;
        // Allow a moment for the message to be read before full exit.
        await new Promise(resolve => setTimeout(resolve, 1500));
        break;

      default:
        console.clear();
        console.log("Invalid choice. Please select an option from the menu.");
        await promptForKeyPress("Press Enter to continue...");
        break;
    }
  }
  // End of game loop
  console.clear(); // Final clear before exiting application
  console.log("Exited Idle Stone Collector.");
}

main().catch(error => {
  console.error("An unexpected error occurred in main:", error);
  // Optionally, add a key press before exiting on error too
  promptForKeyPress("An error occurred. Press Enter to exit...").then(() => {
      process.exit(1);
  });
});
