import { StoneQualities, createStone as originalCreateStone, generateNewStoneSeed as originalGenerateNewStoneSeed, calculateStonePower as originalCalculateStonePower } from '@src/stone';
import { SaveData, getDefaultSaveData, saveData, loadData } from '@src/store';
import seedrandom from 'seedrandom'; // Will be mocked
import * as blessed from 'blessed'; // Will be mocked

// --- Mocks ---
const mockGamePrng = jest.fn();
jest.mock('seedrandom', () => jest.fn(() => mockGamePrng));

jest.mock('@src/store', () => ({
  ...jest.requireActual('@src/store'),
  saveData: jest.fn(),
  loadData: jest.fn(),
}));

const mockCreateStone = jest.fn();
const mockGenerateNewStoneSeed = jest.fn();
const mockCalculateStonePower = jest.fn();
jest.mock('@src/stone', () => ({
  ...jest.requireActual('@src/stone'), // Keep other exports like COLORS, SHAPES
  createStone: mockCreateStone,
  generateNewStoneSeed: mockGenerateNewStoneSeed,
  calculateStonePower: mockCalculateStonePower,
}));


// Mock blessed screen and elements
const mockSetContent = jest.fn();
const mockFocus = jest.fn();
const mockKey = jest.fn();
const mockOn = jest.fn();
const mockGetItem = jest.fn(() => ({ getContent: jest.fn() }));
const mockSetItems = jest.fn();
const mockSelect = jest.fn();
const mockDestroy = jest.fn();
const mockRender = jest.fn();
const mockHide = jest.fn();
const mockShow = jest.fn();
const mockSubmit = jest.fn();
const mockSetFront = jest.fn();


jest.mock('blessed', () => ({
  screen: jest.fn(() => ({
    key: mockKey,
    destroy: mockDestroy,
    focused: true,
    render: mockRender,
    append: jest.fn(), // Added for potential use if mainLayout.append is called
  })),
  layout: jest.fn((options) => ({
    ...options,
    hide: mockHide,
    show: mockShow,
    screen: options.parent ? options.parent : { append: jest.fn(), render: mockRender, focused: true }, // Ensure screen object exists for parentless layouts if any
    destroy: mockDestroy, // Added
    append: jest.fn(), // Added
  })),
  box: jest.fn((options) => ({ ...options, setContent: mockSetContent, screen: options.parent ? options.parent : {}, destroy: mockDestroy, hide: mockHide, show: mockShow })),
  list: jest.fn((options) => ({
    ...options,
    on: mockOn,
    key: mockKey,
    focus: mockFocus,
    getItem: mockGetItem,
    setItems: mockSetItems,
    select: mockSelect,
    screen: options.parent ? options.parent : {},
    destroy: mockDestroy,
    hide: mockHide,
    show: mockShow,
  })),
  text: jest.fn((options) => ({
    ...options,
    setContent: mockSetContent, // Used by showMessage
    setFront: mockSetFront,
    screen: options.parent ? options.parent : {},
    destroy: mockDestroy,
  })),
    form: jest.fn((options) => ({
    ...options,
    key: mockKey,
    on: mockOn, // Used by startMenuForm
    submit: mockSubmit, // Used by startMenuForm
    destroy: mockDestroy,
    screen: options.parent ? options.parent : {},
  })),
  textbox: jest.fn((options) => ({ ...options, focus: mockFocus, screen: options.parent ? options.parent : {} })),
  button: jest.fn((options) => ({ ...options, on: mockOn, screen: options.parent ? options.parent : {} })), // Used by startMenuForm
}));


// --- Test State & Helpers ---
let currentSaveData: SaveData;
let currentStoneDetails: StoneQualities | null; // Simulates global currentStoneDetails
let gamePrngInstance: seedrandom.PRNG; // Simulates global gamePrng (though mocked)
let opponentQueue: StoneQualities[]; // Simulates global opponentQueue

// UI Mocks that would be set by showMainMenu
let mockMenuListBox: any;
let mockMessageLine: any;
let mockCurrentStoneInfoBox: any;


