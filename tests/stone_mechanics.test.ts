import {
    mulberry32,
    StoneQualities,
    createStone,
    calculateStonePower,
    generateNewStoneSeed,
    StonePowerInputs,
    IStoneQualities // Optional: use for type hints if preferred over class directly
} from '../src/stone_mechanics';

describe('StoneMechanics', () => {
    describe('mulberry32 PRNG', () => {
        it('should produce a number', () => {
            const prng = mulberry32(123);
            expect(typeof prng()).toBe('number');
        });

        it('should be deterministic for a given seed', () => {
            const prng1_seed123 = mulberry32(123);
            const prng2_seed123 = mulberry32(123);
            const r1_1 = prng1_seed123();
            const r1_2 = prng1_seed123();
            expect(prng2_seed123()).toBe(r1_1);
            expect(prng2_seed123()).toBe(r1_2);
        });

        it('should produce different sequences for different seeds', () => {
            const prng_seed123 = mulberry32(123)();
            const prng_seed456 = mulberry32(456)();
            expect(prng_seed123).not.toBe(prng_seed456);
        });
    });

    describe('createStone (and deriveStoneQualities)', () => {
        const testSeed = 12345;
        let stone1: StoneQualities;

        beforeAll(() => {
            stone1 = createStone(testSeed);
        });

        it('should create a StoneQualities instance', () => {
            expect(stone1).toBeInstanceOf(StoneQualities);
        });

        it('should derive qualities correctly for a known seed (12345)', () => {
            expect(stone1.seed).toBe(testSeed);
            expect(stone1.color).toBe("color_0xc5"); // From log
            expect(stone1.shape).toBe("shape_0x78"); // From log
            expect(stone1.weight).toBe(207);        // From log
            expect(stone1.rarity).toBe(10);         // From log
            expect(stone1.magic).toBe(15);          // From log
        });

        it('should have a name property formatted as "Stone [seed]"', () => {
            expect(stone1.name).toBe(`Stone ${testSeed}`);
        });

        it('should have a createdAt timestamp that is a positive number', () => {
            expect(typeof stone1.createdAt).toBe('number');
            expect(stone1.createdAt).toBeGreaterThan(0);
        });
    });

    describe('calculateStonePower', () => {
        it('should calculate power correctly for sample stone data', () => {
            const sampleStoneData: StonePowerInputs = { rarity: 10, magic: 5, weight: 20 };
            const expectedPower = (10 * 0.4) + (5 * 0.3) + (20 * 0.5); // 15.5
            expect(calculateStonePower(sampleStoneData)).toBeCloseTo(expectedPower);
        });

        it('should calculate power correctly for a stone created with seed 987', () => {
            const stone = createStone(987);
            // Seed 987 qualities (from log): color=0x9d, shape=0x2b, weight=36, rarity=6, magic=15
            const expectedPower = (6 * 0.4) + (15 * 0.3) + (36 * 0.5); // 2.4 + 4.5 + 18 = 24.9
            expect(calculateStonePower(stone)).toBeCloseTo(expectedPower);
        });

        it('should return 0 for invalid stone input (e.g., empty object)', () => {
            // Test with an object that doesn't conform to StonePowerInputs
            expect(calculateStonePower({} as StonePowerInputs)).toBe(0);
        });
    });

    describe('generateNewStoneSeed', () => {
        it('should return a number when no PRNG is provided', () => {
            expect(typeof generateNewStoneSeed()).toBe('number');
        });

        it('should use a provided PRNG and be deterministic if PRNG is re-instantiated', () => {
            const prngSeedForGen = 1000;
            const expectedFirstVal = mulberry32(prngSeedForGen)();

            // Each call creates a new mulberry32 instance with the same seed
            expect(generateNewStoneSeed(mulberry32(prngSeedForGen))).toBe(expectedFirstVal);
            expect(generateNewStoneSeed(mulberry32(prngSeedForGen))).toBe(expectedFirstVal);
        });

        it('should advance a shared PRNG instance on subsequent calls', () => {
            const prngSeedForGen = 2000;
            const sharedPrng = mulberry32(prngSeedForGen); // Single instance

            const prngForCheck = mulberry32(prngSeedForGen);
            const expectedFirstVal = prngForCheck();
            const expectedSecondVal = prngForCheck();

            const testSharedPrng = mulberry32(prngSeedForGen); // The actual instance to be passed
            const firstGeneratedSeed = generateNewStoneSeed(testSharedPrng);
            const secondGeneratedSeed = generateNewStoneSeed(testSharedPrng);

            expect(firstGeneratedSeed).toBe(expectedFirstVal);
            expect(secondGeneratedSeed).not.toBe(expectedFirstVal);
            expect(secondGeneratedSeed).toBe(expectedSecondVal);

            // Let's simplify the check for advancing PRNG:
            const prngToTestAdvance = mulberry32(2001);
            const v1 = generateNewStoneSeed(prngToTestAdvance);
            const v2 = generateNewStoneSeed(prngToTestAdvance);
            expect(v2).not.toBe(v1);

        });
    });
});
