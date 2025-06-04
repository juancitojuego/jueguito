// tests/player_actions.test.ts
import { GameState } from '../src/game_state';
import { StoneQualities, createStone, generateNewStoneSeed, mulberry32 } from '../src/stone_mechanics';
import { GameStateManager } from '../src/game_state_manager'; // Import GameStateManager
import * as PlayerActions from '../src/player_actions';

// Mock GameStateManager.saveGame as it's called by player actions
jest.mock('../src/game_state_manager', () => {
    const originalModule = jest.requireActual('../src/game_state_manager');
    return {
        ...originalModule,
        GameStateManager: {
            ...originalModule.GameStateManager, // Keep actual static methods
            saveGame: jest.fn(), // Mock saveGame specifically
            // We will also spy on other GameStateManager methods if we need to verify their calls
            // but for now, let them use their actual implementations unless saveGame is the only side effect.
        }
    };
});


describe('Player Actions (using GameStateManager)', () => {
    let gameState: GameState;
    const playerName = "PlayerActionTester";
    const masterSeed = 67890;

    beforeEach(() => {
        gameState = GameState.createInitial(playerName, masterSeed);
        // GameStateManager.generateDeck(gameState); // Not strictly needed for these specific tests

        // Ensure there's an initial stone from GameState.createInitial.
        // GameState.createInitial adds one stone and equips it.
        if (gameState.stones.length === 0) {
            // This block should ideally not be hit if GameState.createInitial works as expected.
            console.warn("No initial stone in GameState, adding one for player_actions tests.");
            const emergencyStone = createStone(generateNewStoneSeed(mulberry32(masterSeed + 5)));
            GameStateManager.addStoneToInventory(gameState, emergencyStone);
            GameStateManager.equipStone(gameState, emergencyStone.seed);
        } else if (!gameState.equippedStoneId && gameState.stones.length > 0) {
            GameStateManager.equipStone(gameState, gameState.stones[0].seed);
        }

        (GameStateManager.saveGame as jest.Mock).mockClear();
    });

    afterEach(() => {
        jest.restoreAllMocks(); // Restore all mocks, including GameStateManager.saveGame
    });

    describe('crackOpenStone Action', () => {
        it('should return a message and not save if no stone is equipped', () => {
            GameStateManager.equipStone(gameState, null); // Unequip any stone
            const initialStoneCount = gameState.stones.length;
            const result = PlayerActions.crackOpenStone(gameState);

            expect(result.message).toContain('No stone equipped');
            expect(result.newStones.length).toBe(0);
            expect(gameState.stones.length).toBe(initialStoneCount); // No change in stones
            expect(GameStateManager.saveGame).not.toHaveBeenCalled();
        });

        it('should remove equipped stone, add new ones, equip first new, and call saveGame', () => {
            const equippedStoneBeforeSeed = gameState.equippedStoneId;
            expect(equippedStoneBeforeSeed).not.toBeNull(); // Pre-condition: a stone is equipped
            const initialInventoryCount = gameState.stones.length;

            const result = PlayerActions.crackOpenStone(gameState);

            expect(result.message).not.toContain('No stone equipped');
            expect(result.newStones.length).toBeGreaterThanOrEqual(1); // At least one new stone
            expect(gameState.getStoneById(equippedStoneBeforeSeed!)).toBeUndefined(); // Original stone is gone
            expect(gameState.stones.length).toBe(initialInventoryCount - 1 + result.newStones.length);
            expect(gameState.equippedStoneId).toBe(result.newStones[0].seed); // First new stone is equipped
            expect(GameStateManager.saveGame).toHaveBeenCalledWith(gameState);
        });
    });

    describe('salvageStone Action', () => {
        it('should return a message and not save if no stone is equipped', () => {
            GameStateManager.equipStone(gameState, null); // Unequip
            const initialCurrency = gameState.currency;
            const result = PlayerActions.salvageStone(gameState);

            expect(result.message).toContain('No stone equipped');
            expect(result.currencyGained).toBe(0);
            expect(gameState.currency).toBe(initialCurrency); // Currency unchanged
            expect(GameStateManager.saveGame).not.toHaveBeenCalled();
        });

        it('should remove equipped stone, add currency, auto-equip next if available, and call saveGame', () => {
            const equippedStoneBefore = gameState.getStoneById(gameState.equippedStoneId!)!;
            const expectedCurrencyGain = equippedStoneBefore.rarity * 10;
            const initialCurrency = gameState.currency;
            const initialInventoryCount = gameState.stones.length;

            // Add another stone to ensure one can be auto-equipped
            const nextStoneToEquip = createStone(generateNewStoneSeed(mulberry32(masterSeed + 10)));
            GameStateManager.addStoneToInventory(gameState, nextStoneToEquip);
            // Ensure original stone is still equipped before salvaging (addStoneToInventory might auto-equip if inventory was empty)
            GameStateManager.equipStone(gameState, equippedStoneBefore.seed);
            expect(gameState.equippedStoneId).toBe(equippedStoneBefore.seed);


            const result = PlayerActions.salvageStone(gameState);

            expect(result.currencyGained).toBe(expectedCurrencyGain);
            expect(gameState.currency).toBe(initialCurrency + expectedCurrencyGain);
            expect(gameState.getStoneById(equippedStoneBefore.seed)).toBeUndefined(); // Salvaged stone is gone
            // Inventory count: initial +1 (nextStone) -1 (salvaged) = initial
            expect(gameState.stones.length).toBe(initialInventoryCount);

            // Check auto-equipping: nextStoneToEquip should be equipped
            // This assumes nextStoneToEquip was the only other stone or became the oldest after removal.
            // GameStateManager.removeStoneFromInventory calls autoEquipNextAvailable, which equips stones[0]
            if (gameState.stones.length > 0) {
                expect(gameState.equippedStoneId).toBe(nextStoneToEquip.seed);
            } else {
                 expect(gameState.equippedStoneId).toBeNull();
            }
            expect(GameStateManager.saveGame).toHaveBeenCalledWith(gameState);
        });

        it('should handle salvaging the last stone correctly, leaving no equipped stone', () => {
            // Ensure game state has only one stone (the one from createInitial), which is equipped
            const onlyStoneSeed = gameState.stones[0].seed; // Assuming createInitial added one and it's at index 0
            gameState.stones = [gameState.getStoneById(onlyStoneSeed)!]; // Ensure only this stone exists
            GameStateManager.equipStone(gameState, onlyStoneSeed); // Re-affirm it's equipped
            expect(gameState.stones.length).toBe(1);
            expect(gameState.equippedStoneId).toBe(onlyStoneSeed);


            const equippedStoneDetails = gameState.getStoneById(gameState.equippedStoneId!)!;
            const expectedCurrency = equippedStoneDetails.rarity * 10;
            const initialCurrency = gameState.currency;

            const result = PlayerActions.salvageStone(gameState);

            expect(result.currencyGained).toBe(expectedCurrency);
            expect(gameState.currency).toBe(initialCurrency + expectedCurrency);
            expect(gameState.stones.length).toBe(0); // Inventory is empty
            expect(gameState.equippedStoneId).toBeNull(); // No stone to equip
            expect(GameStateManager.saveGame).toHaveBeenCalledWith(gameState);
        });
    });
});