// Helper to simulate addStoneToInventory from index.ts
function addStoneToInventory(stone: StoneQualities): void {
  currentSaveData.stones.push(stone);
  currentSaveData.stones.sort((a, b) => a.createdAt - b.createdAt);
}

// Helper to simulate updateCurrentStoneDetails from index.ts
function updateCurrentStoneDetails(): void {
  if (currentSaveData.currentStoneSeed !== null) {
    currentStoneDetails = currentSaveData.stones.find(s => s.seed === currentSaveData.currentStoneSeed) || null;
  } else {
    currentStoneDetails = null;
  }
}

// Helper to simulate generateOpponentQueue from index.ts but using mocked stone functions
function generateOpponentQueueLocal(prng: () => number, count: number): StoneQualities[] {
  const newQueue: StoneQualities[] = [];
  for (let i = 0; i < count; i++) {
    const stoneSeed = mockGenerateNewStoneSeed(prng);
    const opponentStone = mockCreateStone(stoneSeed);
    newQueue.push(opponentStone);
  }
  return newQueue;
}

// Helper to simulate getCurrentOpponent from index.ts
function getCurrentOpponentLocal(): StoneQualities | null {
  if (currentSaveData.opponents_index >= opponentQueue.length && opponentQueue.length > 0) {
    opponentQueue = generateOpponentQueueLocal(mockGamePrng, 100); // Use mocked PRNG
    currentSaveData.opponents_index = 0;
    (saveData as jest.Mock)(currentSaveData);
  }
  if (opponentQueue.length > 0 && currentSaveData.opponents_index < opponentQueue.length) {
    return opponentQueue[currentSaveData.opponents_index];
  }
  return null;
}


