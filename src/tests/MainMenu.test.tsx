import { render, screen, fireEvent, cleanup } from '@solidjs/testing-library';
import MainMenu from '@src/components/MainMenu';
import type { GameState, StoneQualities, Opponent } from '@src/interfaces'; // Import types
import { createStone } from '@src/stone'; // For creating test stones

// Mock utility functions used by MainMenu
jest.mock('@src/utils', () => ({
  logMessage: jest.fn(),
  showMessage: jest.fn(),
}));

// Mock service instances (not used directly by component, but actions are)
jest.mock('@src/services/serviceInstances', () => ({
  randomServiceInstance: {
    getRandom: jest.fn(() => 0.5), // Default mock for getRandom
    generateSeed: jest.fn(() => 12345),
  },
  fightServiceInstance: {
    executeFight: jest.fn(),
  },
  // gameStateManagerInstance is not directly used by component, actions are.
}));


// Mock the refactored store
const mockEquippedStoneDetails = jest.fn();
const mockCurrentOpponentStore = jest.fn();
const mockSaveGame = jest.fn(() => Promise.resolve());
const mockUpdateCurrency = jest.fn();
const mockAddStoneToInventory = jest.fn();
const mockRemoveStoneFromInventory = jest.fn();
const mockEquipStone = jest.fn();
const mockAdvanceOpponent = jest.fn();

jest.mock('@src/store', () => ({
  // __esModule: true, // Not needed if not using default export for the store module itself
  // gameState needs to be an object that matches GameState structure for component to read
  gameState: { 
    currency: 100, 
    playerStats: { name: "TestPlayer" },
    // ... other necessary gameState properties for MainMenu if it reads them directly
  } as GameState, 
  equippedStoneDetails: mockEquippedStoneDetails,
  currentOpponentStore: mockCurrentOpponentStore,
  saveGame: mockSaveGame,
  updateCurrency: mockUpdateCurrency,
  addStoneToInventory: mockAddStoneToInventory,
  removeStoneFromInventory: mockRemoveStoneFromInventory,
  equipStone: mockEquipStone,
  advanceOpponent: mockAdvanceOpponent,
  // Re-export UI-specific utils if MainMenu imports them from store
  logMessage: jest.requireActual('@src/utils').logMessage, 
  showMessage: jest.requireActual('@src/utils').showMessage,
}));


