// src/tests/services/randomService.test.ts

import { RandomService } from '../../services/randomService';

describe('RandomService', () => {
  describe('Initialization', () => {
    test('should initialize with a specific seed in constructor', () => {
      const seed = 12345;
      const rs1 = new RandomService(seed);
      const rs2 = new RandomService(seed);
      // Expect the first few numbers to be the same if seed is the same
      expect(rs1.getRandom()).toBe(rs2.getRandom());
      expect(rs1.getRandom()).toBe(rs2.getRandom());
    });

    test('should initialize with a default seed (timestamp based) if no seed is provided', () => {
      // This is hard to test for exact sequence equality due to time sensitivity
      // Instead, we just check if it initializes and produces numbers
      const rs = new RandomService();
      expect(typeof rs.getRandom()).toBe('number');
    });

    test('initialize() method should re-seed the PRNG', () => {
      const initialSeed = 'test-seed-1';
      const rs = new RandomService(initialSeed);
      const firstSequence = [rs.getRandom(), rs.getRandom()];

      const newSeed = 'test-seed-2';
      rs.initialize(newSeed);
      const secondSequence = [rs.getRandom(), rs.getRandom()];
      expect(firstSequence).not.toEqual(secondSequence);

      // Check determinism with the new seed
      const rs2 = new RandomService(newSeed);
      expect(rs.getRandom()).toBe(rs2.getRandom());
    });
  });

  describe('getRandom()', () => {
    test('should produce a deterministic sequence for a given seed', () => {
      const rs = new RandomService('deterministic-seed');
      const seq1 = [rs.getRandom(), rs.getRandom(), rs.getRandom()];
      
      const rs2 = new RandomService('deterministic-seed');
      const seq2 = [rs2.getRandom(), rs2.getRandom(), rs2.getRandom()];
      
      expect(seq1).toEqual(seq2);
    });

    test('should produce numbers within the [0, 1) range', () => {
      const rs = new RandomService('range-test-seed');
      for (let i = 0; i < 1000; i++) {
        const num = rs.getRandom();
        expect(num).toBeGreaterThanOrEqual(0);
        expect(num).toBeLessThan(1);
      }
    });

    test('should produce different numbers on subsequent calls', () => {
      const rs = new RandomService('subsequent-calls-seed');
      const num1 = rs.getRandom();
      const num2 = rs.getRandom();
      expect(num1).not.toBe(num2);
    });
  });

  describe('generateSeed()', () => {
    test('should return an integer', () => {
      const rs = new RandomService('generate-seed-test');
      const newSeed = rs.generateSeed();
      expect(Number.isInteger(newSeed)).toBe(true);
    });

    test('should return a 32-bit integer range (approx)', () => {
        // Check if it's positive and within typical 32-bit unsigned integer representation
        // Math.floor(this.getRandom() * 0xffffffff)
        const rs = new RandomService('generate-seed-range');
        for (let i=0; i<100; ++i) {
            const newSeed = rs.generateSeed();
            expect(newSeed).toBeGreaterThanOrEqual(0);
            expect(newSeed).toBeLessThanOrEqual(0xffffffff);
        }
    });

    test('subsequent calls should produce different seeds (due to PRNG state change)', () => {
      const rs = new RandomService('generate-multiple-seeds');
      const seed1 = rs.generateSeed();
      const seed2 = rs.generateSeed();
      expect(seed1).not.toBe(seed2);
    });
  });

  describe('shuffleArray()', () => {
    test('should return an empty array when given an empty array', () => {
      const rs = new RandomService('shuffle-empty');
      expect(rs.shuffleArray([])).toEqual([]);
    });

    test('should return the same array (new instance) when given a single-element array', () => {
      const rs = new RandomService('shuffle-single');
      const arr = [{ id: 1 }];
      const shuffled = rs.shuffleArray(arr);
      expect(shuffled).toEqual(arr);
      expect(shuffled).not.toBe(arr); // Ensure it's a new array instance
    });

    test('should return an array with the same elements and length for a multi-element array', () => {
      const rs = new RandomService('shuffle-multi-elements');
      const arr = [1, 2, 3, 4, 5];
      const shuffled = rs.shuffleArray(arr);

      expect(shuffled.length).toBe(arr.length);
      // Check if all original elements are present in the shuffled array
      arr.forEach(item => expect(shuffled).toContain(item));
      // Check if all shuffled elements were in the original array (handles duplicates if any)
      shuffled.forEach(item => expect(arr).toContain(item));
    });

    test('should produce a deterministic shuffle order for a fixed seed', () => {
      const seed = 'deterministic-shuffle-seed';
      const rs1 = new RandomService(seed);
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const shuffled1 = rs1.shuffleArray(arr);

      const rs2 = new RandomService(seed); // Re-initialize with the same seed
      const shuffled2 = rs2.shuffleArray(arr); // Shuffle the original array again

      expect(shuffled1).toEqual(shuffled2);
    });

    test('should produce different shuffle orders for different seeds (for non-trivial arrays)', () => {
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const rs1 = new RandomService('shuffle-seed-A');
      const shuffled1 = rs1.shuffleArray(arr);

      const rs2 = new RandomService('shuffle-seed-B');
      const shuffled2 = rs2.shuffleArray(arr);
      
      // It's statistically highly improbable they are the same for a 10-element array
      expect(shuffled1).not.toEqual(shuffled2); 
    });
  });
});
