// src/services/gameStateManager.ts
import seedrandom from 'seedrandom'; // Ensure seedrandom is imported
import type {
  IGameStateManager,
  GameState,
  GameStateListener,
} from '../interfaces/gameStateManager';
import type { StoneQualities } from '../interfaces/stone';
import type { IRandomService } from '../interfaces/randomService';
import { createStone, generateNewStoneSeed } from '../stone';
// Import a function to get a default structure, which will be adapted.
// The existing getDefaultSaveData from src/store.ts returns SaveData, not GameState.
// We'll define a new default GameState structure here or adapt.
import type { Card } from '../interfaces/card'; // Import Card
import type { ActiveEffect } from '../interfaces/activeEffect'; // Import ActiveEffect
import { getPredefinedCards } from '../config/cards'; // Import card definitions

const LOCAL_STORAGE_KEY = 'stoneCrafterGameState';

function getInitialGameState(): GameState {
  return {
    gameSeed: null,
    playerStats: { name: '' },
    currency: 0,
    stones: [],
    equippedStoneId: null,
    opponentsSeed: null,
    opponents_index: 0,
    // Initialize new card game properties
    deck: [],
    hand: [],
    discardPile: [],
    playerActiveCombatEffects: [],
  };
}

export class GameStateManager implements IGameStateManager {
  private state: GameState;
  private listeners: GameStateListener[] = [];
  private opponentQueue: StoneQualities[] = [];

  // randomService is injected and should be initialized by the caller,
  // typically after gameSeed is known (e.g., in loadGame or resetGameDefaults).
  constructor(private randomService: IRandomService) {
    this.state = getInitialGameState();
    // Note: randomService is injected but might not be seeded yet.
    // Seeding should happen in loadGame or resetGameDefaults.
  }

