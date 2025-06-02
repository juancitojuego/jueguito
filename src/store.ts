import { createSignal, Accessor, Setter } from 'solid-js';
import { createStore, SetStoreFunction, Store, produce } from 'solid-js/store';
import seedrandom from 'seedrandom';
import { StoneQualities, createStone, generateNewStoneSeed } from './stone'; // Assuming stone.ts is in the same dir or path is adjusted

// --- Type Definitions ---
export interface Message {
  text: string;
  type: 'info' | 'error' | 'success';
  duration?: number;
}

// Opponent interface is already here
export interface Opponent {
  id: string; // Could be a unique seed or generated ID
  name: string;
  stones: StoneQualities[]; // Opponents have one or more stones
  dialogue?: string;
}

// SaveData interface is already here
export interface SaveData {
  playerName: string;
  stones: StoneQualities[];
  equippedStone: StoneQualities | null;
  wins: number;
  losses: number;
  currency: number;
  gameSeed: number | null;
  opponents_index: number;
  salt: string;
  gameVersion: string;
}

// --- Default State ---
export function getDefaultSaveData(): SaveData {
  return {
    playerName: '',
    stones: [],
    equippedStone: null,
    wins: 0,
    losses: 0,
    currency: 0,
    gameSeed: null,
    opponents_index: 0,
    salt: 'StoneCrafterSaltValueV1.SolidJS',
    gameVersion: '1.0.0',
  };
}

// --- SolidJS Reactive State ---
const [currentSaveData, setCurrentSaveData] = createStore<SaveData>(getDefaultSaveData());
const [currentStoneDetails, setCurrentStoneDetails] = createSignal<StoneQualities | null>(
  currentSaveData.equippedStone
);
const [opponentQueue, setOpponentQueue] = createStore<Opponent[]>([]);
const [consoleLogMessages, setConsoleLogMessages] = createSignal<string[]>([]);
const [currentMessage, setCurrentMessage] = createSignal<Message | null>(null);

// --- Game PRNG ---
let gamePrngInstance: seedrandom.PRNG | null = null;

export function initializeGamePrng(seed: string | number): void {
  gamePrngInstance = seedrandom(seed.toString());
  console.log(`Game PRNG initialized with seed: ${seed}`); // Use console.log to avoid circular dependency with utils.ts
}

export function getGamePrng(): seedrandom.PRNG {
  if (!gamePrngInstance) {
    console.warn("Warning: Game PRNG accessed before initialization. Initializing with random seed (Date.now()).");
    initializeGamePrng(Date.now().toString());
  }
  return gamePrngInstance!;
}

// --- Game Logic Functions adapted for SolidJS Store ---

/**
 * Adds a stone to the player's inventory and sorts it.
 * @param stone The StoneQualities object to add.
 */
export function addStoneToInventory(stone: StoneQualities): void {
  setCurrentSaveData(
    produce(s => {
      s.stones.push(stone);
      s.stones.sort((a, b) => a.createdAt - b.createdAt); // Sort by createdAt, oldest first
    })
  );
  // Caller should handle UI logging (e.g., logMessage(`Added stone ${stone.seed} to inventory.`))
  // Caller should handle saving data if needed (saveData())
}

/**
 * Generates a new queue of opponents.
 * @param count Number of opponents to generate.
 * @param prng The PRNG instance to use (should be getGamePrng()).
 */
export function generateOpponentList(count: number = 100): void {
  console.log(`Generating new opponent list with ${count} opponents.`); // store-internal log
  const newOpponents: Opponent[] = [];
  const prng = getGamePrng(); // Ensure PRNG is available
  for (let i = 0; i < count; i++) {
    const opponentStoneSeed = generateNewStoneSeed(prng);
    const opponentStone = createStone(opponentStoneSeed);
    // For simplicity, opponent name can be derived or randomized
    const opponentName = `Opponent #${i + 1} (Stone: ${opponentStone.seed.toString().slice(-4)})`;
    newOpponents.push({
      id: opponentStone.seed.toString(), // Use stone seed as ID for simplicity
      name: opponentName,
      stones: [opponentStone], // For now, opponents have one stone
    });
  }
  setOpponentQueue(newOpponents);
  setCurrentSaveData('opponents_index', 0); // Reset index when new queue is generated
  console.log(`Generated ${newOpponents.length} new opponents for the queue.`);
  // Caller should handle UI logging and saving data
}

