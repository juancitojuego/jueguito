// tests/player_actions.test.ts
import { GameState } from '../src/game_state';
import { GameStateManager } from '../src/game_state_manager'; // Import GameStateManager
import { StoneQualities, createStone, mulberry32, generateNewStoneSeed } from '../src/stone_mechanics';
import { crackOpenStone, salvageStone } from '../src/player_actions';

// Mock the GameStateManager.saveGame function
jest.mock('../src/game_state_manager', () => ({
    ...jest.requireActual('../src/game_state_manager'), // Import and retain default behavior
    GameStateManager: {
        ...jest.requireActual('../src/game_state_manager').GameStateManager, // Retain other static methods
        saveGame: jest.fn(), // Mock saveGame specifically
    }
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
            GameStateManager.addStoneToInventory(gameState, initialStone); // Use manager
            GameStateManager.equipStone(gameState, initialStone.seed); // Use manager
        } else if (!gameState.equippedStoneId) {
            GameStateManager.equipStone(gameState, gameState.stones[0].seed); // Use manager
        }

        (GameStateManager.saveGame as jest.Mock).mockClear(); // Clear mock for GameStateManager.saveGame
    });

    describe('crackOpenStone', () => {
        it('should return a message if no stone is equipped', () => {
            GameStateManager.equipStone(gameState, null); // Use manager
            const result = crackOpenStone(gameState);
            expect(result.newStones.length).toBe(0);
            expect(result.message).toContain('No stone equipped');
            expect(GameStateManager.saveGame).not.toHaveBeenCalled();
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
            expect(GameStateManager.saveGame).toHaveBeenCalledWith(gameState);
        });

        it('should equip the first new stone found', () => {
            // Ensure a stone is equipped to be cracked.
            if (!gameState.equippedStoneId && gameState.stones.length > 0) {
                 GameStateManager.equipStone(gameState, gameState.stones[0].seed); // Use manager
            } else if (gameState.stones.length === 0) {
                const tempStone = createStone(generateNewStoneSeed(mulberry32(masterSeed + 10)));
                GameStateManager.addStoneToInventory(gameState, tempStone); // Use manager
                GameStateManager.equipStone(gameState, tempStone.seed); // Use manager
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
                const stoneToCrack = gameState.getStoneById(initialEquippedSeed)!; // getStoneById is fine on GameState
                gameState2.stones = [new StoneQualities({...stoneToCrack})];
                GameStateManager.equipStone(gameState2, initialEquippedSeed); // Use manager

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
            GameStateManager.equipStone(gameState, null); // Use manager
            const result = salvageStone(gameState);
            expect(result.currencyGained).toBe(0);
            expect(result.message).toContain('No stone equipped');
            expect(GameStateManager.saveGame).not.toHaveBeenCalled();
        });

        it('should remove the equipped stone, add currency, and auto-equip next if available', () => {
            const initialCurrency = gameState.currency;
            const equippedStoneDetails = gameState.getStoneById(gameState.equippedStoneId!)!;
            const expectedCurrencyGain = equippedStoneDetails.rarity * 10;
            const originalEquippedSeed = equippedStoneDetails.seed;
            const initialInventorySize = gameState.stones.length;

            const extraStoneSeed = generateNewStoneSeed(mulberry32(masterSeed + 2));
            const extraStone = createStone(extraStoneSeed);
            GameStateManager.addStoneToInventory(gameState, extraStone); // Use manager
            expect(gameState.stones.length).toBe(initialInventorySize + 1); // Added extra stone

            const result = salvageStone(gameState);

            expect(result.currencyGained).toBe(expectedCurrencyGain);
            expect(gameState.currency).toBe(initialCurrency + expectedCurrencyGain);
            expect(gameState.getStoneById(originalEquippedSeed)).toBeUndefined();
            expect(gameState.stones.length).toBe(initialInventorySize);
            expect(GameStateManager.saveGame).toHaveBeenCalledWith(gameState);
            expect(gameState.equippedStoneId).toBe(extraStone.seed);
        });

        it('should handle salvaging the last stone correctly', () => {
            const onlyStoneSeed = gameState.equippedStoneId!;
            const onlyStone = gameState.getStoneById(onlyStoneSeed)!;
            gameState.stones = [new StoneQualities({...onlyStone})];
            GameStateManager.equipStone(gameState, onlyStoneSeed); // Use manager
            expect(gameState.stones.length).toBe(1);

            const initialCurrency = gameState.currency;
            const expectedCurrencyGain = onlyStone.rarity * 10;
            const result = salvageStone(gameState);

            expect(result.currencyGained).toBe(expectedCurrencyGain);
            expect(gameState.currency).toBe(initialCurrency + expectedCurrencyGain);
            expect(gameState.stones.length).toBe(0);
            expect(gameState.equippedStoneId).toBeNull();
            expect(GameStateManager.saveGame).toHaveBeenCalledWith(gameState);
        });
    });
});
