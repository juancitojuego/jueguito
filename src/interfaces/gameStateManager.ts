// src/interfaces/gameStateManager.ts
import type { GameState } from './gameState';
export type { GameState, PlayerStats } from './gameState'; // Ensure PlayerStats is also re-exported
import type { StoneQualities } from './stone';
import type { Card } from './card';
import type { ActiveEffect } from './activeEffect';

// Listener for state changes. The listener receives the new state.
export type GameStateListener = (newState: GameState) => void;

export interface IGameStateManager {
  // --- State Access ---
  /** Retrieves the current, complete game state. */
  getCurrentState(): GameState;

  /**
   * Subscribes a listener function to game state changes.
   * @param listener The function to call when the state changes.
   * @returns An unsubscribe function to remove the listener.
   */
  subscribe(listener: GameStateListener): () => void;

  // --- Game Initialization and Data Persistence ---
  /**
   * Loads the game state from persistence or initializes a new game.
   * If newGameSeed is provided, it starts a new game with that seed.
   * If no persisted data and no newGameSeed, might start with a random seed or default state.
   * @param options Optional parameters for loading or starting a new game.
   * @returns A Promise that resolves to the loaded or initialized game state.
   */
  loadGame(options?: { newGameSeed?: number; playerName?: string }): Promise<GameState>;

  /** Saves the current game state to persistence. */
  saveGame(): Promise<void>;
  
  /**
   * Resets the game state to default values with a new seed and player name.
   * This typically does not save automatically; saveGame should be called if persistence is desired.
   * @param options Parameters for the new game.
   * @returns The new, reset game state.
   */
  resetGameDefaults(options: { newGameSeed: number; playerName: string }): GameState;

  // --- Player and Game State Updates ---
  /** Sets the player's name. */
  setPlayerName(name: string): void;

  /**
   * Updates the player's currency.
   * @param amount The amount to add (positive) or subtract (negative).
   */
  updateCurrency(amount: number): void;

  /** Adds a new stone to the player's inventory. */
  addStoneToInventory(stone: StoneQualities): void;

  /**
   * Removes a stone from the player's inventory.
   * @param stoneId The seed/ID of the stone to remove.
   */
  removeStoneFromInventory(stoneId: number): void;

  /**
   * Equips a stone from the inventory.
   * @param stoneId The seed/ID of the stone to equip, or null to unequip.
   */
  equipStone(stoneId: number | null): void;

  // --- Opponent Management ---
  /**
   * Generates a new queue/list of opponents.
   * This might be called internally when the current queue is exhausted or a new game starts.
   * The actual opponent objects might be simplified (e.g., just StoneQualities) or more complex.
   * @param count The number of opponents to generate.
   * @returns An array of StoneQualities representing the opponents' primary stones.
   */
  generateNewOpponentQueue(count: number): StoneQualities[];

  /** Retrieves the current opponent's primary stone. Returns null if no opponent is available. */
  getCurrentOpponent(): StoneQualities | null;

  /** Advances to the next opponent in the queue. */
  advanceOpponent(): void;

  // --- Utility / Derived State Accessors ---
  /** Retrieves the full StoneQualities object for the currently equipped stone. */
  getEquippedStoneDetails(): StoneQualities | null;
  
  /**
   * Retrieves a specific stone from the player's inventory by its ID.
   * @param stoneId The seed/ID of the stone.
   * @returns The StoneQualities object or null if not found.
   */
  getStoneById(stoneId: number): StoneQualities | null;

  // --- Card Game Mechanics ---
  /**
   * Draws a specified number of cards from the deck.
   * @param count The number of cards to draw.
   * @returns An array of drawn cards.
   */
  drawCardsFromDeck(count: number): Card[];

  /**
   * Adds cards to the player's hand.
   * @param cards The cards to add.
   */
  addCardsToHand(cards: Card[]): void;

  /**
   * Removes a card from the player's hand.
   * @param cardId The ID of the card to remove.
   * @returns The removed card.
   */
  removeCardFromHand(cardId: string): Card;

  /**
   * Adds cards to the discard pile.
   * @param cards The cards to add.
   */
  addCardsToDiscardPile(cards: Card[]): void;

  /**
   * Updates the player's active combat effects.
   * @param effects The new active effects.
   */
  updatePlayerActiveCombatEffects(effects: ActiveEffect[]): void;
}