// This function will contain the logic from menuListBox.on('select', ...)
// We pass mocks for UI elements it would normally close over.
function testMenuActionCallback(
  actionText: string,
  dependencies: {
    currentSaveData: SaveData;
    currentStoneDetails: StoneQualities | null;
    gamePrng: () => number;
    showMessageMock: jest.Mock;
    addStoneToInventoryFn: (stone: StoneQualities) => void;
    updateCurrentStoneDetailsFn: () => void;
    refreshCurrentStoneDisplayMock: jest.Mock;
    saveDataMock: jest.Mock;
    focusListMock: jest.Mock;
    getCurrentOpponentFn: () => StoneQualities | null;
  }
) {
  const {
    currentSaveData: csd, // Use csd to avoid conflict with global currentSaveData in tests
    currentStoneDetails: csdCurrentStone,
    gamePrng: csdGamePrng,
    showMessageMock,
    addStoneToInventoryFn,
    updateCurrentStoneDetailsFn,
    refreshCurrentStoneDisplayMock,
    saveDataMock,
    focusListMock,
    getCurrentOpponentFn
  } = dependencies;

  // --- Start of copied logic from menuListBox.on('select', ...) in src/index.ts ---
  // Simplified and adapted for testing, direct calls to mocked functions
  if (actionText === 'Quit') {
    // shutdown(); // Not testing shutdown here
  } else if (actionText === 'Inventory') {
    // showInventoryMenu(); // Not testing inventory menu here
  } else if (actionText === 'Open') {
    if (!csd.currentStoneSeed) {
      showMessageMock('No current stone to open!');
      setTimeout(() => focusListMock(), 0);
      return;
    }
    const openedStoneSeed = csd.currentStoneSeed;

    csd.stones = csd.stones.filter((s) => s.seed !== openedStoneSeed);
    const newStones: StoneQualities[] = [];

    const stone1Seed = mockGenerateNewStoneSeed(csdGamePrng);
    const stone1 = mockCreateStone(stone1Seed);
    newStones.push(stone1);
    addStoneToInventoryFn(stone1);

    if (csdGamePrng() < 0.1) {
      const stone2Seed = mockGenerateNewStoneSeed(csdGamePrng);
      const stone2 = mockCreateStone(stone2Seed);
      newStones.push(stone2);
      addStoneToInventoryFn(stone2);
    }
    if (csdGamePrng() < 0.01) {
      const stone3Seed = mockGenerateNewStoneSeed(csdGamePrng);
      const stone3 = mockCreateStone(stone3Seed);
      newStones.push(stone3);
      addStoneToInventoryFn(stone3);
    }

    saveDataMock(csd);

    csd.currentStoneSeed =
      newStones.length > 0
        ? newStones[0].seed
        : csd.stones.length > 0
          ? csd.stones[0].seed
          : null;

    updateCurrentStoneDetailsFn();
    refreshCurrentStoneDisplayMock();
    showMessageMock(
      `Opened stone ${openedStoneSeed}. Obtained ${newStones.length} new stone(s). First new one is now current.`
    );
    setTimeout(() => focusListMock(), 0);
  } else if (actionText === 'Fight') {
    if (!csdCurrentStone) {
      showMessageMock('No stone selected to fight with!');
      setTimeout(() => focusListMock(), 0);
      return;
    }

    const opponentStone = getCurrentOpponentFn();
    if (!opponentStone) {
      showMessageMock('No opponents available to fight!');
      setTimeout(() => focusListMock(), 0);
      return;
    }

    let playerPower = mockCalculateStonePower(csdCurrentStone);
    let opponentPower = mockCalculateStonePower(opponentStone);

    playerPower *= 1 + (csdGamePrng() * 0.3 - 0.15);
    opponentPower *= 1 + (csdGamePrng() * 0.3 - 0.15);

    let fightMessage = `Your stone (P: ${playerPower.toFixed(2)}) vs Opponent (P: ${opponentPower.toFixed(2)}). `;

    if (playerPower > opponentPower) {
      csd.currency += 10;
      fightMessage += `You WIN! +10 currency. Current: ${csd.currency}.`;
      if (csdGamePrng() < 0.2) {
        const newStoneSeed = mockGenerateNewStoneSeed(csdGamePrng);
        const extraStone = mockCreateStone(newStoneSeed);
        addStoneToInventoryFn(extraStone);
        fightMessage += ' You found an extra stone!';
      }
    } else if (playerPower < opponentPower) {
      fightMessage += 'You LOST. ';
      if (csdGamePrng() < 0.3) {
        const lostStoneSeed = csdCurrentStone.seed;
        csd.stones = csd.stones.filter((s) => s.seed !== lostStoneSeed);
        fightMessage += 'Your stone was destroyed!';
        csd.currentStoneSeed = csd.stones.length > 0 ? csd.stones[0].seed : null;
        updateCurrentStoneDetailsFn();
      }
    } else {
      fightMessage += "It's a TIE.";
    }

    csd.opponents_index++;
    showMessageMock(fightMessage);
    saveDataMock(csd);
    refreshCurrentStoneDisplayMock();
    setTimeout(() => focusListMock(), 0);
  } else if (actionText === 'Salvage') {
    // Salvage logic can be added here if needed for tests
  }
  // --- End of copied logic ---
}


