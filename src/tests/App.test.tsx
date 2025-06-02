import { render, screen, cleanup, waitFor } from '@solidjs/testing-library';
import App from '@src/App';
import { GameState } from '@src/interfaces';

// Declare mocks before jest.mock
const mockLoadGame = jest.fn(() => Promise.resolve());
let mockGameState: GameState; 

// Helper to set the global mockGameState that the store mock will use
const setMockGameState = (newState: Partial<GameState>) => {
  mockGameState = {
    gameSeed: null, 
    playerStats: { name: 'Player' },
    currency: 0,
    stones: [],
    equippedStoneId: null,
    opponentsSeed: null,
    opponents_index: 0,
    ...newState, 
  };
};

// Mock the refactored store
jest.mock('@src/store', () => ({
  gameState: new Proxy({}, { get: (target, prop) => mockGameState[prop as keyof GameState] }),
  loadGame: mockLoadGame, 
  consoleLogMessages: () => [], 
  currentMessage: () => null,   
}));

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set a default initial state for gameState (no game loaded)
    setMockGameState({ gameSeed: null });
  });

  afterEach(cleanup);

  test('should call loadGame onMount and render StartMenu when gameSeed is null', async () => {
    render(() => <App />);
    await waitFor(() => expect(mockLoadGame).toHaveBeenCalledTimes(1));
    // After loadGame (even if it does nothing in mock), if gameSeed is still null:
    expect(screen.getByText(/New Player Setup/i)).toBeInTheDocument();
  });

  test('should render MainGameArea when gameSeed is present after loadGame', async () => {
    // Simulate loadGame populating the gameSeed
    mockLoadGame.mockImplementation(async () => {
      setMockGameState({ 
        gameSeed: 12345, 
        playerStats: { name: "TestPlayer" },
        // ... other necessary fields
      });
    });
    
    render(() => <App />);
    await waitFor(() => expect(mockLoadGame).toHaveBeenCalledTimes(1));
    
    // Now gameState.gameSeed should be 12345
    expect(screen.getByText(/TestPlayer/i)).toBeInTheDocument(); 
    expect(screen.getByText(/Main Menu/i)).toBeInTheDocument(); 
  });
});
