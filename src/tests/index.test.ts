import { StoneQualities, createStone, generateNewStoneSeed } from '@src/stone';
import { SaveData, getDefaultSaveData, saveData, loadData } from '@src/store';
import seedrandom from 'seedrandom';

// Mock store and other dependencies if they are complex or have side effects
jest.mock('@src/store', () => ({
  ...jest.requireActual('@src/store'), // Import and retain default behavior
  saveData: jest.fn(), // Mock saveData to prevent actual file writes
  loadData: jest.fn(),
}));

// Mock blessed screen and elements to avoid errors when UI functions are called
// We are not testing UI rendering here, so these can be simple mocks.
jest.mock('blessed', () => ({
  screen: jest.fn(() => ({
    key: jest.fn(),
    destroy: jest.fn(),
    focused: true, // Assume screen is always focused for rendering calls
    render: jest.fn(),
  })),
  layout: jest.fn((options) => ({
    ...options,
    hide: jest.fn(),
    show: jest.fn(),
    screen: options.parent ? options.parent : true,
  })),
  box: jest.fn((options) => ({ ...options, setContent: jest.fn(), screen: options.parent ? options.parent : true })),
  list: jest.fn((options) => ({
    ...options,
    on: jest.fn(),
    key: jest.fn(),
    focus: jest.fn(),
    getItem: jest.fn(() => ({ getContent: jest.fn() })),
    setItems: jest.fn(),
    select: jest.fn(),
    screen: options.parent ? options.parent : true,
  })),
  text: jest.fn((options) => ({
    ...options,
    setContent: jest.fn(),
    setFront: jest.fn(),
    screen: options.parent ? options.parent : true,
  })),
  form: jest.fn((options) => ({
    ...options,
    key: jest.fn(),
    on: jest.fn(),
    submit: jest.fn(),
    destroy: jest.fn(),
    screen: options.parent ? options.parent : true,
  })),
  textbox: jest.fn((options) => ({ ...options, focus: jest.fn() })),
  button: jest.fn((options) => ({ ...options, on: jest.fn() })),
}));

// --- Test Setup ---
// The functions we want to test are originally defined in the global scope of index.ts.
// To test them, we need to effectively re-declare or expose them in a testable way,
// or run the entire index.ts and grab them, which is harder for unit testing.
// For this setup, we'll simulate the relevant global state and functions.

let currentSaveData: SaveData;
let gamePrng: seedrandom.PRNG;
let opponentQueue: StoneQualities[] = [];

// Re-define addStoneToInventory for testing (copy from src/index.ts)
function addStoneToInventory(stone: StoneQualities): void {
  currentSaveData.stones.push(stone);
  currentSaveData.stones.sort((a, b) => a.createdAt - b.createdAt);
}

// Re-define generateOpponentQueue for testing (copy from src/index.ts)
function generateOpponentQueue(prng: seedrandom.PRNG, count: number): StoneQualities[] {
  const newQueue: StoneQualities[] = [];
  for (let i = 0; i < count; i++) {
    const stoneSeed = generateNewStoneSeed(prng); // generateNewStoneSeed is from stone.ts
    const opponentStone = createStone(stoneSeed); // createStone is from stone.ts
    newQueue.push(opponentStone);
  }
  return newQueue;
}

// Re-define getCurrentOpponent for testing (copy from src/index.ts)
// We need to use the globally defined opponentQueue and currentSaveData for this test version
function getCurrentOpponentTestVersion(): StoneQualities | null {
  if (currentSaveData.opponents_index >= opponentQueue.length && opponentQueue.length > 0) {
    opponentQueue = generateOpponentQueue(gamePrng, 100); // Use the test version of generateOpponentQueue
    currentSaveData.opponents_index = 0;
    (saveData as jest.Mock)(currentSaveData); // Call mocked saveData
  }

  if (opponentQueue.length > 0 && currentSaveData.opponents_index < opponentQueue.length) {
    return opponentQueue[currentSaveData.opponents_index];
  }
  return null;
}

