// tests/opponent_system.test.ts
import { generateNewOpponentQueue } from '../src/opponent_system';
import { GameState } from '../src/game_state';
import { StoneQualities, mulberry32, generateNewStoneSeed as generateStoneSeedUtil } from '../src/stone_mechanics';

describe('Opponent System', () => {
    describe('generateNewOpponentQueue', () => {
        const testSeed1 = 12345;
        const testSeed2 = 67890;
        const count = 10;

        it('should generate the specified number of opponents', () => {
            const queue = generateNewOpponentQueue(testSeed1, count);
            expect(queue.length).toBe(count);
            queue.forEach(opponent => {
                expect(opponent).toBeInstanceOf(StoneQualities);
            });
        });

        it('should be deterministic: same seed produces the same queue of stone seeds', () => {
            const queue1 = generateNewOpponentQueue(testSeed1, count);
            const queue2 = generateNewOpponentQueue(testSeed1, count);
            expect(queue1.map(s => s.seed)).toEqual(queue2.map(s => s.seed));
        });

        it('should produce different queues for different seeds', () => {
            const queue1 = generateNewOpponentQueue(testSeed1, count);
            const queue2 = generateNewOpponentQueue(testSeed2, count);
            expect(queue1.map(s => s.seed)).not.toEqual(queue2.map(s => s.seed));
        });
    });

    describe('GameState Opponent Methods', () => {
        let gameState: GameState;
        const playerName = "OpponentTester";
        const masterSeed = 5555;

        beforeEach(() => {
            gameState = GameState.createInitial(playerName, masterSeed);
            // gameState.createInitial ensures opponentsSeed is set.
        });

        afterEach(() => {
            jest.restoreAllMocks(); // Restore any mocks after each test
        });

        it('getCurrentOpponent() should generate a queue if one does not exist or is empty', () => {
            expect(gameState.opponentQueue.length).toBe(0); // Initially empty
            const opponent = gameState.getCurrentOpponent();
            expect(opponent).not.toBeNull();
            expect(opponent).toBeInstanceOf(StoneQualities);
            expect(gameState.opponentQueue.length).toBe(100); // Default count
            expect(gameState.opponents_index).toBe(0);
        });

        it('getCurrentOpponent() should return the opponent at the current index', () => {
            const firstOpponent = gameState.getCurrentOpponent(); // Generates queue
            expect(firstOpponent).toEqual(gameState.opponentQueue[0]);

            gameState.opponents_index = 5; // Manually set index for testing
            const sixthOpponent = gameState.getCurrentOpponent();
            expect(sixthOpponent).toEqual(gameState.opponentQueue[5]);
        });

        it('advanceOpponent() should increment opponents_index', () => {
            gameState.getCurrentOpponent(); // Ensure queue is generated
            expect(gameState.opponents_index).toBe(0);
            gameState.advanceOpponent();
            expect(gameState.opponents_index).toBe(1);
            const nextOpponent = gameState.getCurrentOpponent();
            expect(nextOpponent).toEqual(gameState.opponentQueue[1]);
        });

        it('getCurrentOpponent() should regenerate the same queue if index is out of bounds (using same opponentsSeed)', () => {
            gameState.getCurrentOpponent(); // Initial queue (default 100)
            const firstQueueFirstOpponentSeed = gameState.opponentQueue[0].seed;

            gameState.opponents_index = gameState.opponentQueue.length; // Go to end of queue
            const newQueueOpponent = gameState.getCurrentOpponent(); // Should trigger regeneration

            expect(newQueueOpponent).not.toBeNull();
            expect(gameState.opponents_index).toBe(0); // Index resets
            expect(gameState.opponentQueue.length).toBe(100); // New queue with default count
            // Regenerated queue should be identical because opponentsSeed hasn't changed
            expect(newQueueOpponent!.seed).toBe(firstQueueFirstOpponentSeed);
        });

        it('getCurrentOpponent() should handle null opponentsSeed by creating one', () => {
            gameState.opponentsSeed = null; // Simulate scenario where seed isn't set
            gameState.opponentQueue = [];   // Reset queue to force regeneration path
            const opponent = gameState.getCurrentOpponent();
            expect(opponent).not.toBeNull();
            expect(gameState.opponentsSeed).not.toBeNull(); // A new seed should have been generated
            expect(gameState.opponentQueue.length).toBe(100);
        });

        it('getCurrentOpponent() should return null if queue generation results in an empty queue', () => {
            // Mock generateNewOpponentQueue to return an empty array for this specific test case
            const opponentSystem = require('../src/opponent_system');
            const mockGenerateEmptyQueue = jest.spyOn(opponentSystem, 'generateNewOpponentQueue').mockReturnValueOnce([]);

            // Force re-evaluation by clearing current queue (if any) and setting index to 0
            gameState.opponentQueue = [];
            gameState.opponents_index = 0;

            const opponent = gameState.getCurrentOpponent();
            expect(opponent).toBeNull();
            expect(mockGenerateEmptyQueue).toHaveBeenCalled(); // Ensure our mock was called
        });
    });
});
