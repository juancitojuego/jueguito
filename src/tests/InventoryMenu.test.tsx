import { render, screen, fireEvent, cleanup } from '@solidjs/testing-library';
import InventoryMenu from '@src/components/InventoryMenu';
import { currentSaveData, setCurrentSaveData, getDefaultSaveData, setCurrentStoneDetails, saveData } from '@src/store';
import { createStone, StoneQualities } from '@src/stone'; // Import StoneQualities here
import 'jest-localstorage-mock';

// Mock utility functions
jest.mock('@src/utils', () => ({
  logMessage: jest.fn(),
  showMessage: jest.fn(),
}));

// Mock store functions if necessary, though InventoryMenu primarily reads and updates state
jest.mock('@src/store', () => {
  const originalStore = jest.requireActual('@src/store');
  return {
    ...originalStore,
    saveData: jest.fn(), // Mock saveData
  };
});

describe('InventoryMenu Component', () => {
  const mockToggleInventory = jest.fn();
  const stone1 = { ...createStone(1), name: "Ruby" };
  const stone2 = { ...createStone(2), name: "Sapphire" };
  const stone3 = createStone(3); // No name - will use seed or default display

  beforeEach(() => {
    setCurrentSaveData({
      ...getDefaultSaveData(),
      stones: [stone1, stone2, stone3],
    });
    setCurrentStoneDetails(null);
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(cleanup);

  test('should render a list of stones from currentSaveData', () => {
    render(() => <InventoryMenu toggleInventory={mockToggleInventory} />);
    expect(screen.getByText(/Ruby/i)).toBeInTheDocument();
    expect(screen.getByText(/Sapphire/i)).toBeInTheDocument();
    // Ensure the regex uniquely identifies the stone entry, e.g., by looking for more of its specific text
    const stone3Pattern = new RegExp(`${stone3.seed.toString().substring(0, 8)}\\.\\.\\s*-\\s*${stone3.color}\\s*${stone3.shape}\\s*\\(R${stone3.rarity}\\)`, "i");
    expect(screen.getByText(stone3Pattern)).toBeInTheDocument();
    expect(screen.getByText(`Your Stones (${currentSaveData.stones.length})`)).toBeInTheDocument();
  });

  test('should display "No stones in inventory" if inventory is empty', () => {
    setCurrentSaveData('stones', []);
    render(() => <InventoryMenu toggleInventory={mockToggleInventory} />);
    expect(screen.getByText('No stones in inventory.')).toBeInTheDocument();
  });

  test('clicking a stone should highlight it and show its details', () => {
    render(() => <InventoryMenu toggleInventory={mockToggleInventory} />);
    const stoneItem = screen.getByText(/Ruby/i); // Find stone1 display
    fireEvent.click(stoneItem);
    
    // Assuming StonePreview (or direct rendering) shows seed for highlighted stone
    // Check for details of stone1 (Ruby)
    expect(screen.getByText(new RegExp(`Seed: ${stone1.seed}`, "i"))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`Color: ${stone1.color}`, "i"))).toBeInTheDocument();
  });

  test('"Set as Current" button should not be present if no stone is highlighted', () => {
    render(() => <InventoryMenu toggleInventory={mockToggleInventory} />);
    // The button is inside a <Show when={highlightedStone()} > block
    expect(screen.queryByText('Set as Current')).toBeNull();
  });

  test('clicking "Set as Current" equips the highlighted stone and closes inventory', () => {
    render(() => <InventoryMenu toggleInventory={mockToggleInventory} />);
    const stoneItem = screen.getByText(/Sapphire/i); // stone2
    fireEvent.click(stoneItem); // Highlight stone2

    const setButton = screen.getByText('Set as Current');
    expect(setButton).not.toBeDisabled();
    fireEvent.click(setButton);

    expect(saveData).toHaveBeenCalled();
    const { showMessage } = require('@src/utils');
    expect(showMessage).toHaveBeenCalledWith(expect.stringContaining('is now equipped'), expect.any(Number), 'success');
    expect(currentSaveData.equippedStone?.seed).toBe(stone2.seed);
    expect(mockToggleInventory).toHaveBeenCalledTimes(1);
  });
  
  test('double-clicking a stone equips it and closes inventory', () => {
    render(() => <InventoryMenu toggleInventory={mockToggleInventory} />);
    const stoneItem = screen.getByText(/Ruby/i); // stone1
    fireEvent.dblClick(stoneItem);

    expect(saveData).toHaveBeenCalled();
    const { showMessage } = require('@src/utils');
    expect(showMessage).toHaveBeenCalledWith(expect.stringContaining('is now equipped'), expect.any(Number), 'success');
    expect(currentSaveData.equippedStone?.seed).toBe(stone1.seed);
    expect(mockToggleInventory).toHaveBeenCalledTimes(1);
  });

  test('"Close Inventory" button should call toggleInventory', () => {
    render(() => <InventoryMenu toggleInventory={mockToggleInventory} />);
    fireEvent.click(screen.getByText('Close Inventory'));
    expect(mockToggleInventory).toHaveBeenCalledTimes(1);
  });
});
