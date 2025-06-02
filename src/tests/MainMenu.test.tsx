import { render, screen, fireEvent, cleanup } from '@solidjs/testing-library';
import MainMenu from '@src/components/MainMenu';
import { currentSaveData, setCurrentSaveData, getDefaultSaveData, currentStoneDetails, setCurrentStoneDetails, saveData } from '@src/store';
import { createStone } from '@src/stone';
import 'jest-localstorage-mock'; // Mock localStorage for saveData calls

// Mock utility functions used by MainMenu
jest.mock('@src/utils', () => ({
  logMessage: jest.fn(),
  showMessage: jest.fn(),
}));

// Mock store functions that are not the primary target of these UI tests
// but are called by button handlers.
import { StoneQualities } from '@src/stone'; // Import the actual type

jest.mock('@src/store', () => {
  const originalStore = jest.requireActual('@src/store');
  // Define a simple mock for createStone within this scope for the opponent mock
  const mockCreateStoneForOpponent = (seed: number): StoneQualities => ({ 
    seed, name: `OpponentStone ${seed}`, color: 'Grey', shape: 'Shard', 
    rarity: 10, hardness: 0.1, magic: 5, weight: 10, createdAt: Date.now() 
  });
  return {
    ...originalStore,
    saveData: jest.fn(), // Mock saveData
    addStoneToInventory: jest.fn((stone: StoneQualities) => { // Mock addStoneToInventory to update the store for testing UI reaction
      originalStore.setCurrentSaveData(originalStore.produce((s: any) => { // s can be 'any' or full SaveData type if simple
        s.stones.push(stone);
        s.stones.sort((a: StoneQualities, b: StoneQualities) => a.createdAt - b.createdAt);
      }));
    }),
    getCurrentOpponent: jest.fn(() => ({ // Mock opponent
        id: 'opponent1', name: 'Test Opponent', stones: [mockCreateStoneForOpponent(999)] 
    })), 
  };
});


describe('MainMenu Component', () => {
  const mockToggleInventory = jest.fn();

  beforeEach(() => {
    setCurrentSaveData(getDefaultSaveData());
    setCurrentStoneDetails(null);
    localStorage.clear();
    jest.clearAllMocks(); // Clear all mocks including those from jest.mock
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
    setCurrentStoneDetails(null); // Ensure no stone is equipped
    render(() => <MainMenu toggleInventory={mockToggleInventory} />);
    expect(screen.getByText('Crack Open Stone')).toBeDisabled();
    expect(screen.getByText('Fight Opponent')).toBeDisabled();
    expect(screen.getByText('Salvage Stone')).toBeDisabled();
  });

  test('action buttons should be enabled if a stone is equipped', () => {
    const testStone = createStone(123);
    setCurrentSaveData('equippedStone', testStone);
    setCurrentStoneDetails(testStone);
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

  test('Crack Open Stone button should attempt to crack open when a stone is equipped', () => {
    const testStone = createStone(1);
    setCurrentSaveData(s => ({
      ...s,
      stones: [testStone],
      equippedStone: testStone,
    }));
    setCurrentStoneDetails(testStone);

    render(() => <MainMenu toggleInventory={mockToggleInventory} />);
    fireEvent.click(screen.getByText('Crack Open Stone'));
    
    // Check if underlying logic (like saveData) was called.
    // More detailed checks would involve asserting changes in store state,
    // which requires careful mocking or observation.
    expect(saveData).toHaveBeenCalled();
    // We can also check if showMessage was called with success (from mock)
    const { showMessage } = require('@src/utils');
    expect(showMessage).toHaveBeenCalledWith(expect.stringContaining('Cracked open stone'), expect.any(Number), 'success');
  });
  
   test('Fight button should attempt to fight when a stone is equipped', () => {
    const playerStone = createStone(100);
    setCurrentSaveData(s => ({
        ...s,
        stones: [playerStone],
        equippedStone: playerStone,
        currency: 50,
    }));
    setCurrentStoneDetails(playerStone);

    render(() => <MainMenu toggleInventory={mockToggleInventory} />);
    fireEvent.click(screen.getByText('Fight Opponent'));

    expect(saveData).toHaveBeenCalled();
    const { showMessage } = require('@src/utils');
    // Outcome of fight depends on PRNG, check for any message
    expect(showMessage).toHaveBeenCalledWith(expect.stringContaining('Your stone'), expect.any(Number), expect.any(String));
  });

  test('Salvage Stone button should attempt to salvage when a stone is equipped', () => {
    const testStone = createStone(1);
    setCurrentSaveData(s => ({
      ...s,
      stones: [testStone],
      equippedStone: testStone,
      currency: 10,
    }));
    setCurrentStoneDetails(testStone);

    render(() => <MainMenu toggleInventory={mockToggleInventory} />);
    fireEvent.click(screen.getByText('Salvage Stone'));
    
    expect(saveData).toHaveBeenCalled();
    const { showMessage } = require('@src/utils');
    expect(showMessage).toHaveBeenCalledWith(expect.stringContaining('Salvaged stone for'), expect.any(Number), 'success');
    // Check if currency changed as expected (this requires store to be updated by mocked salvage)
    // This test would be more robust if the salvage logic was directly tested via store functions.
  });

});