describe('Index.ts Logic', () => {
  beforeEach(() => {
    // Reset state before each test
    currentSaveData = getDefaultSaveData(); // Use actual getDefaultSaveData
    gamePrng = seedrandom('test-seed'); // Consistent seed for PRNG
    opponentQueue = []; // Reset opponent queue
    (saveData as jest.Mock).mockClear(); // Clear mock call history
    (loadData as jest.Mock).mockReturnValue(getDefaultSaveData()); // Default mock for loadData
  });

  describe('Inventory Management (addStoneToInventory)', () => {
    test('adding a stone increases inventory size', () => {
      expect(currentSaveData.stones.length).toBe(0);
      const stone1 = createStone(1);
      addStoneToInventory(stone1);
      expect(currentSaveData.stones.length).toBe(1);
      expect(currentSaveData.stones[0]).toEqual(stone1);
    });

    test('inventory remains sorted by createdAt after adding multiple stones', () => {
      const stoneOld = createStone(100); // createdAt is Date.now()
      // Ensure createdAt is distinct for testing sort order
      jest
        .spyOn(Date, 'now')
        .mockReturnValueOnce(stoneOld.createdAt + 10)
        .mockReturnValueOnce(stoneOld.createdAt - 10);

      const stoneNew = createStone(200); // createdAt will be Date.now() + 10
      const stoneReallyOld = createStone(300); // createdAt will be Date.now() - 10

      jest.restoreAllMocks(); // Restore Date.now() mock

      addStoneToInventory(stoneOld);
      addStoneToInventory(stoneNew); // Add newest
      addStoneToInventory(stoneReallyOld); // Add oldest

      expect(currentSaveData.stones.length).toBe(3);
      expect(currentSaveData.stones[0].seed).toBe(stoneReallyOld.seed);
      expect(currentSaveData.stones[1].seed).toBe(stoneOld.seed);
      expect(currentSaveData.stones[2].seed).toBe(stoneNew.seed);
    });
  });

  describe('Opponent Queue Logic', () => {
    describe('generateOpponentQueue', () => {
      test('generates the specified count of stones', () => {
        const count = 5;
        const queue = generateOpponentQueue(gamePrng, count);
        expect(queue.length).toBe(count);
      });

      test('all generated stones are valid StoneQualities objects', () => {
        const queue = generateOpponentQueue(gamePrng, 3);
        queue.forEach((stone) => {
          expect(stone).toHaveProperty('seed');
          expect(stone).toHaveProperty('color');
          expect(stone).toHaveProperty('shape');
          expect(stone).toHaveProperty('createdAt');
          // Add more checks if necessary
        });
      });

      test('using the same PRNG instance (re-seeded) generates the same queue', () => {
        const prng1 = seedrandom('fixed-opponent-seed');
        const queue1 = generateOpponentQueue(prng1, 2);

        const prng2 = seedrandom('fixed-opponent-seed'); // New PRNG with same seed
        const queue2 = generateOpponentQueue(prng2, 2);

        expect(queue1).toEqual(queue2);
      });
    });

    describe('getCurrentOpponent (using test version)', () => {
      test('returns an opponent when index is valid', () => {
        opponentQueue = generateOpponentQueue(gamePrng, 5); // Populate global queue
        currentSaveData.opponents_index = 2;
        const opponent = getCurrentOpponentTestVersion();
        expect(opponent).toEqual(opponentQueue[2]);
      });

      test('returns null if queue is empty', () => {
        opponentQueue = [];
        currentSaveData.opponents_index = 0;
        const opponent = getCurrentOpponentTestVersion();
        expect(opponent).toBeNull();
      });

      test('regenerates queue, resets index, and saves data if index is out of bounds', () => {
        opponentQueue = generateOpponentQueue(gamePrng, 3); // Initial queue
        currentSaveData.opponents_index = 3; // Out of bounds

        const initialQueueFirstStoneSeed = opponentQueue[0].seed;

        const newOpponent = getCurrentOpponentTestVersion();

        expect(saveData).toHaveBeenCalledWith(currentSaveData);
        expect(currentSaveData.opponents_index).toBe(0);
        expect(opponentQueue.length).toBe(100); // Default regeneration count
        expect(newOpponent).toBeDefined();
        expect(newOpponent).toEqual(opponentQueue[0]);
        // Ensure the queue was actually regenerated (first stone of new queue is different from old)
        expect(newOpponent?.seed).not.toEqual(initialQueueFirstStoneSeed);
      });

      test('returns null if index is out of bounds and queue was never generated (empty)', () => {
        opponentQueue = []; // Ensure queue is empty initially
        currentSaveData.opponents_index = 0;

        const opponent = getCurrentOpponentTestVersion();

        expect(opponent).toBeNull();
        expect(saveData).not.toHaveBeenCalled(); // Should not save if no regeneration happened
      });
    });
  });
});
