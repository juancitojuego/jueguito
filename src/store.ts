// src/store.ts

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { StoneQualities } from './stone'; // Import StoneQualities

// --- Interfaces ---
export interface SaveData {
  stones: StoneQualities[]; // Array of StoneQualities objects
  currency: number;
  currentStoneSeed: number | null; // Seed of the currently active stone, or null
  gameSeed: number | null;
  opponents_index: number;
  salt: string;
}

// --- Constants ---
const SAVE_FILE_NAME = '.stone-crafter.json';
const SAVE_PATH = path.join(os.homedir(), SAVE_FILE_NAME);

// --- Default State ---
export function getDefaultSaveData(): SaveData {
  return {
    stones: [],
    currency: 0,
    currentStoneSeed: null,
    gameSeed: null,
    opponents_index: 0,
    salt: 'StoneArenaSaltValueV1',
  };
}

// --- Load and Save Functions ---

/**
 * Loads game data from the save file.
 * If the file doesn't exist or is corrupted, returns default save data.
 * @returns The loaded (or default) SaveData.
 */
export function loadData(): SaveData {
  const defaults = getDefaultSaveData();
  try {
    if (fs.existsSync(SAVE_PATH)) {
      const fileContent = fs.readFileSync(SAVE_PATH, 'utf-8');
      const parsedData = JSON.parse(fileContent) as Partial<SaveData>;

      const loadedStones: StoneQualities[] = [];
      if (Array.isArray(parsedData.stones)) {
        for (const s of parsedData.stones) {
          if (
            s &&
            typeof s === 'object' &&
            typeof s.seed === 'number' &&
            !isNaN(s.seed) &&
            typeof s.createdAt === 'number' &&
            !isNaN(s.createdAt) &&
            typeof s.color === 'string' &&
            typeof s.shape === 'string' &&
            typeof s.rarity === 'number' &&
            !isNaN(s.rarity) &&
            typeof s.weight === 'number' &&
            !isNaN(s.weight) &&
            typeof s.hardness === 'number' &&
            !isNaN(s.hardness) &&
            typeof s.magic === 'number' &&
            !isNaN(s.magic)
          ) {
            loadedStones.push(s as StoneQualities);
          }
        }
      }

      const currency =
        typeof parsedData.currency === 'number' && !isNaN(parsedData.currency)
          ? parsedData.currency
          : defaults.currency;

      const gameSeed =
        (typeof parsedData.gameSeed === 'number' && !isNaN(parsedData.gameSeed)) || parsedData.gameSeed === null
          ? parsedData.gameSeed
          : defaults.gameSeed;

      const opponents_index =
        typeof parsedData.opponents_index === 'number' && !isNaN(parsedData.opponents_index)
          ? parsedData.opponents_index
          : defaults.opponents_index;

      const salt = typeof parsedData.salt === 'string' ? parsedData.salt : defaults.salt;

      let currentStoneSeed: number | null = null;
      if (
        (typeof parsedData.currentStoneSeed === 'number' && !isNaN(parsedData.currentStoneSeed)) ||
        parsedData.currentStoneSeed === null
      ) {
        currentStoneSeed = parsedData.currentStoneSeed;
      }

      let validatedCurrentStoneSeed: number | null = null;
      if (currentStoneSeed !== null && loadedStones.some((s) => s.seed === currentStoneSeed)) {
        validatedCurrentStoneSeed = currentStoneSeed;
      } else if (loadedStones.length > 0) {
        validatedCurrentStoneSeed = loadedStones[0].seed;
      }

      loadedStones.sort((a, b) => a.createdAt - b.createdAt); // Sort by createdAt, oldest first

      return {
        stones: loadedStones,
        currency,
        currentStoneSeed: validatedCurrentStoneSeed,
        gameSeed,
        opponents_index,
        salt,
      };
    } else {
      return defaults;
    }
  } catch (error) {
    return defaults;
  }
}

/**
 * Saves the provided game data to the save file.
 * Performs basic validation on the data before saving.
 * Throws an error if saving to the file system fails, which should be handled by the caller.
 *
 * @param data The SaveData object to save.
 * @throws Error if file system operations fail during saving.
 */
export function saveData(data: SaveData): void {
  try {
    const cleanData: SaveData = {
      stones: data.stones.filter(
        (
          s // Basic validation for stone objects before saving
        ) =>
          s &&
          typeof s === 'object' &&
          typeof s.seed === 'number' &&
          !isNaN(s.seed) &&
          typeof s.createdAt === 'number' &&
          !isNaN(s.createdAt)
        // Add other essential field checks if necessary
      ),
      currency: typeof data.currency === 'number' && !isNaN(data.currency) ? data.currency : 0,
      currentStoneSeed:
        (typeof data.currentStoneSeed === 'number' && !isNaN(data.currentStoneSeed)) || data.currentStoneSeed === null
          ? data.currentStoneSeed
          : null,
      gameSeed:
        (typeof data.gameSeed === 'number' && !isNaN(data.gameSeed)) || data.gameSeed === null ? data.gameSeed : null,
      opponents_index:
        typeof data.opponents_index === 'number' && !isNaN(data.opponents_index) ? data.opponents_index : 0,
      salt: typeof data.salt === 'string' ? data.salt : getDefaultSaveData().salt,
    };

    const dataString = JSON.stringify(cleanData, null, 2);
    fs.writeFileSync(SAVE_PATH, dataString, 'utf-8');
  } catch (error) {
    // console.error("Error saving game data:", error); // Original line
    // Re-throw the error so the caller can handle it (e.g., for logging)
    if (error instanceof Error) {
      throw new Error(`Failed to save game data: ${error.message}`);
    } else {
      throw new Error(`Failed to save game data due to an unknown error.`);
    }
  }
}
