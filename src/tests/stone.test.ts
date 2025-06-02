import {
  deriveStoneQualities,
  createStone,
  mulberry32,
  generateNewStoneSeed,
  StoneQualities,
  COLORS,
  SHAPES,
} from '@src/stone';

describe('Stone Logic', () => {
  describe('mulberry32 PRNG', () => {
    test('should produce a deterministic sequence for a given seed', () => {
      const prng1 = mulberry32(12345);
      const seq1 = [prng1(), prng1(), prng1()];
      const prng2 = mulberry32(12345);
      const seq2 = [prng2(), prng2(), prng2()];
      expect(seq1).toEqual(seq2);
    });

    test('should produce different sequences for different seeds', () => {
      const prng1 = mulberry32(12345);
      const seq1 = [prng1(), prng1(), prng1()];
      const prng2 = mulberry32(67890);
      const seq2 = [prng2(), prng2(), prng2()];
      expect(seq1).not.toEqual(seq2);
    });

    test('should produce values between 0 (inclusive) and 1 (exclusive)', () => {
      const prng = mulberry32(Date.now());
      for (let i = 0; i < 100; i++) {
        const val = prng();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });
  });

  describe('generateNewStoneSeed', () => {
    test('should return a number', () => {
      const prng = mulberry32(123);
      const newSeed = generateNewStoneSeed(prng);
      expect(typeof newSeed).toBe('number');
    });
  });

  describe('deriveStoneQualities', () => {
    const testSeed = 123456789;
    let qualities1: StoneQualities;

    beforeAll(() => {
      qualities1 = deriveStoneQualities(testSeed);
    });

    test('should generate all quality properties', () => {
      expect(qualities1).toHaveProperty('seed', testSeed);
      expect(COLORS).toContain(qualities1.color);
      expect(SHAPES).toContain(qualities1.shape);
      expect(qualities1.rarity).toBeGreaterThanOrEqual(0);
      expect(qualities1.rarity).toBeLessThanOrEqual(100);
      expect(qualities1.weight).toBeGreaterThanOrEqual(1);
      expect(qualities1.weight).toBeLessThanOrEqual(100);
      expect(qualities1.hardness).toBeGreaterThanOrEqual(0);
      expect(qualities1.hardness).toBeLessThanOrEqual(1);
      // Ensure hardness has max two decimal places (e.g. by checking if 100*hardness is integer)
      // This also implies it can be 0, 0.01, ..., 0.99, 1.00
      expect(Number.isInteger(Math.round(qualities1.hardness * 100))).toBe(true);
      expect(qualities1.magic).toBeGreaterThanOrEqual(0);
      expect(qualities1.magic).toBeLessThanOrEqual(100);
      expect(qualities1.createdAt).toBe(0); // Placeholder
    });

    test('should be deterministic for the same seed', () => {
      const qualities2 = deriveStoneQualities(testSeed);
      // Create a copy for comparison, excluding functions if any
      const q1Comparable = { ...qualities1 };
      const q2Comparable = { ...qualities2 };
      expect(q1Comparable).toEqual(q2Comparable);
    });

    test('should produce different qualities for different seeds', () => {
      const differentSeed = 987654321;
      const qualitiesDifferent = deriveStoneQualities(differentSeed);
      expect(qualities1.color).not.toBe(qualitiesDifferent.color); // High probability of difference
      expect(qualities1.shape).not.toBe(qualitiesDifferent.shape); // High probability
      expect(qualities1.rarity).not.toBe(qualitiesDifferent.rarity); // High probability
    });
  });

  describe('createStone', () => {
    const testSeed = 98765;
    let stone1: StoneQualities;
    let timeBeforeCreatingStone1: number;

    beforeAll(() => {
      timeBeforeCreatingStone1 = Date.now();
      stone1 = createStone(testSeed);
    });

    test('should include all qualities from deriveStoneQualities', () => {
      const derived = deriveStoneQualities(testSeed);
      expect(stone1.seed).toBe(derived.seed);
      expect(stone1.color).toBe(derived.color);
      expect(stone1.shape).toBe(derived.shape);
      expect(stone1.rarity).toBe(derived.rarity);
      expect(stone1.weight).toBe(derived.weight);
      expect(stone1.hardness).toBe(derived.hardness);
      expect(stone1.magic).toBe(derived.magic);
    });

    test('createdAt should be a recent timestamp', () => {
      const timeAfterCreatingStone1 = Date.now();
      expect(stone1.createdAt).toBeGreaterThanOrEqual(timeBeforeCreatingStone1);
      expect(stone1.createdAt).toBeLessThanOrEqual(timeAfterCreatingStone1 + 1); // Allow small diff
    });

    test('two stones with same seed but different creation times should differ only in createdAt', (done) => {
      const stone2Seed = 111222;
      const firstStone = createStone(stone2Seed);
      setTimeout(() => {
        const secondStone = createStone(stone2Seed);
        expect(secondStone.createdAt).toBeGreaterThan(firstStone.createdAt);
        // Compare all properties except createdAt
        const { createdAt: _, ...firstStoneOtherQualities } = firstStone;
        const { createdAt: __, ...secondStoneOtherQualities } = secondStone;
        expect(firstStoneOtherQualities).toEqual(secondStoneOtherQualities);
        done();
      }, 10); // 10ms delay
    });
  });
});
