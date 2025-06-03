// src/tests/services/gameStateManager.test.ts

import { GameStateManager } from '../../services/gameStateManager';
import type { IRandomService } from '../../interfaces/randomService';
import type { GameState, StoneQualities, GameStateListener } from '../../interfaces'; // Ensure GameStateListener is imported
import { createStone, generateNewStoneSeed } from '../../stone'; // For actual stone creation

// Mock IRandomService
const mockRandomService: jest.Mocked<IRandomService> = {
  initialize: jest.fn(),
  getRandom: jest.fn(),
  generateSeed: jest.fn(),
  shuffleArray: jest.fn((arr: any[]) => [...arr]), // Simple pass-through shuffle for most tests
};

// Mock localStorage
let mockLocalStorageStore: { [key: string]: string } = {};
const mockLocalStorage = {
  getItem: jest.fn((key: string) => mockLocalStorageStore[key] || null),
  setItem: jest.fn((key: string, value: string) => { mockLocalStorageStore[key] = value; }),
  clear: jest.fn(() => { mockLocalStorageStore = {}; }),
  removeItem: jest.fn((key: string) => { delete mockLocalStorageStore[key]; }),
  // length and key are not typically used by the manager but can be added if needed
  get length() { return Object.keys(mockLocalStorageStore).length; },
  key: jest.fn(n => Object.keys(mockLocalStorageStore)[n] || null),
};
Object.defineProperty(global, 'localStorage', { value: mockLocalStorage, configurable: true });

const LOCAL_STORAGE_KEY = 'stoneCrafterGameState'; // Must match the one in GameStateManager

// Helper to create mock StoneQualities for tests
const createTestStone = (seed: number, name?: string, createdAt?: number): StoneQualities => ({
  seed,
  color: `Color-${seed}`,
  shape: `Shape-${seed}`,
  rarity: seed % 100,
  hardness: parseFloat(((seed % 100) / 100).toFixed(2)),
  weight: (seed % 99) + 1,
  magic: seed % 100,
  createdAt: createdAt || Date.now(),
  name: name || `Stone ${seed}`,
});


