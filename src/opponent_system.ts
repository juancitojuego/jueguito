// src/opponent_system.ts
import { StoneQualities, createStone, generateNewStoneSeed, mulberry32 } from './stone_mechanics';

/**
 * Generates a queue of opponent stones.
 * @param opponentsSeed - The seed to generate the opponent queue.
 * @param count - The number of opponents to generate.
 * @returns An array of StoneQualities representing the opponent queue.
 */
export function generateNewOpponentQueue(opponentsSeed: number, count: number = 100): StoneQualities[] {
    const opponentPrng = mulberry32(opponentsSeed);
    const queue: StoneQualities[] = [];
    for (let i = 0; i < count; i++) {
        const opponentStoneSeed = generateNewStoneSeed(opponentPrng);
        queue.push(createStone(opponentStoneSeed));
    }
    return queue;
}
