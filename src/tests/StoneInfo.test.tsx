import { render, screen, cleanup } from '@solidjs/testing-library';
import StoneInfo from '@src/components/StoneInfo';
import { currentSaveData, setCurrentSaveData, getDefaultSaveData, currentStoneDetails, setCurrentStoneDetails } from '@src/store';
import { createStone, StoneQualities } from '@src/stone'; // Import StoneQualities here

describe('StoneInfo Component', () => {
  beforeEach(() => {
    // Reset store states
    setCurrentSaveData(getDefaultSaveData());
    setCurrentStoneDetails(null);
  });

  afterEach(cleanup);

  test('should display "No stone equipped" when no stone is detailed', () => {
    render(() => <StoneInfo />);
    expect(screen.getByText(/No stone equipped or details available./i)).toBeInTheDocument();
  });

  test('should display stone details when a stone is set in currentStoneDetails', () => {
    const testStone: StoneQualities = {
      ...createStone(123),
      name: 'Test Rock',
      color: 'Azure',
      shape: 'Obelisk',
      rarity: 77,
      hardness: 0.88,
      weight: 55,
      magic: 33,
    };
    setCurrentStoneDetails(testStone);

    render(() => <StoneInfo />);
    expect(screen.getByText(/Test Rock/i)).toBeInTheDocument();
    expect(screen.getByText(/Seed: 123/i)).toBeInTheDocument();
    expect(screen.getByText(/Azure/i)).toBeInTheDocument();
    expect(screen.getByText(/Obelisk/i)).toBeInTheDocument();
    expect(screen.getByText(/Rarity: 77/i)).toBeInTheDocument();
    expect(screen.getByText(/Hardness: 0.88/i)).toBeInTheDocument(); // toFixed(2)
    expect(screen.getByText(/Weight: 55.00/i)).toBeInTheDocument(); // toFixed(2)
    expect(screen.getByText(/Magic: 33.00/i)).toBeInTheDocument(); // toFixed(2)
  });

  test('should display current player name and currency from currentSaveData', () => {
    setCurrentSaveData({
      ...getDefaultSaveData(),
      playerName: 'Hero',
      currency: 500,
    });

    render(() => <StoneInfo />);
    expect(screen.getByText(/Player: Hero/i)).toBeInTheDocument();
    expect(screen.getByText(/Currency: \$500/i)).toBeInTheDocument(); // Assuming $ sign is hardcoded
  });
  
  test('should update when currentStoneDetails changes', () => {
    const stone1 = { ...createStone(1), name: "Stone One" };
    const stone2 = { ...createStone(2), name: "Stone Two" };

    setCurrentStoneDetails(stone1);
    render(() => <StoneInfo />); // No rerender needed
    expect(screen.getByText(/Stone One/i)).toBeInTheDocument();

    setCurrentStoneDetails(stone2);
    // Solid's reactivity should update the rendered component
    expect(screen.queryByText(/Stone One/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Stone Two/i)).toBeInTheDocument();
  });

  test('should update when currentSaveData (currency, playerName) changes', () => {
    setCurrentSaveData(s => ({ ...s, playerName: "PlayerA", currency: 100 }));
    render(() => <StoneInfo />);
    expect(screen.getByText(/PlayerA/i)).toBeInTheDocument();
    expect(screen.getByText(/\$100/i)).toBeInTheDocument();

    setCurrentSaveData(s => ({ ...s, playerName: "PlayerB", currency: 200 }));
    expect(screen.queryByText(/PlayerA/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\$100/i)).not.toBeInTheDocument();
    expect(screen.getByText(/PlayerB/i)).toBeInTheDocument();
    expect(screen.getByText(/\$200/i)).toBeInTheDocument();
  });
});
