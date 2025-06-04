// src/store.ts
import { createStore, reconcile } from 'solid-js/store';
import { createMemo } from 'solid-js';
import { gameStateManagerInstance } from './services/serviceInstances';
import type { GameState, StoneQualities } from './interfaces';
import { logMessage, showMessage } from './messageStore';

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
export const currentOpponentStore = createMemo(() => gameStateManagerInstance.getCurrentOpponent());

// --- Actions that call GameStateManager methods ---
export const loadGame = async (options?: { newGameSeed?: number; playerName?: string }) => {
  await gameStateManagerInstance.loadGame(options);
};

export const saveGame = async () => {
  await gameStateManagerInstance.saveGame();
};

export const resetGameDefaults = (options: { newGameSeed: number; playerName: string }) => {
  gameStateManagerInstance.resetGameDefaults(options);
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
  return gameStateManagerInstance.generateNewOpponentQueue(count);
};

export const advanceOpponent = () => {
  gameStateManagerInstance.advanceOpponent();
};
