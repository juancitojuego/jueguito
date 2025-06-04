// tests/opponent_system.test.ts
import { generateNewOpponentQueue } from '../src/opponent_system';
import { GameState } from '../src/game_state';
import { GameStateManager } from '../src/game_state_manager'; // Import GameStateManager
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
            expect(gameState.opponentQueue.length).toBe(0);
            const opponent = GameStateManager.getCurrentOpponent(gameState); // Use manager
            expect(opponent).not.toBeNull();
            expect(opponent).toBeInstanceOf(StoneQualities);
            expect(gameState.opponentQueue.length).toBe(100);
            expect(gameState.opponents_index).toBe(0);
        });

        it('getCurrentOpponent() should return the opponent at the current index', () => {
            const firstOpponent = GameStateManager.getCurrentOpponent(gameState); // Use manager
            expect(firstOpponent).toEqual(gameState.opponentQueue[0]);

            gameState.opponents_index = 5;
            const sixthOpponent = GameStateManager.getCurrentOpponent(gameState); // Use manager
            expect(sixthOpponent).toEqual(gameState.opponentQueue[5]);
        });

        it('advanceOpponent() should increment opponents_index', () => {
            GameStateManager.getCurrentOpponent(gameState); // Ensure queue is generated via manager
            expect(gameState.opponents_index).toBe(0);
            GameStateManager.advanceOpponent(gameState); // Use manager
            expect(gameState.opponents_index).toBe(1);
            const nextOpponent = GameStateManager.getCurrentOpponent(gameState); // Use manager
            expect(nextOpponent).toEqual(gameState.opponentQueue[1]);
        });

        it('getCurrentOpponent() should regenerate the same queue if index is out of bounds (using same opponentsSeed)', () => {
            GameStateManager.getCurrentOpponent(gameState); // Use manager
            const firstQueueFirstOpponentSeed = gameState.opponentQueue[0].seed;

            gameState.opponents_index = gameState.opponentQueue.length;
            const newQueueOpponent = GameStateManager.getCurrentOpponent(gameState); // Use manager

            expect(newQueueOpponent).not.toBeNull();
            expect(gameState.opponents_index).toBe(0);
            expect(gameState.opponentQueue.length).toBe(100);
            expect(newQueueOpponent!.seed).toBe(firstQueueFirstOpponentSeed);
        });

        it('getCurrentOpponent() should handle null opponentsSeed by creating one', () => {
            gameState.opponentsSeed = null;
            gameState.opponentQueue = [];
            const opponent = GameStateManager.getCurrentOpponent(gameState); // Use manager
            expect(opponent).not.toBeNull();
            expect(gameState.opponentsSeed).not.toBeNull();
            expect(gameState.opponentQueue.length).toBe(100);
        });

        it('getCurrentOpponent() should return null if queue generation results in an empty queue', () => {
            const opponentSystem = require('../src/opponent_system');
            const mockGenerateEmptyQueue = jest.spyOn(opponentSystem, 'generateNewOpponentQueue').mockReturnValueOnce([]);

            gameState.opponentQueue = [];
            gameState.opponents_index = 0;

            const opponent = GameStateManager.getCurrentOpponent(gameState); // Use manager
            expect(opponent).toBeNull();
            expect(mockGenerateEmptyQueue).toHaveBeenCalled();
        });
    });
});