describe('MainMenu Component', () => {
  const mockToggleInventory = jest.fn();
  const testPlayerStone = createStone(1) as StoneQualities;
  const testOpponentStone = createStone(2) as StoneQualities;
  const testOpponent: Opponent = { id: "opp1", name: "Test Opponent", stones: [testOpponentStone] };


  beforeEach(() => {
    jest.clearAllMocks(); // Clear all mocks

    // Setup default return values for store mocks
    mockEquippedStoneDetails.mockReturnValue(null);
    mockCurrentOpponentStore.mockReturnValue(null);
  });

  afterEach(cleanup);

  test('should render all main action buttons', () => {
    render(() => <MainMenu toggleInventory={mockToggleInventory} />);
    expect(screen.getByText('Crack Open Stone')).toBeInTheDocument();
    expect(screen.getByText('Fight Opponent')).toBeInTheDocument();
    expect(screen.getByText('Salvage Stone')).toBeInTheDocument();
    expect(screen.getByText('Inventory')).toBeInTheDocument();
  });

  test('action buttons should be disabled if no stone is equipped', () => {
    mockEquippedStoneDetails.mockReturnValue(null);
    render(() => <MainMenu toggleInventory={mockToggleInventory} />);
    expect(screen.getByText('Crack Open Stone')).toBeDisabled();
    expect(screen.getByText('Fight Opponent')).toBeDisabled();
    expect(screen.getByText('Salvage Stone')).toBeDisabled();
  });
  
  test('Fight button should be disabled if no opponent', () => {
    mockEquippedStoneDetails.mockReturnValue(testPlayerStone);
    mockCurrentOpponentStore.mockReturnValue(null);
    render(() => <MainMenu toggleInventory={mockToggleInventory} />);
    expect(screen.getByText('Fight Opponent')).toBeDisabled();
  });


  test('action buttons should be enabled if a stone and opponent are available (for Fight)', () => {
    mockEquippedStoneDetails.mockReturnValue(testPlayerStone);
    mockCurrentOpponentStore.mockReturnValue(testOpponentStone); // Assuming currentOpponentStore returns StoneQualities
    render(() => <MainMenu toggleInventory={mockToggleInventory} />);
    expect(screen.getByText('Crack Open Stone')).not.toBeDisabled();
    expect(screen.getByText('Fight Opponent')).not.toBeDisabled();
    expect(screen.getByText('Salvage Stone')).not.toBeDisabled();
  });

  test('Inventory button should call toggleInventory when clicked', () => {
    render(() => <MainMenu toggleInventory={mockToggleInventory} />);
    fireEvent.click(screen.getByText('Inventory'));
    expect(mockToggleInventory).toHaveBeenCalledTimes(1);
  });

  test('Crack Open Stone button calls relevant actions', async () => {
    mockEquippedStoneDetails.mockReturnValue(testPlayerStone);
    // Mock randomService for specific outcomes in crack open
    const { randomServiceInstance } = jest.requireActual('@src/services/serviceInstances');
    randomServiceInstance.getRandom
      .mockReturnValueOnce(0.5) // For first new stone seed
      .mockReturnValueOnce(0.05) // For 10% chance (gets 2nd stone)
      .mockReturnValueOnce(0.5)  // For second new stone seed
      .mockReturnValueOnce(0.5); // For 1% chance (no 3rd stone)

    render(() => <MainMenu toggleInventory={mockToggleInventory} />);
    await fireEvent.click(screen.getByText('Crack Open Stone'));
    
    expect(mockRemoveStoneFromInventory).toHaveBeenCalledWith(testPlayerStone.seed);
    expect(mockAddStoneToInventory).toHaveBeenCalledTimes(2); // Two stones created
    expect(mockEquipStone).toHaveBeenCalled(); // With seed of first new stone or null
    expect(mockSaveGame).toHaveBeenCalled();
  });
  
   test('Fight button calls fightService and relevant actions', async () => {
    mockEquippedStoneDetails.mockReturnValue(testPlayerStone);
    mockCurrentOpponentStore.mockReturnValue(testOpponentStone);

    const mockFightOutcome = {
      player: { stone: testPlayerStone, attributes: { power: 100 } },
      opponent: { stone: testOpponentStone, attributes: { power: 80 } },
      winner: 'player',
      currencyChange: 10,
      stoneLostByPlayer: false,
      newStoneGainedByPlayer: undefined,
      logMessage: 'Player wins!',
    } as FightOutcome;
    const { fightServiceInstance } = jest.requireActual('@src/services/serviceInstances');
    fightServiceInstance.executeFight.mockReturnValue(mockFightOutcome);

    render(() => <MainMenu toggleInventory={mockToggleInventory} />);
    await fireEvent.click(screen.getByText('Fight Opponent'));

    expect(fightServiceInstance.executeFight).toHaveBeenCalledWith(testPlayerStone, testOpponentStone);
    expect(mockUpdateCurrency).toHaveBeenCalledWith(10);
    expect(mockRemoveStoneFromInventory).not.toHaveBeenCalled();
    expect(mockAddStoneToInventory).not.toHaveBeenCalled();
    expect(mockAdvanceOpponent).toHaveBeenCalled();
    expect(mockSaveGame).toHaveBeenCalled();
  });

  test('Salvage Stone button calls relevant actions', async () => {
    mockEquippedStoneDetails.mockReturnValue({...testPlayerStone, rarity: 50}); // Rarity 50 for salvage value 500
    render(() => <MainMenu toggleInventory={mockToggleInventory} />);
    await fireEvent.click(screen.getByText('Salvage Stone'));
    
    expect(mockUpdateCurrency).toHaveBeenCalledWith(500); // 50 * 10
    expect(mockRemoveStoneFromInventory).toHaveBeenCalledWith(testPlayerStone.seed);
    expect(mockSaveGame).toHaveBeenCalled();
  });
});
