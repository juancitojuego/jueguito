import {
  currentSaveData,
  setCurrentSaveData,
  loadData,
  saveData,
  getDefaultSaveData,
  SaveData,
  // StoneQualities is imported from stone.ts directly
  addStoneToInventory,
  generateOpponentList,
  getCurrentOpponent,
  opponentQueue,
  setOpponentQueue, // For resetting queue state in tests
  initializeGamePrng, // To initialize PRNG for opponent generation
  getGamePrng,
  currentStoneDetails, // For checking equipped stone details
  setCurrentStoneDetails,
} from '@src/store'; // Adjust path as needed
import { createStone, StoneQualities } from '@src/stone'; // Import StoneQualities here
import 'jest-localstorage-mock'; // Automatically mocks localStorage

const LOCAL_STORAGE_KEY = 'stoneCrafterSave.solidJs';

describe('Store Logic with SolidJS and localStorage', () => {
  beforeEach(() => {
    // Clear localStorage and reset SolidJS stores before each test
    localStorage.clear();
    setCurrentSaveData(getDefaultSaveData()); // Reset main save data
    // Ensure opponentQueue is cleared. generateOpponentList(0) is the correct way.
    generateOpponentList(0); // Generate an empty list to clear it
    setCurrentStoneDetails(null); // Reset current stone details
    // Ensure PRNG is initialized for tests that need it for opponent generation
    // Tests that specifically check initial PRNG state might re-initialize it.
    initializeGamePrng('test-seed'); 
  });

  describe('getDefaultSaveData', () => {
    test('should return the correct default structure', () => {
      const data = getDefaultSaveData();
      expect(data.playerName).toBe('');
      expect(data.stones).toEqual([]);
      expect(data.equippedStone).toBeNull();
      expect(data.wins).toBe(0);
      expect(data.losses).toBe(0);
      expect(data.currency).toBe(0);
      expect(data.gameSeed).toBeNull();
      expect(data.opponents_index).toBe(0);
      expect(data.salt).toBe('StoneCrafterSaltValueV1.SolidJS');
      expect(data.gameVersion).toBe('1.0.0');
    });
  });

  describe('saveData and loadData', () => {
    test('should save and load data correctly using localStorage', () => {
      const stone1 = createStone(1);
      const stone2 = createStone(2);
      const testSaveData: SaveData = {
        ...getDefaultSaveData(),
        playerName: 'Tester',
        stones: [stone1, stone2],
        equippedStone: stone1,
        currency: 100,
        gameSeed: 12345,
        opponents_index: 1, // Ensure this is within bounds if queue is populated
      };
      setCurrentSaveData(testSaveData); // Set the store to this data
      setCurrentStoneDetails(stone1);

      saveData(); // Save the current state of currentSaveData

      expect(localStorage.setItem).toHaveBeenCalledWith(LOCAL_STORAGE_KEY, JSON.stringify(testSaveData));

      // Reset store to default before loading to ensure loadData populates it
      setCurrentSaveData(getDefaultSaveData());
      setCurrentStoneDetails(null);
      
      loadData(); // Load data from localStorage

      expect(localStorage.getItem).toHaveBeenCalledWith(LOCAL_STORAGE_KEY);
      expect(currentSaveData.playerName).toBe(testSaveData.playerName);
      expect(currentSaveData.stones.length).toBe(2);
      expect(currentSaveData.stones[0].seed).toBe(stone1.seed);
      expect(currentSaveData.equippedStone?.seed).toBe(stone1.seed);
      expect(currentStoneDetails()?.seed).toBe(stone1.seed); // Check signal as well
      expect(currentSaveData.currency).toBe(testSaveData.currency);
      expect(currentSaveData.gameSeed).toBe(testSaveData.gameSeed);
      // loadData also initializes opponent queue if gameSeed exists, so check that too
    });

    test('loadData should set default data if localStorage is empty', () => {
      loadData(); // localStorage is empty (cleared in beforeEach)
      expect(currentSaveData).toEqual(getDefaultSaveData());
      expect(currentStoneDetails()).toBeNull();
    });

    test('loadData should handle corrupted JSON by setting default data', () => {
      localStorage.setItem(LOCAL_STORAGE_KEY, '{"corrupted": json}');
      loadData();
      expect(currentSaveData).toEqual(getDefaultSaveData());
      expect(currentStoneDetails()).toBeNull();
    });
    
    test('loadData should initialize opponent queue if gameSeed is present', () => {
        const gameSeed = 123;
        const saveDataWithSeed = { ...getDefaultSaveData(), gameSeed };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(saveDataWithSeed));
        
        loadData(); // This should call initializeGamePrng and generateOpponentList
        
        expect(currentSaveData.gameSeed).toBe(gameSeed);
        expect(getGamePrng()).toBeDefined(); // Check if PRNG was initialized
        expect(opponentQueue.length).toBeGreaterThan(0); // Check if opponent queue was generated
    });
  });

  describe('addStoneToInventory', () => {
    test('should add a stone and sort the inventory', () => {
      const stone1Time = Date.now();
      const stone1 = { ...createStone(1), createdAt: stone1Time };
      const stone2Time = Date.now() + 100; // Ensure different creation time
      const stone2 = { ...createStone(2), createdAt: stone2Time };

      addStoneToInventory(stone2); // Add later stone first
      addStoneToInventory(stone1); // Add earlier stone second

      expect(currentSaveData.stones.length).toBe(2);
      expect(currentSaveData.stones[0].seed).toBe(stone1.seed); // stone1 should be first (older)
      expect(currentSaveData.stones[1].seed).toBe(stone2.seed);
    });
  });

  describe('Opponent Logic (generateOpponentList, getCurrentOpponent)', () => {
    test('generateOpponentList should populate the opponentQueue and reset index', () => {
      generateOpponentList(5); // Generate 5 opponents
      expect(opponentQueue.length).toBe(5);
      expect(opponentQueue[0]).toHaveProperty('id');
      expect(opponentQueue[0]).toHaveProperty('name');
      expect(opponentQueue[0].stones.length).toBeGreaterThanOrEqual(1);
      expect(currentSaveData.opponents_index).toBe(0);
    });

    test('getCurrentOpponent should return opponents and advance index correctly', () => {
      generateOpponentList(3);
      
      const op1 = getCurrentOpponent();
      expect(op1?.id).toBe(opponentQueue[0].id);
      // setCurrentSaveData('opponents_index', i => i + 1); // Manual advance for testing isolated getCurrentOpponent
      // For this test, assume MainMenu fight logic would advance it.
      // Here we are testing if getCurrentOpponent *retrieves* correctly based on index.
      
      setCurrentSaveData('opponents_index', 1);
      const op2 = getCurrentOpponent();
      expect(op2?.id).toBe(opponentQueue[1].id);

      setCurrentSaveData('opponents_index', 2);
      const op3 = getCurrentOpponent();
      expect(op3?.id).toBe(opponentQueue[2].id);
    });

    test('getCurrentOpponent should regenerate queue if index is out of bounds', () => {
      generateOpponentList(1); // Start with 1 opponent
      setCurrentSaveData('opponents_index', 0);
      const firstOpponent = getCurrentOpponent();
      expect(firstOpponent?.id).toBe(opponentQueue[0].id);

      setCurrentSaveData('opponents_index', 1); // Index out of bounds
      const newOpponent = getCurrentOpponent(); // Should trigger regeneration
      
      expect(opponentQueue.length).toBe(100); // Default regeneration count
      expect(currentSaveData.opponents_index).toBe(0); // Index should be reset
      expect(newOpponent).not.toBeNull();
      expect(newOpponent?.id).toBe(opponentQueue[0].id);
    });
    
    test('getCurrentOpponent should generate queue if initially empty', () => {
        expect(opponentQueue.length).toBe(0); // Ensure queue is empty initially
        const opponent = getCurrentOpponent();
        expect(opponentQueue.length).toBe(100); // Default generation count
        expect(currentSaveData.opponents_index).toBe(0);
        expect(opponent).not.toBeNull();
    });
  });
});
