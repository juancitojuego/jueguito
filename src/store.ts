// src/store.ts

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// --- Interfaces ---
export interface SaveData {
  stones: number[]; // Array of 32-bit integer stone seeds
  currency: number;
  currentStoneSeed: number | null; // Seed of the currently active stone, or null
}

// --- Constants ---
const SAVE_FILE_NAME = '.stone-crafter.json';
// For testing, one might use a local path, but for actual use, os.homedir() is correct.
// const SAVE_PATH = path.join(process.cwd(), SAVE_FILE_NAME); // For easier local testing if needed
const SAVE_PATH = path.join(os.homedir(), SAVE_FILE_NAME);

// --- Default State ---
export function getDefaultSaveData(): SaveData {
  return {
    stones: [],
    currency: 0,
    currentStoneSeed: null,
  };
}

// --- Load and Save Functions ---

/**
 * Loads game data from the save file.
 * If the file doesn't exist or is corrupted, returns default save data.
 * @returns The loaded (or default) SaveData.
 */
export function loadData(): SaveData {
  try {
    if (fs.existsSync(SAVE_PATH)) {
      const fileContent = fs.readFileSync(SAVE_PATH, 'utf-8');
      const parsedData = JSON.parse(fileContent) as Partial<SaveData>; // Use Partial for validation

      // Validate parsed data structure
      const stones = Array.isArray(parsedData.stones) ? parsedData.stones.filter(s => typeof s === 'number' && !isNaN(s)) : [];
      const currency = typeof parsedData.currency === 'number' && !isNaN(parsedData.currency) ? parsedData.currency : 0;

      // Validate currentStoneSeed: must be a number or null, and not NaN
      let currentStoneSeed: number | null = null;
      if (typeof parsedData.currentStoneSeed === 'number' && !isNaN(parsedData.currentStoneSeed)) {
        currentStoneSeed = parsedData.currentStoneSeed;
      } else if (parsedData.currentStoneSeed === null) {
        currentStoneSeed = null;
      }

      // Ensure currentStoneSeed is valid (exists in stones array) or set to a sensible default.
      let validatedCurrentStoneSeed: number | null = null;
      if (currentStoneSeed !== null && stones.includes(currentStoneSeed)) {
        validatedCurrentStoneSeed = currentStoneSeed;
      } else if (stones.length > 0) {
        // If currentStoneSeed is invalid or was null, and stones exist, default to the first stone.
        validatedCurrentStoneSeed = stones[0];
      }
      // If stones is empty, validatedCurrentStoneSeed remains null.


      return {
        stones,
        currency,
        currentStoneSeed: validatedCurrentStoneSeed
      };
    } else {
      // console.log("No save file found. Starting with default data.");
      return getDefaultSaveData();
    }
  } catch (error) {
    // console.error("Error loading save data:", error);
    // console.log("Starting with default data due to error.");
    return getDefaultSaveData();
  }
}

/**
 * Saves the provided game data to the save file.
 * @param data The SaveData object to save.
 */
export function saveData(data: SaveData): void {
  try {
    // Ensure all data being saved is valid, especially numbers (no NaN)
    const cleanData: SaveData = {
        stones: data.stones.filter(s => typeof s === 'number' && !isNaN(s)),
        currency: (typeof data.currency === 'number' && !isNaN(data.currency)) ? data.currency : 0,
        currentStoneSeed: (typeof data.currentStoneSeed === 'number' && !isNaN(data.currentStoneSeed)) ? data.currentStoneSeed : null
    };

    const dataString = JSON.stringify(cleanData, null, 2); // Pretty-print with 2-space indent
    fs.writeFileSync(SAVE_PATH, dataString, 'utf-8');
    // console.log("Game data saved successfully to:", SAVE_PATH);
  } catch (error) {
    // console.error("Error saving game data:", error);
    // In a real game, might want to notify user or attempt backup.
  }
}