describe('GameStateManager', () => {
  let gameStateManager: GameStateManager;
  let mockListener: jest.Mock<GameStateListener>;

  beforeEach(() => {
    // Reset mocks and localStorage before each test
    mockRandomService.initialize.mockClear();
    mockRandomService.getRandom.mockClear();
    mockRandomService.generateSeed.mockClear();
    mockRandomService.shuffleArray.mockImplementation((arr: any[]) => [...arr]);


    localStorage.clear(); // Uses the mocked clear
    expect(mockLocalStorageStore).toEqual({}); // Verify mock is working

    // Default mock implementations
    mockRandomService.generateSeed.mockReturnValue(123456789); // Default mock seed for generateSeed
    // Provide a default sequence for getRandom if many calls are made without specific mockReturnValues
    let randomCallCount = 0;
    const defaultRandomSequence = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
    mockRandomService.getRandom.mockImplementation(() => {
        const val = defaultRandomSequence[randomCallCount % defaultRandomSequence.length];
        randomCallCount++;
        return val;
    });


    gameStateManager = new GameStateManager(mockRandomService);
    mockListener = jest.fn();
  });

  describe('Constructor & Initialization', () => {
    test('should initialize with a default empty-ish state', () => {
      const initialState = gameStateManager.getCurrentState();
      expect(initialState.gameSeed).toBeNull();
      expect(initialState.playerStats.name).toBe('');
      expect(initialState.stones).toEqual([]);
      // randomService is not initialized with a specific game seed by constructor alone
      expect(mockRandomService.initialize).not.toHaveBeenCalled(); 
    });
  });

  describe('resetGameDefaults()', () => {
    test('should correctly initialize a new game state', () => {
      const newGameOptions = { newGameSeed: 999, playerName: 'Newbie' };
      mockRandomService.generateSeed.mockReturnValueOnce(1000); // For opponentsSeed
      // Mock getRandom for first stone generation
      mockRandomService.getRandom.mockReturnValueOnce(0.5); // For generateNewStoneSeed
      
      gameStateManager.resetGameDefaults(newGameOptions);
      const state = gameStateManager.getCurrentState();

      expect(state.gameSeed).toBe(999);
      expect(state.playerStats.name).toBe('Newbie');
      expect(state.currency).toBe(0);
      expect(state.stones.length).toBe(1);
      expect(state.equippedStoneId).toBe(state.stones[0].seed);
      expect(state.opponentsSeed).toBe(1000);
      expect(state.opponents_index).toBe(0);
      
      expect(mockRandomService.initialize).toHaveBeenCalledWith(999); // Initialized with gameSeed
      // generateNewOpponentQueue is called by resetGameDefaults
      // It uses its own PRNG seeded with opponentsSeed, so no mockRandomService.getRandom calls for that here.
    });
  });
  
  describe('loadGame() & saveGame()', () => {
    test('loadGame() with empty localStorage should call resetGameDefaults', async () => {
      const defaultPlayerName = 'New Player';
      // Mock generateSeed for the initial random game seed, then for opponentsSeed
      mockRandomService.generateSeed.mockReturnValueOnce(111).mockReturnValueOnce(222);
      // Mock getRandom for first stone generation within resetGameDefaults
      mockRandomService.getRandom.mockReturnValueOnce(0.6);

      await gameStateManager.loadGame(); // No options, should trigger new game
      const state = gameStateManager.getCurrentState();

      expect(localStorage.getItem).toHaveBeenCalledWith(LOCAL_STORAGE_KEY);
      expect(state.gameSeed).toBe(111);
      expect(state.playerStats.name).toBe(defaultPlayerName);
      expect(state.stones.length).toBe(1);
      expect(state.equippedStoneId).toBe(state.stones[0].seed);
      expect(state.opponentsSeed).toBe(222);
      expect(mockRandomService.initialize).toHaveBeenCalledWith(111);
    });

    test('loadGame() with newGameSeed option should call resetGameDefaults with that seed', async () => {
      const options = { newGameSeed: 777, playerName: 'ChosenOne' };
      mockRandomService.generateSeed.mockReturnValueOnce(333); // For opponentsSeed
      mockRandomService.getRandom.mockReturnValueOnce(0.7);    // For first stone

      await gameStateManager.loadGame(options);
      const state = gameStateManager.getCurrentState();

      expect(state.gameSeed).toBe(777);
      expect(state.playerStats.name).toBe('ChosenOne');
      expect(state.opponentsSeed).toBe(333);
      expect(mockRandomService.initialize).toHaveBeenCalledWith(777);
    });

    test('saveGame() and loadGame() with existing data', async () => {
      // 1. Setup initial state and save
      const initialGameOptions = { newGameSeed: 555, playerName: 'Saver' };
      mockRandomService.generateSeed.mockReturnValueOnce(666); // opponentsSeed
      mockRandomService.getRandom.mockReturnValueOnce(0.4);    // first stone
      gameStateManager.resetGameDefaults(initialGameOptions);
      
      const stoneToKeep = createTestStone(987, "Kept Stone");
      gameStateManager.addStoneToInventory(stoneToKeep); // This will modify state and call notify
      gameStateManager.updateCurrency(100);
      await gameStateManager.saveGame();

      const savedStateString = mockLocalStorageStore[LOCAL_STORAGE_KEY];
      expect(localStorage.setItem).toHaveBeenCalledWith(LOCAL_STORAGE_KEY, savedStateString);
      
      // 2. Create new manager instance to simulate app restart, then load
      const newManager = new GameStateManager(mockRandomService);
      await newManager.loadGame(); // Should load from localStorage
      const loadedState = newManager.getCurrentState();

      expect(localStorage.getItem).toHaveBeenCalledWith(LOCAL_STORAGE_KEY);
      expect(loadedState.gameSeed).toBe(555);
      expect(loadedState.playerStats.name).toBe('Saver');
      expect(loadedState.currency).toBe(100);
      expect(loadedState.stones.length).toBe(2); // First stone + Kept Stone
      expect(loadedState.stones.find((s: StoneQualities) => s.seed === 987)).toBeDefined();
      expect(loadedState.opponentsSeed).toBe(666);
      expect(mockRandomService.initialize).toHaveBeenCalledWith(555); // From the load
    });
  });

  describe('State Mutators', () => {
    beforeEach(async () => {
      // Start with a fresh game state for mutator tests
      mockRandomService.generateSeed.mockReturnValueOnce(123).mockReturnValueOnce(456);
      mockRandomService.getRandom.mockReturnValueOnce(0.1); // For first stone
      await gameStateManager.loadGame({newGameSeed: 123, playerName: "MutateMe"});
      mockListener.mockClear(); // Clear listener calls from loadGame/reset
    });

    test('setPlayerName() should update name and notify listeners', () => {
      gameStateManager.subscribe(mockListener);
      gameStateManager.setPlayerName('NewName');
      const state = gameStateManager.getCurrentState();
      expect(state.playerStats.name).toBe('NewName');
      expect(mockListener).toHaveBeenCalledWith(state);
      expect(localStorage.setItem).not.toHaveBeenCalled(); // saveGame is separate
    });

    test('updateCurrency() should change currency and notify listeners', () => {
      gameStateManager.subscribe(mockListener);
      const initialCurrency = gameStateManager.getCurrentState().currency;
      gameStateManager.updateCurrency(50);
      let state = gameStateManager.getCurrentState();
      expect(state.currency).toBe(initialCurrency + 50);
      expect(mockListener).toHaveBeenCalledWith(state);
      
      gameStateManager.updateCurrency(-20);
      state = gameStateManager.getCurrentState();
      expect(state.currency).toBe(initialCurrency + 30);
      expect(mockListener).toHaveBeenCalledWith(state);
    });

    test('addStoneToInventory() should add stone, sort, and notify', () => {
        gameStateManager.subscribe(mockListener);
        const initialStones = gameStateManager.getCurrentState().stones;
        const initialStoneCount = initialStones.length; // Should be 1
        const originalFirstStone = initialStones[0]; // Persist the original first stone for comparison

        // It's crucial that originalFirstStone.createdAt is between stoneOldTime and stoneNewTime
        // for the sort order to be predictable as Older, Original, Younger.
        // We assume createTestStone uses Date.now() if createdAt is not provided.
        // And that the first stone (originalFirstStone) was created at a time "now"
        // relative to the beforeEach block's execution.
        const originalCreatedAt = originalFirstStone.createdAt;
        const stoneOldTime = originalCreatedAt - 1000; // Ensure this is definitely older
        const stoneNewTime = originalCreatedAt + 1000; // Ensure this is definitely newer

        const newStoneYounger = createTestStone(5001, "YoungerStone", stoneNewTime); // Youngest
        const newStoneOlder = createTestStone(5002, "OlderStone", stoneOldTime);   // Oldest

        gameStateManager.addStoneToInventory(newStoneYounger); // Call 1 to listener
        gameStateManager.addStoneToInventory(newStoneOlder);   // Call 2 to listener
        
        const state = gameStateManager.getCurrentState();
        expect(state.stones.length).toBe(initialStoneCount + 2);
        // Sorted by createdAt: OlderStone, originalFirstStone, YoungerStone
        expect(state.stones[0].seed).toBe(newStoneOlder.seed);
        expect(state.stones[1].seed).toBe(originalFirstStone.seed);
        expect(state.stones[2].seed).toBe(newStoneYounger.seed);
        expect(mockListener).toHaveBeenCalledTimes(2);
    });

    test('removeStoneFromInventory() should remove stone and unequip if necessary', () => {
      gameStateManager.subscribe(mockListener);
      const initialStones = gameStateManager.getCurrentState().stones;
      const stoneToRemove = initialStones[0];
      gameStateManager.equipStone(stoneToRemove.seed); // Equip it first
      expect(gameStateManager.getCurrentState().equippedStoneId).toBe(stoneToRemove.seed);

      gameStateManager.removeStoneFromInventory(stoneToRemove.seed);
      const state = gameStateManager.getCurrentState();
      expect(state.stones.find((s: StoneQualities) => s.seed === stoneToRemove.seed)).toBeUndefined();
      expect(state.stones.length).toBe(initialStones.length - 1);
      // GameStateManager.removeStoneFromInventory should equip next available or null
      if (state.stones.length > 0) {
        expect(state.equippedStoneId).toBe(state.stones[0].seed);
      } else {
        expect(state.equippedStoneId).toBeNull();
      }
      expect(mockListener).toHaveBeenCalledTimes(3); // equip, remove (which also equips)
    });
    
    test('equipStone() should change equippedStoneId and notify', () => {
      gameStateManager.subscribe(mockListener);
      const stoneToEquip = createTestStone(777);
      gameStateManager.addStoneToInventory(stoneToEquip); // Listener called once
      mockListener.mockClear(); // Clear for this specific test action

      gameStateManager.equipStone(stoneToEquip.seed);
      const state = gameStateManager.getCurrentState();
      expect(state.equippedStoneId).toBe(stoneToEquip.seed);
      expect(mockListener).toHaveBeenCalledWith(state);
      
      gameStateManager.equipStone(null);
      expect(gameStateManager.getCurrentState().equippedStoneId).toBeNull();
      expect(mockListener).toHaveBeenCalledTimes(2);
    });
  });

  describe('Opponent Management', () => {
    beforeEach(async () => {
      mockRandomService.generateSeed.mockReturnValueOnce(789).mockReturnValueOnce(101); // gameSeed, opponentsSeed
      mockRandomService.getRandom.mockReturnValueOnce(0.2); // For first stone
      await gameStateManager.loadGame({newGameSeed: 789, playerName: "OpponentTester"});
      // generateNewOpponentQueue was called during loadGame/reset
      mockListener.mockClear();
    });

    test('generateNewOpponentQueue() should populate internal queue and reset index', () => {
      // Note: seedrandom (used inside generateNewOpponentQueue) is not using mockRandomService.getRandom
      // so the opponent stones will be based on the actual seedrandom output for opponentsSeed (from beforeEach)
      gameStateManager.subscribe(mockListener); // Subscribe the listener for this test
      const queue = gameStateManager.generateNewOpponentQueue(5);
      expect(queue.length).toBe(5);
      // Check if the internal state reflects this (though queue itself isn't part of GameState)
      const currentOpponent = gameStateManager.getCurrentOpponent(); // This accesses the internal queue
      expect(currentOpponent?.seed).toBe(queue[0].seed);
      expect(gameStateManager.getCurrentState().opponents_index).toBe(0);
      expect(mockListener).toHaveBeenCalled(); // Due to index reset and queue refresh
    });

    test('getCurrentOpponent() should return correct opponent and regenerate if needed', () => {
      gameStateManager.generateNewOpponentQueue(2); // opponentSeed is 101
      let state = gameStateManager.getCurrentState();
      
      const op1 = gameStateManager.getCurrentOpponent();
      expect(op1).not.toBeNull();
      // Seed 101 for opponent PRNG:
      // 1st stone: seedrandom(101)() -> generateNewStoneSeed -> createStone
      // 2nd stone: seedrandom(101)() -> generateNewStoneSeed -> createStone
      // We can't easily predict these seeds without replicating seedrandom exactly.
      // Just check that an opponent is returned.
      
      gameStateManager.advanceOpponent(); // index becomes 1
      const op2 = gameStateManager.getCurrentOpponent();
      expect(op2).not.toBeNull();
      expect(op1?.seed).not.toBe(op2?.seed);

      gameStateManager.advanceOpponent(); // index becomes 2 (out of bounds)
      // This should trigger regeneration. opponentsSeed is still 101.
      // The internal queue will be regenerated with 100 new stones.
      // A new seed for opponentsSeed is not generated on auto-regeneration.
      const op3 = gameStateManager.getCurrentOpponent();
      expect(op3).not.toBeNull();
      expect(gameStateManager.getCurrentState().opponents_index).toBe(0); // Index reset
      // op3 should be the first stone from the *newly* generated list (still seeded by 101)
      // So, op3.seed should be the same as op1.seed if regeneration uses the same seed.
      expect(op3?.seed).toBe(op1?.seed); 
    });

    test('advanceOpponent() should increment index and notify', () => {
      gameStateManager.generateNewOpponentQueue(3);
      gameStateManager.subscribe(mockListener);

      gameStateManager.advanceOpponent();
      let state = gameStateManager.getCurrentState();
      expect(state.opponents_index).toBe(1);
      expect(mockListener).toHaveBeenCalledWith(state);

      gameStateManager.advanceOpponent();
      state = gameStateManager.getCurrentState();
      expect(state.opponents_index).toBe(2);
      expect(mockListener).toHaveBeenCalledWith(state);
    });
  });

  describe('Selectors', () => {
    let stone1: StoneQualities, stone2: StoneQualities;
    beforeEach(async () => {
      mockRandomService.generateSeed.mockReturnValueOnce(111).mockReturnValueOnce(222);
      mockRandomService.getRandom.mockReturnValue(0.5); // for consistent first stone
      await gameStateManager.loadGame({newGameSeed:111, playerName:"Selector Tester"}); // Creates one stone

      let stones = gameStateManager.getCurrentState().stones;
      stone1 = stones[0]; // The first stone
      stone2 = createTestStone(22222, "Stone Two");
      gameStateManager.addStoneToInventory(stone2);
      // Re-assign stone1 if the array instance changed
      stones = gameStateManager.getCurrentState().stones;
      stone1 = stones.find((s: StoneQualities) => s.seed === stone1.seed)!; 
      
      gameStateManager.equipStone(stone1.seed);
      mockListener.mockClear();
    });

    test('getEquippedStoneDetails() should return the equipped stone', () => {
      const equipped = gameStateManager.getEquippedStoneDetails();
      const currentStones = gameStateManager.getCurrentState().stones;
      const expectedEquippedStone = currentStones.find((s: StoneQualities) => s.seed === gameStateManager.getCurrentState().equippedStoneId);
      expect(equipped).toEqual(expectedEquippedStone);
    });

    test('getEquippedStoneDetails() should return null if no stone is equipped', () => {
      gameStateManager.equipStone(null);
      expect(gameStateManager.getEquippedStoneDetails()).toBeNull();
    });

    test('getStoneById() should return correct stone or null', () => {
      const currentStones = gameStateManager.getCurrentState().stones;
      const stone1FromState = currentStones.find((s: StoneQualities) => s.seed === stone1.seed)!; // Ensure we use the actual stone from state
      const stone2FromState = currentStones.find((s: StoneQualities) => s.seed === stone2.seed)!;

      expect(gameStateManager.getStoneById(stone1FromState.seed)?.seed).toBe(stone1FromState.seed);
      expect(gameStateManager.getStoneById(stone2FromState.seed)?.seed).toBe(stone2FromState.seed);
      expect(gameStateManager.getStoneById(99999)  /* Non-existent */).toBeNull();
    });
  });
  
  describe('Listener Subscription', () => {
    test('should notify subscribed listener on state change and allow unsubscribe', () => {
      const unsubscribe = gameStateManager.subscribe(mockListener);
      
      gameStateManager.setPlayerName("ListenerTest");
      expect(mockListener).toHaveBeenCalledTimes(1);
      // Check if the state passed to listener is a deep copy (optional, but good practice)
      // For this, the listener would need to try to mutate it and see if original is unaffected.
      // Or, check if it's not the same reference as internal state if possible.
      // Here, we mostly check it was called with *a* state object.
      expect(mockListener).toHaveBeenCalledWith(expect.objectContaining({
        playerStats: { name: "ListenerTest" }
      }));

      unsubscribe();
      gameStateManager.updateCurrency(100); // Another state change
      expect(mockListener).toHaveBeenCalledTimes(1); // Listener should not be called again
    });
  });
});
