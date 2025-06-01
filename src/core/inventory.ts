import * as fs from 'fs/promises';
import { GameState, Stone } from '../types'; // SeedProperties is part of GameState

const SAVE_FILE_NAME = "game_save.json";

export async function saveGame(gameState: GameState): Promise<void> {
  try {
    const data = JSON.stringify(gameState, null, 2); // Pretty print JSON
    await fs.writeFile(SAVE_FILE_NAME, data, 'utf8');
    console.log("Game state saved successfully.");
  } catch (error) {
    console.error("Error saving game state:", error);
    // Depending on the game design, we might want to throw this error
    // or handle it more gracefully (e.g., notify the player without crashing).
  }
}

export async function loadGame(): Promise<GameState | null> {
  try {
    const data = await fs.readFile(SAVE_FILE_NAME, 'utf8');
    const parsedData = JSON.parse(data);

    // Basic validation (more could be added, e.g., using a schema validator)
    if (
      typeof parsedData.seed === 'string' &&
      typeof parsedData.seedProperties === 'object' && // Add more checks for seedProperties if needed
      Array.isArray(parsedData.stones) &&
      typeof parsedData.nextStoneIdCounter === 'number'
    ) {
      const gameState: GameState = {
        seed: parsedData.seed,
        seedProperties: parsedData.seedProperties,
        stones: parsedData.stones as Stone[], // Assuming stones are correctly formatted
        nextStoneIdCounter: parsedData.nextStoneIdCounter,
      };

      // Ensure stones are sorted by createdAt (as a safety measure)
      gameState.stones.sort((a, b) => a.createdAt - b.createdAt);

      console.log("Game state loaded successfully.");
      return gameState;
    } else {
      console.error("Invalid save file structure. Starting a new game.");
      return null;
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log("No save file found. Starting a new game.");
    } else {
      console.error("Error loading game state:", error);
      console.log("Could not load save data. Starting a new game.");
    }
    return null;
  }
}