describe('Index.ts Action Logic', () => {
  let testSaveData: SaveData;
  const mockShowMessage = mockSetContent; // blessed.text.setContent is showMessage
  const mockRefreshDisplay = jest.fn();
  const mockFocusList = mockFocus;


  beforeEach(() => {
    jest.clearAllMocks();

    testSaveData = getDefaultSaveData(); // Global save data for tests
    currentSaveData = testSaveData; // Link global to test-scoped one for helpers
    currentStoneDetails = null;
    opponentQueue = [];
    gamePrngInstance = seedrandom('test-seed-actions'); // Separate seed for actions

    mockGamePrng.mockImplementation(() => gamePrngInstance()); // Default PRNG behavior

    // Mock UI elements that would be set up by showMainMenu
    mockMenuListBox = { focus: mockFocusList };
    mockMessageLine = { setContent: mockShowMessage, screen: {}, setFront: jest.fn() }; // screen object for checks
    mockCurrentStoneInfoBox = { setContent: jest.fn(), screen: {} };


    (loadData as jest.Mock).mockReturnValue(testSaveData);

    // Mock stone creation/generation
    let nextStoneId = 1000;
    mockGenerateNewStoneSeed.mockImplementation(() => nextStoneId++);
    mockCreateStone.mockImplementation((seed: number) => ({
      seed,
      color: 'TestColor',
      shape: 'TestShape',
      rarity: 50,
      hardness: 0.5,
      magic: 50,
      weight: 50,
      createdAt: Date.now(),
    }));
  });

  describe('Open Action', () => {
    beforeEach(() => {
      testSaveData.stones = []; // Start with no stones for addStoneToInventory to work cleanly
      testSaveData.currentStoneSeed = 123; // A seed for the stone to be "opened"

      // Add the stone to be opened to the inventory initially for filter to work
      const stoneToOpenSeed = 123; // Use a raw seed
      const stoneToOpen = { // Manually create the object or use originalCreateStone if complex
        seed: stoneToOpenSeed,
        color: 'SetupColor', shape: 'SetupShape', rarity: 10, hardness: 0.1, magic: 10, weight: 10, createdAt: Date.now() - 1000
      };
      // If mockCreateStone is used above, we need to clear it if we only want to count calls within the action
      // For clarity, let's avoid calling the mock we are testing (mockCreateStone) in the setup for that test.
      // So, if stoneToOpen needs to be a "mocked" type, construct it manually.

      addStoneToInventory(stoneToOpen);
      currentSaveData.currentStoneSeed = stoneToOpen.seed;
      updateCurrentStoneDetails(); // Set currentStoneDetails for the action context

      // Clear mocks that might have been called during setup and are checked in tests
      mockCreateStone.mockClear();
      mockGenerateNewStoneSeed.mockClear(); // Good practice if it were called
      mockShowMessage.mockClear();
      (saveData as jest.Mock).mockClear();

    });

    const getActionDependencies = () => ({
      currentSaveData: testSaveData,
      currentStoneDetails: currentStoneDetails, // Use the global one updated by beforeEach
      gamePrng: mockGamePrng,
      showMessageMock: mockShowMessage,
      addStoneToInventoryFn: addStoneToInventory, // Use the helper that modifies testSaveData.stones
      updateCurrentStoneDetailsFn: updateCurrentStoneDetails, // Use helper that modifies global currentStoneDetails
      refreshCurrentStoneDisplayMock: mockRefreshDisplay,
      saveDataMock: saveData as jest.Mock,
      focusListMock: mockFocusList,
      getCurrentOpponentFn: getCurrentOpponentLocal, // Use the local test helper
    });

    test('should always create 1 stone if no extra chances hit', () => {
      mockGamePrng
        .mockReturnValueOnce(0.15) // Fails 10% chance for 2nd stone
        .mockReturnValueOnce(0.02); // Fails 1% chance for 3rd stone

      const initialStoneCount = testSaveData.stones.length; // Should be 1 (the stone to open)

      testMenuActionCallback('Open', getActionDependencies());

      // Opened stone is removed (-1), one new stone is added (+1)
      expect(testSaveData.stones.length).toBe(initialStoneCount -1 + 1);
      expect(mockCreateStone).toHaveBeenCalledTimes(1); // Only one new stone created
      expect(saveData).toHaveBeenCalledWith(testSaveData);
      expect(mockShowMessage).toHaveBeenCalledWith(expect.stringContaining('Obtained 1 new stone(s)'));
    });

    test('should create 2 stones if 10% chance hits (and 1% fails)', () => {
      mockGamePrng
        .mockReturnValueOnce(0.05) // Hits 10% chance for 2nd stone
        .mockReturnValueOnce(0.02); // Fails 1% chance for 3rd stone

      const initialStoneCount = testSaveData.stones.length;
      testMenuActionCallback('Open', getActionDependencies());

      // Opened stone removed (-1), two new stones added (+2)
      expect(testSaveData.stones.length).toBe(initialStoneCount -1 + 2);
      expect(mockCreateStone).toHaveBeenCalledTimes(2);
      expect(saveData).toHaveBeenCalledWith(testSaveData);
      expect(mockShowMessage).toHaveBeenCalledWith(expect.stringContaining('Obtained 2 new stone(s)'));
    });

    test('should create 2 stones if 1% chance hits (and 10% fails) - (logic check: current code is sequential)', () => {
      // This tests the sequential nature: if 10% fails, 1% is still checked.
      mockGamePrng
        .mockReturnValueOnce(0.15) // Fails 10% chance
        .mockReturnValueOnce(0.005); // Hits 1% chance

      const initialStoneCount = testSaveData.stones.length;
      testMenuActionCallback('Open', getActionDependencies());

      expect(testSaveData.stones.length).toBe(initialStoneCount -1 + 2); // Stone to open (-1), stone1 (+1), stone3 (+1)
      expect(mockCreateStone).toHaveBeenCalledTimes(2); // Stone1 and Stone3
      expect(saveData).toHaveBeenCalledWith(testSaveData);
      expect(mockShowMessage).toHaveBeenCalledWith(expect.stringContaining('Obtained 2 new stone(s)'));
    });

    test('should create 3 stones if both 10% and 1% chances hit', () => {
      mockGamePrng
        .mockReturnValueOnce(0.05) // Hits 10% chance
        .mockReturnValueOnce(0.005); // Hits 1% chance

      const initialStoneCount = testSaveData.stones.length;
      testMenuActionCallback('Open', getActionDependencies());

      expect(testSaveData.stones.length).toBe(initialStoneCount -1 + 3);
      expect(mockCreateStone).toHaveBeenCalledTimes(3);
      expect(saveData).toHaveBeenCalledWith(testSaveData);
      expect(mockShowMessage).toHaveBeenCalledWith(expect.stringContaining('Obtained 3 new stone(s)'));
    });

    test('should show message if no currentStoneSeed to open', () => {
      testSaveData.currentStoneSeed = null;
      updateCurrentStoneDetails(); // currentStoneDetails becomes null

      testMenuActionCallback('Open', getActionDependencies());

      expect(mockShowMessage).toHaveBeenCalledWith('No current stone to open!');
      expect(saveData).not.toHaveBeenCalled();
    });
  });

  describe('Fight Action', () => {
    let playerStone: StoneQualities;
    let opponentStone: StoneQualities;
    const getActionDependencies = () => ({
      currentSaveData: testSaveData,
      currentStoneDetails: currentStoneDetails,
      gamePrng: mockGamePrng,
      showMessageMock: mockShowMessage,
      addStoneToInventoryFn: addStoneToInventory,
      updateCurrentStoneDetailsFn: updateCurrentStoneDetails,
      refreshCurrentStoneDisplayMock: mockRefreshDisplay,
      saveDataMock: saveData as jest.Mock,
      focusListMock: mockFocusList,
      getCurrentOpponentFn: getCurrentOpponentLocal,
    });

    beforeEach(() => {
      playerStone = { seed: 1, rarity: 70, hardness: 0.7, magic: 70, weight: 70, color: 'red', shape: 'cube', createdAt: Date.now() };
      opponentStone = { seed: 2, rarity: 60, hardness: 0.6, magic: 60, weight: 60, color: 'blue', shape: 'sphere', createdAt: Date.now() };

      testSaveData.stones = [playerStone];
      testSaveData.currentStoneSeed = playerStone.seed;
      updateCurrentStoneDetails(); // Sets currentStoneDetails to playerStone

      opponentQueue = [opponentStone]; // Setup global opponentQueue for getCurrentOpponentLocal
      testSaveData.opponents_index = 0;
      testSaveData.currency = 100;

      // Mock calculateStonePower returns
      mockCalculateStonePower.mockImplementation((stone: StoneQualities) => {
        if (stone.seed === playerStone.seed) return 100; // Player base power
        if (stone.seed === opponentStone.seed) return 80; // Opponent base power
        return 50; // Default
      });
    });

    test('Win scenario: player power > opponent power, gets currency, 20% chance for stone', () => {
      mockGamePrng
        .mockReturnValueOnce(0)    // Player variance (e.g., 100 * (1 + (0 * 0.3 - 0.15))) = 100 * 0.85 = 85
        .mockReturnValueOnce(0)    // Opponent variance (e.g., 80 * (1 + (0 * 0.3 - 0.15))) = 80 * 0.85 = 68
                                    // Player (85) > Opponent (68) -> WIN
        .mockReturnValueOnce(0.05); // Hits 20% chance for extra stone

      const initialCurrency = testSaveData.currency;
      const initialStoneCount = testSaveData.stones.length;
      const initialOpponentIndex = testSaveData.opponents_index;

      testMenuActionCallback('Fight', getActionDependencies());

      expect(testSaveData.currency).toBe(initialCurrency + 10);
      expect(testSaveData.stones.length).toBe(initialStoneCount + 1); // Extra stone
      expect(mockCreateStone).toHaveBeenCalledTimes(1); // For the extra stone
      expect(mockShowMessage).toHaveBeenCalledWith(expect.stringContaining('You WIN! +10 currency.'));
      expect(mockShowMessage).toHaveBeenCalledWith(expect.stringContaining('You found an extra stone!'));
      expect(testSaveData.opponents_index).toBe(initialOpponentIndex + 1);
      expect(saveData).toHaveBeenCalledWith(testSaveData);
    });

    test('Win scenario: player power > opponent power, gets currency, NO extra stone', () => {
      mockGamePrng
        .mockReturnValueOnce(0)    // Player variance
        .mockReturnValueOnce(0)    // Opponent variance -> Win
        .mockReturnValueOnce(0.25); // Fails 20% chance for extra stone

      const initialCurrency = testSaveData.currency;
      const initialStoneCount = testSaveData.stones.length;

      testMenuActionCallback('Fight', getActionDependencies());

      expect(testSaveData.currency).toBe(initialCurrency + 10);
      expect(testSaveData.stones.length).toBe(initialStoneCount); // No extra stone
      expect(mockCreateStone).not.toHaveBeenCalled();
      expect(mockShowMessage).toHaveBeenCalledWith(expect.stringContaining('You WIN! +10 currency.'));
      expect(mockShowMessage).not.toHaveBeenCalledWith(expect.stringContaining('You found an extra stone!'));
      expect(saveData).toHaveBeenCalledWith(testSaveData);
    });

    test('Loss scenario: player power < opponent power, 30% chance for stone destruction', () => {
      mockCalculateStonePower.mockImplementation((stone: StoneQualities) => {
        if (stone.seed === playerStone.seed) return 80;  // Player base power
        if (stone.seed === opponentStone.seed) return 100; // Opponent base power
        return 50;
      });
      mockGamePrng
        .mockReturnValueOnce(0)    // Player variance (e.g., 80 * 0.85 = 68)
        .mockReturnValueOnce(0)    // Opponent variance (e.g., 100 * 0.85 = 85)
                                    // Player (68) < Opponent (85) -> LOSS
        .mockReturnValueOnce(0.1);  // Hits 30% chance for stone destruction

      const initialCurrency = testSaveData.currency;
      const initialStoneCount = testSaveData.stones.length; // is 1
      const initialOpponentIndex = testSaveData.opponents_index;

      testMenuActionCallback('Fight', getActionDependencies());

      expect(testSaveData.currency).toBe(initialCurrency); // No currency change
      expect(testSaveData.stones.length).toBe(initialStoneCount - 1); // Stone destroyed
      expect(currentStoneDetails).toBeNull(); // currentStoneDetails should be updated
      expect(testSaveData.currentStoneSeed).toBeNull(); // No other stones left
      expect(mockShowMessage).toHaveBeenCalledWith(expect.stringContaining('You LOST.'));
      expect(mockShowMessage).toHaveBeenCalledWith(expect.stringContaining('Your stone was destroyed!'));
      expect(testSaveData.opponents_index).toBe(initialOpponentIndex + 1);
      expect(saveData).toHaveBeenCalledWith(testSaveData);
    });

    test('Loss scenario: player power < opponent power, NO stone destruction', () => {
      mockCalculateStonePower.mockImplementation((stone: StoneQualities) => {
        if (stone.seed === playerStone.seed) return 80;
        if (stone.seed === opponentStone.seed) return 100;
        return 50;
      });
      mockGamePrng
        .mockReturnValueOnce(0)    // Player variance
        .mockReturnValueOnce(0)    // Opponent variance -> Loss
        .mockReturnValueOnce(0.35); // Fails 30% chance for stone destruction

      const initialStoneCount = testSaveData.stones.length;
      testMenuActionCallback('Fight', getActionDependencies());

      expect(testSaveData.stones.length).toBe(initialStoneCount); // Stone NOT destroyed
      expect(currentStoneDetails?.seed).toBe(playerStone.seed); // Still the same stone
      expect(mockShowMessage).toHaveBeenCalledWith(expect.stringContaining('You LOST.'));
      expect(mockShowMessage).not.toHaveBeenCalledWith(expect.stringContaining('Your stone was destroyed!'));
      expect(saveData).toHaveBeenCalledWith(testSaveData);
    });

    test('Tie scenario: player power === opponent power', () => {
       mockCalculateStonePower.mockImplementation((stone: StoneQualities) => {
        if (stone.seed === playerStone.seed) return 90;
        if (stone.seed === opponentStone.seed) return 90; // Base powers equal
        return 50;
      });
      // Variances could make them unequal, but let's assume they stay equal for simplicity
      // or that the core logic handles P1 * var1 === P2 * var2
      // For this test, the key is that the `else` branch for TIE is hit.
      // The logic `playerPower *= 1 + (csdGamePrng() * 0.3 - 0.15);` will be called.
      // If gamePrng returns same for both, they will be equal.
      mockGamePrng.mockReturnValue(0.5); // Make variance calculations yield same factor

      const initialCurrency = testSaveData.currency;
      const initialStoneCount = testSaveData.stones.length;
      const initialOpponentIndex = testSaveData.opponents_index;

      testMenuActionCallback('Fight', getActionDependencies());

      expect(testSaveData.currency).toBe(initialCurrency);
      expect(testSaveData.stones.length).toBe(initialStoneCount);
      expect(mockShowMessage).toHaveBeenCalledWith(expect.stringContaining("It's a TIE."));
      expect(testSaveData.opponents_index).toBe(initialOpponentIndex + 1);
      expect(saveData).toHaveBeenCalledWith(testSaveData);
    });

    test('should show message if no player stone selected', () => {
      currentSaveData.currentStoneSeed = null; // Ensure no current stone
      updateCurrentStoneDetails(); // currentStoneDetails will be null

      testMenuActionCallback('Fight', getActionDependencies());
      expect(mockShowMessage).toHaveBeenCalledWith('No stone selected to fight with!');
      expect(saveData).not.toHaveBeenCalled();
    });

    test('should show message if no opponents available', () => {
      opponentQueue = []; // No opponents in the global queue for getCurrentOpponentLocal

      testMenuActionCallback('Fight', getActionDependencies());
      expect(mockShowMessage).toHaveBeenCalledWith('No opponents available to fight!');
      expect(saveData).not.toHaveBeenCalled();
    });
  });

  // TODO: Add tests for Salvage if its logic is also in testMenuActionCallback

  // Basic test for mocked save and load (from original file, slightly adapted)
  describe('Store interaction', () => {
    test('saveData mock is called', () => {
      (saveData as jest.Mock)(currentSaveData);
      expect(saveData).toHaveBeenCalledWith(currentSaveData);
    });

    test('loadData mock returns default save data', () => {
      const data = (loadData as jest.Mock)();
      expect(data).toEqual(getDefaultSaveData());
    });
  });
});

