import { render, screen, fireEvent, cleanup } from '@solidjs/testing-library';
import StartMenu from '@src/components/StartMenu';
import { currentSaveData, setCurrentSaveData, saveData, initializeGamePrng, getDefaultSaveData } from '@src/store';
import 'jest-localstorage-mock'; // Mock localStorage for saveData calls

// Mock utility functions used by StartMenu
jest.mock('@src/utils', () => ({
  logMessage: jest.fn(),
  showMessage: jest.fn(),
}));

// Mock store functions (saveData and initializeGamePrng are key)
// We want to verify they are called, not their full side effects here.
jest.mock('@src/store', () => {
  const originalStore = jest.requireActual('@src/store');
  return {
    ...originalStore,
    saveData: jest.fn(),
    initializeGamePrng: jest.fn(),
    // We will spy on setCurrentSaveData or check its effects directly
  };
});

// Mock stone creation functions
jest.mock('@src/stone', () => ({
  ...jest.requireActual('@src/stone'),
  createStone: jest.fn((seed) => ({ 
    seed, name: `Stone ${seed}`, color: 'TestColor', shape: 'TestShape', 
    rarity: 50, hardness: 0.5, magic: 50, weight: 50, createdAt: Date.now() 
  })),
  generateNewStoneSeed: jest.fn(() => Math.floor(Math.random() * 100000)), // Return a random seed
  mulberry32: jest.fn((seed) => () => seed / 100000), // Simple PRNG mock for seed generation
}));

describe('StartMenu Component', () => {
  beforeEach(() => {
    setCurrentSaveData(getDefaultSaveData()); // Ensure clean state
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(cleanup);

  test('should render input fields and start button', () => {
    render(() => <StartMenu />);
    expect(screen.getByLabelText(/Player Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Game Seed/i)).toBeInTheDocument();
    expect(screen.getByText('Start Game')).toBeInTheDocument();
  });

  test('entering player name and clicking Start Game updates playerName in store', () => {
    render(() => <StartMenu />);
    fireEvent.input(screen.getByLabelText(/Player Name/i), { target: { value: 'Test Player' } });
    fireEvent.click(screen.getByText('Start Game'));
    
    expect(currentSaveData.playerName).toBe('Test Player');
    expect(initializeGamePrng).toHaveBeenCalled(); // Should be called with a seed
    expect(saveData).toHaveBeenCalled();
    // Check if showMessage was called regarding game start
    const { showMessage } = require('@src/utils');
    expect(showMessage).toHaveBeenCalledWith(expect.stringContaining('Game started for Test Player'), expect.any(Number), 'success');
  });

  test('leaving seed blank and clicking Start Game generates a random seed', () => {
    render(() => <StartMenu />);
    fireEvent.input(screen.getByLabelText(/Player Name/i), { target: { value: 'RandomSeedPlayer' } });
    fireEvent.click(screen.getByText('Start Game'));

    expect(currentSaveData.gameSeed).not.toBeNull();
    expect(typeof currentSaveData.gameSeed).toBe('number');
    expect(initializeGamePrng).toHaveBeenCalledWith(currentSaveData.gameSeed);
    expect(saveData).toHaveBeenCalled();
    const { showMessage } = require('@src/utils');
    expect(showMessage).toHaveBeenCalledWith(expect.stringContaining('No seed entered. Using random seed:'), expect.any(Number), 'info');
  });

  test('entering a valid number as seed uses that seed', () => {
    render(() => <StartMenu />);
    fireEvent.input(screen.getByLabelText(/Game Seed/i), { target: { value: '12345' } });
    fireEvent.click(screen.getByText('Start Game'));

    expect(currentSaveData.gameSeed).toBe(12345);
    expect(initializeGamePrng).toHaveBeenCalledWith(12345);
    expect(saveData).toHaveBeenCalled();
  });
  
  test('entering non-numeric string as seed generates a derived seed', () => {
    render(() => <StartMenu />);
    fireEvent.input(screen.getByLabelText(/Game Seed/i), { target: { value: 'testseedstring' } });
    fireEvent.click(screen.getByText('Start Game'));

    expect(currentSaveData.gameSeed).not.toBeNull();
    expect(typeof currentSaveData.gameSeed).toBe('number');
    expect(currentSaveData.gameSeed).not.toBe(NaN); // Ensure it's a valid number
    expect(initializeGamePrng).toHaveBeenCalledWith(currentSaveData.gameSeed);
    expect(saveData).toHaveBeenCalled();
    const { showMessage } = require('@src/utils');
    expect(showMessage).toHaveBeenCalledWith(expect.stringContaining('Invalid number for seed. Generated one based on text:'), expect.any(Number), 'info');
  });

  test('starting a game should create a first stone and equip it', () => {
    render(() => <StartMenu />);
    fireEvent.click(screen.getByText('Start Game'));

    expect(currentSaveData.stones.length).toBe(1);
    expect(currentSaveData.equippedStone).not.toBeNull();
    expect(currentSaveData.equippedStone?.seed).toBe(currentSaveData.stones[0].seed);
    const { createStone, generateNewStoneSeed: mockGenSeed } = require('@src/stone');
    expect(mockGenSeed).toHaveBeenCalled(); // generateNewStoneSeed from stone.ts
    expect(createStone).toHaveBeenCalled(); // createStone from stone.ts
  });
});
