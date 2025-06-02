import { render, screen, cleanup } from '@solidjs/testing-library';
import App from '@src/App';
import { currentSaveData, setCurrentSaveData, getDefaultSaveData } from '@src/store'; // To control game state for rendering

describe('App Component', () => {
  beforeEach(() => {
    // Reset to a known state before each test, e.g., no game loaded
    setCurrentSaveData(getDefaultSaveData());
    // Manually ensure localStorage is clear if App component interacts with it on mount beyond store
    localStorage.clear(); 
  });

  afterEach(() => {
    cleanup();
  });

  test('should render StartMenu when no game seed is present', () => {
    setCurrentSaveData(getDefaultSaveData()); // Ensure gameSeed is null
    render(() => <App />);
    // Assuming StartMenu component contains text "New Player Setup"
    expect(screen.getByText(/New Player Setup/i)).toBeInTheDocument();
  });

  test('should render MainGameArea when a game seed is present', async () => {
    // Set a gameSeed to simulate an active game
    setCurrentSaveData({ ...getDefaultSaveData(), gameSeed: 12345, playerName: "TestPlayer" });
    
    render(() => <App />);
    // MainGameArea includes StoneInfo, which displays player name and currency.
    // It also includes MainMenu, StonePreview.
    // Check for text that would appear in MainGameArea.
    // For example, StoneInfo displays player name.
    expect(screen.getByText(/TestPlayer/i)).toBeInTheDocument(); // From StoneInfo via MainGameArea
    expect(screen.getByText(/Main Menu/i)).toBeInTheDocument(); // From MainMenu heading
  });
});
