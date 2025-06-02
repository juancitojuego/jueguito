import { render, screen, fireEvent, cleanup } from '@solidjs/testing-library';
import StartMenu from '@src/components/StartMenu';
import type { GameState } from '@src/interfaces'; // Import GameState type
// No need to import createStone from '@src/stone' as the component doesn't call it directly.
// Mulberry32 and generateNewStoneSeed are imported by the component for client-side seed generation.

// Mock utility functions used by StartMenu
jest.mock('@src/utils', () => ({
  logMessage: jest.fn(),
  showMessage: jest.fn(),
}));

// Mock the refactored store
const mockResetGameDefaults = jest.fn();
let mockGameState: Partial<GameState> = {}; // Use Partial for initial empty mock

jest.mock('@src/store', () => ({
  // gameState is not directly read by StartMenu for its core logic, 
  // but App.tsx uses it to show/hide StartMenu. So, not strictly needed here.
  // gameState: new Proxy({}, { get: (target, prop) => mockGameState[prop as keyof GameState] }),
  resetGameDefaults: mockResetGameDefaults,
  // Re-export UI-specific utils if StartMenu imports them from store
  logMessage: jest.requireActual('@src/utils').logMessage,
  showMessage: jest.requireActual('@src/utils').showMessage,
}));

// Mock stone utilities used directly by StartMenu for seed generation
// (mulberry32, generateNewStoneSeed)
// The component imports these, so we mock them at the source.
const mockGenerateNewStoneSeed = jest.fn(() => 1234567); // Default mock generated seed
jest.mock('@src/stone', () => ({
  ...jest.requireActual('@src/stone'), // Keep other exports like COLORS, SHAPES if needed by other parts
  generateNewStoneSeed: mockGenerateNewStoneSeed,
  mulberry32: jest.fn((seed) => () => seed / 0xffffffff), // Simplified mock for mulberry32
}));


describe('StartMenu Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mockGameState if it were used for reading in StartMenu tests
    // mockGameState = { gameSeed: null }; // Example initial state for tests
  });

  afterEach(cleanup);

  test('should render input fields and start button', () => {
    render(() => <StartMenu />);
    expect(screen.getByLabelText(/Player Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Game Seed/i)).toBeInTheDocument();
    expect(screen.getByText('Start Game')).toBeInTheDocument();
  });

  test('clicking Start Game calls resetGameDefaults with player name and resolved seed', () => {
    render(() => <StartMenu />);
    fireEvent.input(screen.getByLabelText(/Player Name/i), { target: { value: 'Test Player' } });
    fireEvent.input(screen.getByLabelText(/Game Seed/i), { target: { value: '12345' } });
    fireEvent.click(screen.getByText('Start Game'));
    
    expect(mockResetGameDefaults).toHaveBeenCalledWith({
      newGameSeed: 12345,
      playerName: 'Test Player',
    });
  });

  test('clicking Start Game with blank seed generates and uses a random seed', () => {
    render(() => <StartMenu />);
    fireEvent.input(screen.getByLabelText(/Player Name/i), { target: { value: 'Random Player' } });
    fireEvent.input(screen.getByLabelText(/Game Seed/i), { target: { value: '' } }); // Blank seed
    fireEvent.click(screen.getByText('Start Game'));

    expect(mockGenerateNewStoneSeed).toHaveBeenCalled(); // From client-side random generation
    expect(mockResetGameDefaults).toHaveBeenCalledWith({
      newGameSeed: expect.any(Number), // mockGenerateNewStoneSeed returns a number
      playerName: 'Random Player',
    });
    const { showMessage } = require('@src/utils');
    expect(showMessage).toHaveBeenCalledWith(expect.stringContaining('No seed entered. Using random seed:'), expect.any(Number), 'info');
  });
  
  test('clicking Start Game with non-numeric seed generates and uses a derived seed', () => {
    render(() => <StartMenu />);
    fireEvent.input(screen.getByLabelText(/Player Name/i), { target: { value: 'Derived Player' } });
    fireEvent.input(screen.getByLabelText(/Game Seed/i), { target: { value: 'not-a-number' } });
    fireEvent.click(screen.getByText('Start Game'));

    expect(mockGenerateNewStoneSeed).toHaveBeenCalled(); // From client-side derived generation
    expect(mockResetGameDefaults).toHaveBeenCalledWith({
      newGameSeed: expect.any(Number), // mockGenerateNewStoneSeed returns a number
      playerName: 'Derived Player',
    });
    const { showMessage } = require('@src/utils');
    expect(showMessage).toHaveBeenCalledWith(expect.stringContaining('Invalid number for seed. Generated one based on text:'), expect.any(Number), 'info');
  });

  test('uses "Player" as default name if player name input is blank', () => {
    render(() => <StartMenu />);
    fireEvent.input(screen.getByLabelText(/Game Seed/i), { target: { value: '777' } });
    fireEvent.click(screen.getByText('Start Game'));

    expect(mockResetGameDefaults).toHaveBeenCalledWith({
      newGameSeed: 777,
      playerName: 'Player', // Default name
    });
  });
});