/**
 * Gets the current opponent from the queue.
 * Regenerates queue if index is out of bounds.
 * @returns The current Opponent object or null if queue is empty.
 */
export function getCurrentOpponent(): Opponent | null {
  if (currentSaveData.opponents_index >= opponentQueue.length && opponentQueue.length > 0) {
    console.log( // store-internal log
      `Opponent index ${currentSaveData.opponents_index} is out of bounds. Regenerating opponent queue.`
    );
    generateOpponentList(); // Regenerate with default count
    // generateOpponentList already resets the index and logs
    // Caller should handle saving data
  }

  if (opponentQueue.length > 0 && currentSaveData.opponents_index < opponentQueue.length) {
    return opponentQueue[currentSaveData.opponents_index];
  }

  // If queue is empty even after potential regeneration or initial call
  if (opponentQueue.length === 0) {
     console.log("Opponent queue is empty. Attempting to generate new one.");
     generateOpponentList();
     if (opponentQueue.length > 0 && currentSaveData.opponents_index < opponentQueue.length) {
        return opponentQueue[currentSaveData.opponents_index];
     }
  }
  console.log('Opponent queue is empty or index is out of bounds, and no regeneration occurred or was effective.');
  return null;
}


// --- Persistence Functions ---
const LOCAL_STORAGE_KEY = 'stoneCrafterSave.solidJs';

export const saveData = () => {
  try {
    const dataString = JSON.stringify(currentSaveData);
    localStorage.setItem(LOCAL_STORAGE_KEY, dataString);
    // console.log('Game data saved.'); // Caller can use logMessage from utils for UI feedback
  } catch (error) {
    console.error('Failed to save game data:', error);
    // Avoid direct UI update from here to prevent circular deps
    // Caller should use showMessage or logMessage
  }
};

export const loadData = () => {
  try {
    const savedGameString = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedGameString) {
      const parsedData = JSON.parse(savedGameString) as Partial<SaveData>;
      const defaults = getDefaultSaveData();
      const validatedData: SaveData = { ...defaults, ...parsedData,
        stones: Array.isArray(parsedData.stones) ? parsedData.stones.map(s => ({...s})) : defaults.stones,
        equippedStone: parsedData.equippedStone ? {...parsedData.equippedStone} : defaults.equippedStone,
      };
      setCurrentSaveData(validatedData);
      setCurrentStoneDetails(validatedData.equippedStone);
      // Initialize opponent queue if game is loaded and queue is empty
      if (validatedData.gameSeed !== null && opponentQueue.length === 0) {
        // Need to ensure PRNG is initialized before generating opponents
        if (gamePrngInstance === null) initializeGamePrng(validatedData.gameSeed);
        generateOpponentList();
      }
    } else {
      setCurrentSaveData(getDefaultSaveData());
      setCurrentStoneDetails(getDefaultSaveData().equippedStone);
    }
  } catch (error) {
    console.error('Failed to load game data:', error);
    setCurrentSaveData(getDefaultSaveData());
    setCurrentStoneDetails(getDefaultSaveData().equippedStone);
  }
};

// --- Exports ---
export {
  currentSaveData,
  setCurrentSaveData,
  currentStoneDetails,
  setCurrentStoneDetails,
  opponentQueue,
  // setOpponentQueue is not exported, managed by generateOpponentList
  consoleLogMessages,
  setConsoleLogMessages,
  currentMessage,
  setCurrentMessage,
};

// Initialize by loading data when the store is first imported
loadData();
