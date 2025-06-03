// src/tests/services/gameStateManager.test.ts
import { GameStateManager } from '../../services/gameStateManager';
import type { IRandomService } from '../../interfaces/randomService';
import type { GameState } from '../../interfaces/gameState';
import { getPredefinedCards } from '../../config/cards';
import type { Card } from '../../interfaces/card';
import type { ActiveEffect } from '../../interfaces/activeEffect';
import { StoneQualities } from '../../interfaces/stone';

// Mock IRandomService
const mockRandomService: jest.Mocked<IRandomService> = {
  initialize: jest.fn(),
  getRandom: jest.fn(() => 0.5), // Default mock value
  generateSeed: jest.fn(() => 123456789), // Default mock seed
  shuffleArray: jest.fn(arr => [...arr].reverse()), // Simple predictable shuffle (reverses)
};

// Mock predefined cards for consistent testing if needed, or use actual
jest.mock('../../config/cards', () => ({
  ...jest.requireActual('../../config/cards'), // Keep actual functions like getPredefinedCards
  PREDEFINED_CARDS: [
    { id: 'C1', name: 'Test Card 1', type: 'BUFF_ATTACK', description: 'Test Desc 1', effect: { id: 'E1', description: 'Test Effect 1', apply: jest.fn(effs => effs) } },
    { id: 'C2', name: 'Test Card 2', type: 'BUFF_DEFENSE', description: 'Test Desc 2', effect: { id: 'E2', description: 'Test Effect 2', apply: jest.fn(effs => effs) } },
    { id: 'C3', name: 'Test Card 3', type: 'SPECIAL', description: 'Test Desc 3', effect: { id: 'E3', description: 'Test Effect 3', apply: jest.fn(effs => effs) } },
    { id: 'C4', name: 'Test Card 4', type: 'BUFF_ATTACK', description: 'Test Desc 4', effect: { id: 'E4', description: 'Test Effect 4', apply: jest.fn(effs => effs) } },
    { id: 'C5', name: 'Test Card 5', type: 'SPECIAL', description: 'Test Desc 5', effect: { id: 'E5', description: 'Test Effect 5', apply: jest.fn(effs => effs) } },
  ],
}));

const ALL_CARDS = getPredefinedCards(); // Get the mocked cards