describe('Original Index.ts tests (Inventory and Opponent Queue)', () => {
  // These are the tests from the original file, refactored to use the
  // global currentSaveData, gamePrng (via mockGamePrng), and opponentQueue
  // and the local helper functions for addStoneToInventory and generateOpponentQueue.
  // Note: createStone and generateNewStoneSeed are mocked here too.

  let prngForQueueGeneration: seedrandom.PRNG;

  beforeEach(() => {
    currentSaveData = getDefaultSaveData();
    prngForQueueGeneration = seedrandom('test-seed-original'); // Consistent seed
    opponentQueue = [];
    (saveData as jest.Mock).mockClear();
    (loadData as jest.Mock).mockReturnValue(getDefaultSaveData());

    // Reset mocks for stone creation for these tests if they behave differently
    let nextStoneId = 1;
    mockGenerateNewStoneSeed.mockImplementation(() => nextStoneId++);
    mockCreateStone.mockImplementation((seed: number) => ({
      seed,
      color: `Color-${seed}`,
      shape: `Shape-${seed}`,
      rarity: seed % 101,
      hardness: (seed % 101) / 100,
      magic: seed % 101,
      weight: (seed % 100) + 1,
      createdAt: Date.now(),
    }));
    mockGamePrng.mockImplementation(() => prngForQueueGeneration()); // Use this specific PRNG for queue tests
  });

  describe('Inventory Management (addStoneToInventory)', () => {
    test('adding a stone increases inventory size', () => {
      expect(currentSaveData.stones.length).toBe(0);
      const stone1 = mockCreateStone(1); // Use mocked createStone
      addStoneToInventory(stone1);
      expect(currentSaveData.stones.length).toBe(1);
      expect(currentSaveData.stones[0]).toEqual(stone1);
    });

    test('inventory remains sorted by createdAt after adding multiple stones', () => {
      const timeOrigin = Date.now();
      const stoneOld = { ...mockCreateStone(100), createdAt: timeOrigin };
      const stoneNew = { ...mockCreateStone(200), createdAt: timeOrigin + 10 };
      const stoneReallyOld = { ...mockCreateStone(300), createdAt: timeOrigin - 10 };

      addStoneToInventory(stoneOld);
      addStoneToInventory(stoneNew);
      addStoneToInventory(stoneReallyOld);

      expect(currentSaveData.stones.length).toBe(3);
      expect(currentSaveData.stones[0].seed).toBe(stoneReallyOld.seed);
      expect(currentSaveData.stones[1].seed).toBe(stoneOld.seed);
      expect(currentSaveData.stones[2].seed).toBe(stoneNew.seed);
    });
  });

  describe('Opponent Queue Logic (using local helpers)', () => {
    describe('generateOpponentQueueLocal', () => {
      test('generates the specified count of stones', () => {
        const count = 5;
        const queue = generateOpponentQueueLocal(mockGamePrng, count);
        expect(queue.length).toBe(count);
      });

      test('all generated stones are valid StoneQualities objects from mocks', () => {
        const queue = generateOpponentQueueLocal(mockGamePrng, 3);
        queue.forEach((stone) => {
          expect(stone).toHaveProperty('seed');
          expect(stone.color).toMatch(/^Color-\d+$/); // From mockCreateStone
        });
      });
    });

    describe('getCurrentOpponentLocal', () => {
      test('returns an opponent when index is valid', () => {
        opponentQueue = generateOpponentQueueLocal(mockGamePrng, 5);
        currentSaveData.opponents_index = 2;
        const opponent = getCurrentOpponentLocal();
        expect(opponent).toEqual(opponentQueue[2]);
      });

      test('regenerates queue if index is out of bounds', () => {
        opponentQueue = generateOpponentQueueLocal(mockGamePrng, 3);
        currentSaveData.opponents_index = 3; // Out of bounds
        const initialQueueFirstStoneSeed = opponentQueue[0].seed;

        const newOpponent = getCurrentOpponentLocal();

        expect(saveData).toHaveBeenCalledWith(currentSaveData);
        expect(currentSaveData.opponents_index).toBe(0);
        expect(opponentQueue.length).toBe(100); // Default regeneration count
        expect(newOpponent?.seed).not.toEqual(initialQueueFirstStoneSeed);
      });
    });
  });
});