  private deepCopy<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    // Basic deep copy for plain objects and arrays.
    // For more complex state (e.g., with classes, Maps, Sets), a more robust deep copy is needed.
    return JSON.parse(JSON.stringify(obj));
  }

  private notifyListeners(): void {
    const stateCopy = this.deepCopy(this.state);
    this.listeners.forEach(listener => listener(stateCopy));
  }

  // --- IGameStateManager Implementation ---

  public getCurrentState(): GameState {
    return this.deepCopy(this.state);
  }

  public subscribe(listener: GameStateListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // --- Deck, Hand, Discard Management ---

  public generateDeck(): void {
    const cards = getPredefinedCards();
    this.state.deck = this.randomService.shuffleArray(cards);
    this.state.discardPile = [];
    this.state.hand = [];
    console.log(`Generated and shuffled a new deck with ${this.state.deck.length} cards.`);
    this.notifyListeners();
  }

  public drawCardsFromDeck(count: number): Card[] {
    const drawnCards: Card[] = [];
    for (let i = 0; i < count; i++) {
      if (this.state.deck.length === 0) {
        if (this.state.discardPile.length === 0) {
          console.log('Deck and discard pile are empty. No cards to draw.');
          break;
        }
        console.log('Deck empty, shuffling discard pile into deck.');
        this.state.deck = this.randomService.shuffleArray([...this.state.discardPile]);
        this.state.discardPile = [];
        if (this.state.deck.length === 0) {
           console.log('No cards available to draw even after reshuffle.');
           break;
        }
      }
      const card = this.state.deck.shift();
      if (card) {
        drawnCards.push(card);
      }
    }
    this.notifyListeners();
    return drawnCards;
  }

  public addCardsToHand(cards: Card[]): void {
    this.state.hand.push(...cards);
    this.notifyListeners();
  }

  public removeCardFromHand(cardId: string): Card | undefined {
    const cardIndex = this.state.hand.findIndex(c => c.id === cardId);
    if (cardIndex > -1) {
      const card = this.state.hand.splice(cardIndex, 1)[0];
      this.notifyListeners();
      return card;
    }
    return undefined;
  }

  public addCardsToDiscardPile(cards: Card[]): void {
    this.state.discardPile.push(...cards);
    this.notifyListeners();
  }

  // --- Active Combat Effects Management ---

  public addPlayerActiveCombatEffect(effect: ActiveEffect): void {
    this.state.playerActiveCombatEffects.push(effect);
    this.notifyListeners();
  }

  public removePlayerActiveCombatEffect(effectId: string): void {
    this.state.playerActiveCombatEffects = this.state.playerActiveCombatEffects.filter(e => e.id !== effectId);
    this.notifyListeners();
  }

  public updatePlayerActiveCombatEffects(effects: ActiveEffect[]): void {
    this.state.playerActiveCombatEffects = effects;
    this.notifyListeners();
  }

  // --- Existing IGameStateManager Implementation ---

  public async loadGame(options?: { newGameSeed?: number; playerName?: string }): Promise<GameState> {
    if (options?.newGameSeed !== undefined) {
      // Start a new game if newGameSeed is explicitly provided
      const playerName = options.playerName || 'Player';
      this.resetGameDefaults({ newGameSeed: options.newGameSeed, playerName });
      // generateDeck() is called within resetGameDefaults
      return this.getCurrentState();
    }

    const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedData) {
      try {
        const parsedState = JSON.parse(savedData) as GameState;
        this.state = { ...getInitialGameState(), ...parsedState };
        if (this.state.gameSeed === null) {
            throw new Error("Loaded game state has null gameSeed.");
        }
        this.randomService.initialize(this.state.gameSeed);
        if (this.state.opponentsSeed === null) {
            this.state.opponentsSeed = this.randomService.generateSeed();
        }
        this.state.deck = this.state.deck || [];
        this.state.hand = this.state.hand || [];
        this.state.discardPile = this.state.discardPile || [];
        this.state.playerActiveCombatEffects = this.state.playerActiveCombatEffects || [];

        if (this.state.deck.length === 0 && this.state.hand.length === 0 && this.state.discardPile.length === 0) {
            this.generateDeck();
        }

        this.generateNewOpponentQueue(100);
        this.notifyListeners();
        console.log('Game state loaded from localStorage.');
        return this.getCurrentState();
      } catch (error) {
        console.error('Failed to parse saved game data, starting new game:', error);
      }
    }
    
    const newGameSeed = this.randomService.generateSeed();
    const playerName = options?.playerName || 'New Player';
    this.resetGameDefaults({ newGameSeed, playerName });
    // generateDeck() is called within resetGameDefaults
    return this.getCurrentState();
  }

  public async saveGame(): Promise<void> {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.state));
      console.log('Game state saved to localStorage.');
    } catch (error) {
      console.error('Failed to save game state:', error);
      // Potentially notify user through an event or a dedicated message signal
    }
  }

  public resetGameDefaults(options: { newGameSeed: number; playerName: string }): GameState {
    this.randomService.initialize(options.newGameSeed); // Initialize main PRNG with gameSeed

    this.state = {
      gameSeed: options.newGameSeed,
      playerStats: { name: options.playerName },
      currency: 0,
      stones: [],
      equippedStoneId: null,
      opponentsSeed: this.randomService.generateSeed(), // Use main PRNG to generate a distinct seed for opponents
      opponents_index: 0,
      // Ensure new properties are initialized in reset as well
      deck: [],
      hand: [],
      discardPile: [],
      playerActiveCombatEffects: [],
    };
    
    // Generate first stone
    const firstStoneSeed = generateNewStoneSeed(() => this.randomService.getRandom());
    const firstStone = createStone(firstStoneSeed);
    this.addStoneToInventory(firstStone);
    this.equipStone(firstStone.seed);

    this.generateDeck(); // Generate and shuffle the initial deck
    this.generateNewOpponentQueue(100);

    console.log(`Game reset with new seed: ${options.newGameSeed}`);
    this.notifyListeners(); 
    return this.getCurrentState();
  }

  public setPlayerName(name: string): void {
    this.state.playerStats.name = name;
    this.notifyListeners();
  }

  public updateCurrency(amount: number): void {
    this.state.currency += amount;
    this.notifyListeners();
  }

  public addStoneToInventory(stone: StoneQualities): void {
    // Prevent duplicates by seed, though createStone should yield unique seeds if PRNG is handled well
    if (!this.state.stones.find((s: StoneQualities) => s.seed === stone.seed)) {
      this.state.stones.push(stone);
      this.state.stones.sort((a: StoneQualities, b: StoneQualities) => a.createdAt - b.createdAt); // Sort by creation time
      this.notifyListeners();
    }
  }

  public removeStoneFromInventory(stoneId: number): void {
    this.state.stones = this.state.stones.filter((s: StoneQualities) => s.seed !== stoneId);
    if (this.state.equippedStoneId === stoneId) {
      this.equipStone(this.state.stones.length > 0 ? this.state.stones[0].seed : null);
    }
    this.notifyListeners();
  }

  public equipStone(stoneId: number | null): void {
    if (stoneId === null || this.state.stones.find((s: StoneQualities) => s.seed === stoneId)) {
      this.state.equippedStoneId = stoneId;
      this.notifyListeners();
    } else {
      console.warn(`Attempted to equip non-existent stone ID: ${stoneId}`);
    }
  }

  public generateNewOpponentQueue(count: number = 100): StoneQualities[] {
    if (this.state.opponentsSeed === null) {
        // This should ideally be set during game init/load.
        // If called before, generate one now.
        this.state.opponentsSeed = this.randomService.generateSeed(); 
        console.warn("Opponents_seed was null, generated a new one.");
    }
    // Use a separate PRNG instance for opponent generation, seeded by opponentsSeed
    // This keeps opponent generation deterministic and separate from gameSeed's PRNG usage.
    const opponentPrng = seedrandom(this.state.opponentsSeed.toString()); // Make sure seedrandom is available

    this.opponentQueue = [];
    for (let i = 0; i < count; i++) {
      // Pass the opponentPrng function itself to generateNewStoneSeed
      const opponentStoneSeed = generateNewStoneSeed(opponentPrng);
      this.opponentQueue.push(createStone(opponentStoneSeed));
    }
    this.state.opponents_index = 0;
    // Notifying listeners here might be too frequent if queue is large and not directly part of state.
    // The change in opponents_index will trigger a notification if needed.
    // For now, let's assume this method is called, and then getCurrentOpponent reflects the change.
    // If the queue itself needs to be observable, it should be part of `this.state`.
    console.log(`Generated new opponent queue with ${count} opponents using seed ${this.state.opponentsSeed}.`);
    this.notifyListeners(); // Notify because opponents_index changed and queue is implicitly part of state.
    return this.deepCopy(this.opponentQueue);
  }

  public getCurrentOpponent(): StoneQualities | null {
    if (this.state.opponents_index >= this.opponentQueue.length) {
      if (this.opponentQueue.length > 0) { // Only regenerate if it wasn't an empty initial generation
        console.log('Opponent queue exhausted or index out of bounds, regenerating.');
        this.generateNewOpponentQueue(100); // Regenerate with default count
      } else if (this.state.gameSeed !== null && this.state.opponentsSeed !== null && this.opponentQueue.length === 0) {
        // This case handles if the queue was initially generated empty (e.g. count 0)
        // or if it's the very first call on a loaded game where queue wasn't persisted.
        console.log('Opponent queue is empty, attempting initial generation.');
        this.generateNewOpponentQueue(100);
      }
    }
    
    if (this.opponentQueue.length > 0 && this.state.opponents_index < this.opponentQueue.length) {
      return this.deepCopy(this.opponentQueue[this.state.opponents_index]);
    }
    return null;
  }

  public advanceOpponent(): void {
    this.state.opponents_index++;
    // Note: getCurrentOpponent will handle regeneration if index goes out of bounds.
    this.notifyListeners();
  }

  public getEquippedStoneDetails(): StoneQualities | null {
    if (this.state.equippedStoneId === null) return null;
    const stone = this.state.stones.find((s: StoneQualities) => s.seed === this.state.equippedStoneId);
    return stone ? this.deepCopy(stone) : null;
  }

  public getStoneById(stoneId: number): StoneQualities | null {
    const stone = this.state.stones.find((s: StoneQualities) => s.seed === stoneId);
    return stone ? this.deepCopy(stone) : null;
  }
}