describe('GameStateManager', () => {
  let gameStateManager: GameStateManager;

  beforeEach(() => {
    jest.clearAllMocks();
    // localStorage mock
    global.localStorage = (() => {
      let store: Record<string, string> = {};
      return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; },
        length: 0, // Add length property
        key: (index: number) => null // Add key method
      };
    })();
    gameStateManager = new GameStateManager(mockRandomService);
    // Initialize with a game seed for consistent deck generation for some tests
    gameStateManager.resetGameDefaults({ newGameSeed: 123, playerName: 'Tester' });
  });

  test('initial state should have empty deck, hand, discard, and effects', () => {
    const gsm = new GameStateManager(mockRandomService); // Fresh instance before reset
    const initialState = gsm.getCurrentState();
    expect(initialState.deck).toEqual([]);
    expect(initialState.hand).toEqual([]);
    expect(initialState.discardPile).toEqual([]);
    expect(initialState.playerActiveCombatEffects).toEqual([]);
  });

  describe('generateDeck', () => {
    test('should create a deck with all predefined cards, shuffled', () => {
      gameStateManager.generateDeck();
      const state = gameStateManager.getCurrentState();
      expect(state.deck.length).toBe(ALL_CARDS.length);
      // Check if shuffleArray was called and if the order is reversed (as per mock)
      expect(mockRandomService.shuffleArray).toHaveBeenCalledWith(expect.arrayContaining(ALL_CARDS));
      expect(state.deck[0].id).toBe(ALL_CARDS[ALL_CARDS.length - 1].id); // Reversed
      expect(state.hand).toEqual([]);
      expect(state.discardPile).toEqual([]);
    });
  });

  describe('drawCardsFromDeck', () => {
    beforeEach(() => {
      gameStateManager.generateDeck(); // Ensure deck is populated
    });

    test('should draw specified number of cards and remove them from deck', () => {
      const initialDeckSize = gameStateManager.getCurrentState().deck.length;
      const cardsToDraw = 3;
      const drawnCards = gameStateManager.drawCardsFromDeck(cardsToDraw);
      expect(drawnCards.length).toBe(cardsToDraw);
      const state = gameStateManager.getCurrentState();
      expect(state.deck.length).toBe(initialDeckSize - cardsToDraw);
    });

    test('should reshuffle discard pile into deck if deck is empty', () => {
      // Empty the deck
      gameStateManager.drawCardsFromDeck(ALL_CARDS.length);
      expect(gameStateManager.getCurrentState().deck.length).toBe(0);
      // Add some cards to discard pile
      const discardCards = [ALL_CARDS[0], ALL_CARDS[1]];
      gameStateManager.addCardsToDiscardPile(discardCards);
      expect(gameStateManager.getCurrentState().discardPile.length).toBe(2);

      const drawn = gameStateManager.drawCardsFromDeck(1);
      expect(drawn.length).toBe(1);
      expect(gameStateManager.getCurrentState().deck.length).toBe(discardCards.length - 1);
      expect(gameStateManager.getCurrentState().discardPile.length).toBe(0);
      expect(mockRandomService.shuffleArray).toHaveBeenCalledTimes(2); // Once for generateDeck, once for reshuffle
    });

    test('should return empty array if deck and discard are empty', () => {
      gameStateManager.drawCardsFromDeck(ALL_CARDS.length); // Empty deck
      expect(gameStateManager.getCurrentState().deck.length).toBe(0);
      expect(gameStateManager.getCurrentState().discardPile.length).toBe(0);
      const drawn = gameStateManager.drawCardsFromDeck(1);
      expect(drawn.length).toBe(0);
    });
  });

  describe('Hand and Discard Pile Management', () => {
    const testCards: Card[] = [{ id: 'TC1', name: 'Hand Card 1' } as Card, { id: 'TC2', name: 'Hand Card 2' } as Card];
    test('addCardsToHand should add cards to hand', () => {
      gameStateManager.addCardsToHand(testCards);
      const state = gameStateManager.getCurrentState();
      expect(state.hand).toEqual(expect.arrayContaining(testCards));
    });

    test('removeCardFromHand should remove card and return it', () => {
      gameStateManager.addCardsToHand(testCards);
      const removedCard = gameStateManager.removeCardFromHand('TC1');
      expect(removedCard?.id).toBe('TC1');
      expect(gameStateManager.getCurrentState().hand.find(c => c.id === 'TC1')).toBeUndefined();
      expect(gameStateManager.getCurrentState().hand.length).toBe(testCards.length - 1);
    });

    test('addCardsToDiscardPile should add cards to discard pile', () => {
      gameStateManager.addCardsToDiscardPile(testCards);
      expect(gameStateManager.getCurrentState().discardPile).toEqual(expect.arrayContaining(testCards));
    });
  });

  describe('Player Active Combat Effects Management', () => {
    const effect1: ActiveEffect = { id: 'E1', name: 'Effect 1', description: 'Desc 1', remainingDuration: 2 };
    const effect2: ActiveEffect = { id: 'E2', name: 'Effect 2', description: 'Desc 2', remainingDuration: 1 };

    test('addPlayerActiveCombatEffect should add an effect', () => {
      gameStateManager.addPlayerActiveCombatEffect(effect1);
      expect(gameStateManager.getCurrentState().playerActiveCombatEffects).toContainEqual(effect1);
    });

    test('removePlayerActiveCombatEffect should remove an effect by ID', () => {
      gameStateManager.addPlayerActiveCombatEffect(effect1);
      gameStateManager.addPlayerActiveCombatEffect(effect2);
      gameStateManager.removePlayerActiveCombatEffect('E1');
      const effects = gameStateManager.getCurrentState().playerActiveCombatEffects;
      expect(effects.find(e => e.id === 'E1')).toBeUndefined();
      expect(effects.find(e => e.id === 'E2')).toBeDefined();
    });

    test('updatePlayerActiveCombatEffects should replace all effects', () => {
      gameStateManager.addPlayerActiveCombatEffect(effect1);
      gameStateManager.updatePlayerActiveCombatEffects([effect2]);
      const effects = gameStateManager.getCurrentState().playerActiveCombatEffects;
      expect(effects).toEqual([effect2]);
      expect(effects.length).toBe(1);
    });
  });
  
  // Test loadGame and resetGameDefaults ensure deck is generated
  describe('Game Load and Reset', () => {
    test('resetGameDefaults should generate a deck', () => {
        gameStateManager.resetGameDefaults({ newGameSeed: 999, playerName: 'Reset Tester'});
        expect(mockRandomService.shuffleArray).toHaveBeenCalled();
        expect(gameStateManager.getCurrentState().deck.length).toBe(ALL_CARDS.length);
    });

    // Test for loadGame is more complex due to localStorage interaction
    // For now, we assume resetGameDefaults covers the deck generation part primarily
  });
});
