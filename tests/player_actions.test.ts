// tests/player_actions.test.ts
import { GameState, saveGame } from '../src/game_state';
import { StoneQualities, createStone, mulberry32, generateNewStoneSeed } from '../src/stone_mechanics';
import { crackOpenStone, salvageStone } from '../src/player_actions';

// Mock the saveGame function from game_state
// jest.mock('../src/game_state', () => {
//     const originalModule = jest.requireActual('../src/game_state');
//     return {
//         __esModule: true, // Use this if game_state.ts uses ES modules
//         ...originalModule,
//         saveGame: jest.fn(), // Mock saveGame specifically
//     };
// });
// Simpler mock for just one function if not dealing with ES module complexities in mock
// Forcing a type assertion for the mock
const mockSaveGame = saveGame as jest.Mock;
jest.mock('../src/game_state', () => ({
    ...jest.requireActual('../src/game_state'),
    saveGame: jest.fn(),
}));


describe('Player Actions', () => {
    let gameState: GameState;
    const playerName = "ActionTester";
    const masterSeed = 12345; // Consistent master seed for tests

    beforeEach(() => {
        // Use a consistent seed for GameState.createInitial to make tests more deterministic
        // if PRNG aspects of createInitial were to affect these action tests.
        gameState = GameState.createInitial(playerName, masterSeed);

        // Ensure there's at least one stone and it's equipped.
        // GameState.createInitial already adds and equips one stone.
        if (gameState.stones.length === 0) {
            console.warn("GameState.createInitial did not create a stone. Adding one for tests.");
            const initialStoneSeed = generateNewStoneSeed(mulberry32(masterSeed + 1));
            const initialStone = createStone(initialStoneSeed);
            gameState.addStoneToInventory(initialStone);
            gameState.equipStone(initialStone.seed);
        } else if (!gameState.equippedStoneId) {
            // If stones exist but none are equipped (e.g., if createInitial logic changes)
            gameState.equipStone(gameState.stones[0].seed);
        }

        // Clear mock history before each test
        // Note: saveGame is mocked at the module level. We need to cast it to jest.Mock to use mockClear.
        (saveGame as jest.Mock).mockClear();
    });

    describe('crackOpenStone', () => {
        it('should return a message if no stone is equipped', () => {
            gameState.equipStone(null); // Ensure no stone is equipped
            const result = crackOpenStone(gameState);
            expect(result.newStones.length).toBe(0);
            expect(result.message).toContain('No stone equipped');
            expect(saveGame).not.toHaveBeenCalled();
        });

        it('should remove the equipped stone and add at least one new stone', () => {
            const initialStoneCount = gameState.stones.length;
            const equippedStoneSeed = gameState.equippedStoneId;
            expect(equippedStoneSeed).not.toBeNull();

            const result = crackOpenStone(gameState);

            expect(result.newStones.length).toBeGreaterThanOrEqual(1);
            expect(gameState.getStoneById(equippedStoneSeed!)).toBeUndefined(); // Original stone gone
            expect(gameState.stones.length).toBe(initialStoneCount - 1 + result.newStones.length);
            result.newStones.forEach(stone => {
                expect(gameState.getStoneById(stone.seed)).toBeDefined();
            });
            expect(saveGame).toHaveBeenCalledWith(gameState);
        });

        it('should equip the first new stone found', () => {
            // Ensure a stone is equipped to be cracked.
            if (!gameState.equippedStoneId && gameState.stones.length > 0) {
                 gameState.equipStone(gameState.stones[0].seed);
            } else if (gameState.stones.length === 0) { // Should be handled by beforeEach, but defensive
                const tempStone = createStone(generateNewStoneSeed(mulberry32(masterSeed + 10)));
                gameState.addStoneToInventory(tempStone);
                gameState.equipStone(tempStone.seed);
            }

            const result = crackOpenStone(gameState);
            expect(result.newStones.length).toBeGreaterThan(0); // Action guarantees at least one stone
            expect(gameState.equippedStoneId).toBe(result.newStones[0].seed);
        });

        it('should produce deterministic results for the same initial state', () => {
            const initialEquippedSeed = gameState.equippedStoneId!;

            // Create a deep copy or re-create state for a second run
            let gameState2 = GameState.createInitial(playerName, masterSeed);
            // Ensure gameState2 is identical to how gameState was at the start of this test
            // This might require more careful state cloning if createInitial has side effects not reset
            // For now, assuming createInitial is deterministic and beforeEach sets it up well.
            // If the first stone in gameState2 is different from initialEquippedSeed, this test needs adjustment.
            // Let's ensure the stone to be cracked is the same.
            // The simplest is to ensure the first stone from createInitial is always the one cracked.
             if (gameState2.stones[0].seed !== initialEquippedSeed) {
                // This implies createInitial itself is not perfectly deterministic for stone seeds given fixed masterSeed,
                // or that the setup in beforeEach is not perfectly replicating states.
                // For this test, we'll force gameState2 to have the same stone to crack.
                const stoneToCrack = gameState.getStoneById(initialEquippedSeed)!;
                gameState2.stones = [new StoneQualities({...stoneToCrack})]; // Clone it
                gameState2.equipStone(initialEquippedSeed);

             }


            const result1 = crackOpenStone(gameState);
            const result2 = crackOpenStone(gameState2);

            expect(result1.newStones.length).toEqual(result2.newStones.length);
            expect(result1.newStones.map(s => s.seed)).toEqual(result2.newStones.map(s => s.seed));
            expect(result1.message).toEqual(result2.message); // Messages might differ if equipped stone names differ
            expect(gameState.equippedStoneId).toEqual(gameState2.equippedStoneId);
        });
    });

    describe('salvageStone', () => {
        it('should return a message if no stone is equipped', () => {
            gameState.equipStone(null);
            const result = salvageStone(gameState);
            expect(result.currencyGained).toBe(0);
            expect(result.message).toContain('No stone equipped');
            expect(saveGame).not.toHaveBeenCalled();
        });

        it('should remove the equipped stone, add currency, and auto-equip next if available', () => {
            const initialCurrency = gameState.currency;
            const equippedStoneDetails = gameState.getStoneById(gameState.equippedStoneId!)!;
            const expectedCurrencyGain = equippedStoneDetails.rarity * 10;
            const originalEquippedSeed = equippedStoneDetails.seed;
            const initialInventorySize = gameState.stones.length;

            const extraStoneSeed = generateNewStoneSeed(mulberry32(masterSeed + 2));
            const extraStone = createStone(extraStoneSeed);
            gameState.addStoneToInventory(extraStone);
            expect(gameState.stones.length).toBe(initialInventorySize + 1); // Added extra stone

            const result = salvageStone(gameState);

            expect(result.currencyGained).toBe(expectedCurrencyGain);
            expect(gameState.currency).toBe(initialCurrency + expectedCurrencyGain);
            expect(gameState.getStoneById(originalEquippedSeed)).toBeUndefined();
            expect(gameState.stones.length).toBe(initialInventorySize); // One removed (original), one was extra
            expect(saveGame).toHaveBeenCalledWith(gameState);
            expect(gameState.equippedStoneId).toBe(extraStone.seed); // Extra stone should be equipped
        });

        it('should handle salvaging the last stone correctly', () => {
            // Ensure only one stone (the equipped one) is in inventory
            const onlyStoneSeed = gameState.equippedStoneId!;
            const onlyStone = gameState.getStoneById(onlyStoneSeed)!;
            gameState.stones = [new StoneQualities({...onlyStone})]; // Make a copy to avoid modifying the original from createInitial pool if it's referenced elsewhere
            gameState.equipStone(onlyStoneSeed);
            expect(gameState.stones.length).toBe(1);

            const initialCurrency = gameState.currency;
            const expectedCurrencyGain = onlyStone.rarity * 10;
            const result = salvageStone(gameState);

            expect(result.currencyGained).toBe(expectedCurrencyGain);
            expect(gameState.currency).toBe(initialCurrency + expectedCurrencyGain);
            expect(gameState.stones.length).toBe(0);
            expect(gameState.equippedStoneId).toBeNull();
            expect(saveGame).toHaveBeenCalledWith(gameState);
        });
    });
});
