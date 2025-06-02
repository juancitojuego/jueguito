import { render, screen, fireEvent, cleanup } from '@solidjs/testing-library';
import InventoryMenu from '@src/components/InventoryMenu';
import { GameState, StoneQualities } from '@src/interfaces';
import { createStone } from '@src/stone';

// Mock utility functions
jest.mock('@src/utils', () => ({
  logMessage: jest.fn(),
  showMessage: jest.fn(),
}));

// Mock the refactored store
const mockEquipStone = jest.fn();
const mockSaveGame = jest.fn(() => Promise.resolve());
let mockGameState: GameState; // To be reset in beforeEach

jest.mock('@src/store', () => ({
  gameState: new Proxy({}, { // Proxy to allow dynamic updates in beforeEach
    get: (target, prop) => mockGameState[prop as keyof GameState],
  }),
  equipStone: mockEquipStone,
  saveGame: mockSaveGame,
  // Re-export UI-specific utils if InventoryMenu imports them from store
  logMessage: jest.requireActual('@src/utils').logMessage,
  showMessage: jest.requireActual('@src/utils').showMessage,
}));


describe('InventoryMenu Component', () => {
  const mockToggleInventory = jest.fn();
  const stone1 = { ...createStone(1), name: "Ruby" } as StoneQualities;
  const stone2 = { ...createStone(2), name: "Sapphire" } as StoneQualities;
  const stone3 = createStone(3) as StoneQualities; // No name

  beforeEach(() => {
    jest.clearAllMocks();
    mockGameState = {
      gameSeed: 123,
      playerStats: { name: 'TestPlayer' },
      currency: 100,
      stones: [stone1, stone2, stone3],
      equippedStoneId: null,
      opponentsSeed: 456,
      opponents_index: 0,
    };
  });

  afterEach(cleanup);

  test('should render a list of stones from gameState.stones', () => {
    render(() => <InventoryMenu toggleInventory={mockToggleInventory} />);
    expect(screen.getByText(/Ruby/i)).toBeInTheDocument();
    expect(screen.getByText(/Sapphire/i)).toBeInTheDocument();
    const stone3Pattern = new RegExp(`${stone3.seed.toString().substring(0, 8)}\\.\\.\\s*-\\s*${stone3.color}\\s*${stone3.shape}\\s*\\(R${stone3.rarity}\\)`, "i");
    expect(screen.getByText(stone3Pattern)).toBeInTheDocument();
    expect(screen.getByText(`Your Stones (${mockGameState.stones.length})`)).toBeInTheDocument();
  });

  test('should display "No stones in inventory" if inventory is empty', () => {
    mockGameState.stones = [];
    render(() => <InventoryMenu toggleInventory={mockToggleInventory} />);
    expect(screen.getByText('No stones in inventory.')).toBeInTheDocument();
  });

  test('clicking a stone should highlight it and show its details', () => {
    render(() => <InventoryMenu toggleInventory={mockToggleInventory} />);
    const stoneItem = screen.getByText(/Ruby/i);
    fireEvent.click(stoneItem);
    expect(screen.getByText(new RegExp(`Seed: ${stone1.seed}`, "i"))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`Color: ${stone1.color}`, "i"))).toBeInTheDocument();
  });

  test('"Set as Current" button should not be present if no stone is highlighted', () => {
    render(() => <InventoryMenu toggleInventory={mockToggleInventory} />);
    expect(screen.queryByText('Set as Current')).toBeNull();
  });

  test('clicking "Set as Current" calls equipStone and saveGame, then closes inventory', async () => {
    render(() => <InventoryMenu toggleInventory={mockToggleInventory} />);
    const stoneItem = screen.getByText(/Sapphire/i);
    fireEvent.click(stoneItem); // Highlight stone2

    const setButton = screen.getByText('Set as Current');
    await fireEvent.click(setButton);

    expect(mockEquipStone).toHaveBeenCalledWith(stone2.seed);
    expect(mockSaveGame).toHaveBeenCalled();
    expect(mockToggleInventory).toHaveBeenCalledTimes(1);
  });
  
  test('double-clicking a stone calls equipStone and saveGame, then closes inventory', async () => {
    render(() => <InventoryMenu toggleInventory={mockToggleInventory} />);
    const stoneItem = screen.getByText(/Ruby/i);
    await fireEvent.dblClick(stoneItem);

    expect(mockEquipStone).toHaveBeenCalledWith(stone1.seed);
    expect(mockSaveGame).toHaveBeenCalled();
    expect(mockToggleInventory).toHaveBeenCalledTimes(1);
  });

  test('"Close Inventory" button should call toggleInventory', () => {
    render(() => <InventoryMenu toggleInventory={mockToggleInventory} />);
    fireEvent.click(screen.getByText('Close Inventory'));
    expect(mockToggleInventory).toHaveBeenCalledTimes(1);
  });
});
