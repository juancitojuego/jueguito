// src/interfaces/randomService.ts

export interface IRandomService {
  /**
   * Initializes or re-initializes the random number generator with a specific seed.
   * @param seed The seed value (number or string).
   */
  initialize(seed: number | string): void;

  /**
   * Gets the next pseudo-random number in the sequence.
   * @returns A floating-point number between 0 (inclusive) and 1 (exclusive).
   */
  getRandom(): number;

  /**
   * Generates a new integer that can be used as a seed.
   * This typically uses the current PRNG state to derive a new seed.
   * @returns A 32-bit integer suitable for seeding.
   */
  generateSeed(): number;

  /**
   * Shuffles an array in place using the current PRNG state (Fisher-Yates algorithm).
   * @param array The array to shuffle.
   * @returns The same array, shuffled.
   */
  shuffleArray<T>(array: T[]): T[];
  
  // Could also include methods for:
  // - Getting a random integer within a range.
  // - Picking a random element from an array.
}
