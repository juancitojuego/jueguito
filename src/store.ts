// src/store.ts
import { createStore, reconcile } from 'solid-js/store';
import { createMemo } from 'solid-js';
import { gameStateManagerInstance } from '../services/serviceInstances';
import type { GameState, StoneQualities } from '../interfaces'; // Assuming barrel file for interfaces

// --- UI Specific State (Kept from original store or utils.ts) ---
// Assuming logMessage and showMessage (and their state signals consoleLogMessages, currentMessage)
// are now primarily managed and exported from utils.ts.
// If they need to be re-exported by this store, import them from utils.
export { consoleLogMessages, currentMessage, setConsoleLogMessages, setCurrentMessage } from '../utils'; // Example re-export

// --- Game State Management via GameStateManager ---

// Create a SolidJS store that mirrors the GameStateManager's state
const [gameState, setGameState] = createStore<GameState>(gameStateManagerInstance.getCurrentState());

// Subscribe to GameStateManager updates and reconcile the local store
gameStateManagerInstance.subscribe((newState) => {
  setGameState(reconcile(newState));
});

// Export the reactive gameState
export { gameState };

// --- Derived Memos for UI Convenience ---
export const equippedStoneDetails = createMemo(() => gameStateManagerInstance.getEquippedStoneDetails());
export const currentOpponentStore = createMemo(() => gameStateManagerInstance.getCurrentOpponent()); // Renamed to avoid conflict if 'currentOpponent' is a common var name

// --- Actions that call GameStateManager methods (re-exporting functionality) ---

export const loadGame = async (options?: { newGameSeed?: number; playerName?: string }) => {
  await gameStateManagerInstance.loadGame(options);
  // The store automatically updates via the subscription, no need to manually setGameState here.
};

export const saveGame = async () => {
  await gameStateManagerInstance.saveGame();
};

export const resetGameDefaults = (options: { newGameSeed: number; playerName: string }) => {
  gameStateManagerInstance.resetGameDefaults(options);
  // Store updates via subscription
};

export const setPlayerName = (name: string) => {
  gameStateManagerInstance.setPlayerName(name);
};

export const updateCurrency = (amount: number) => {
  gameStateManagerInstance.updateCurrency(amount);
};

export const addStoneToInventory = (stone: StoneQualities) => {
  gameStateManagerInstance.addStoneToInventory(stone);
};

export const removeStoneFromInventory = (stoneId: number) => {
  gameStateManagerInstance.removeStoneFromInventory(stoneId);
};

export const equipStone = (stoneId: number | null) => {
  gameStateManagerInstance.equipStone(stoneId);
};

export const generateNewOpponentQueue = (count: number): StoneQualities[] => {
  // This action directly returns the result, though the manager might also update its internal state
  // which would then flow to the gameState store if opponentQueue was part of GameState.
  // Based on IGameStateManager, this returns StoneQualities[], not directly part of main GameState.
  // If UI needs this reactively, it might need its own signal updated by this call.
  // For now, this is an action that can be called.
  return gameStateManagerInstance.generateNewOpponentQueue(count);
};

export const advanceOpponent = () => {
  gameStateManagerInstance.advanceOpponent();
};

// Old functions like getDefaultSaveData, initializeGamePrng, getGamePrng,
// currentSaveData, setCurrentSaveData, currentStoneDetails, setCurrentStoneDetails,
// opponentQueue store, setOpponentQueue, specific addStoneToInventory, generateOpponentList,
// getCurrentOpponent (old version), saveData (old version), loadData (old version)
// are removed as their responsibilities are now with GameStateManager and the new reactive gameState.
// UI-specific message/log signals are kept (assumed to be from utils.ts).

// Note: The initial loadGame call is expected to be done in App.tsx's onMount.
// This store no longer self-initializes game data on import.
// It sets up the reactive bridge to GameStateManager.
// The actual initial state population is deferred to an explicit loadGame call.
