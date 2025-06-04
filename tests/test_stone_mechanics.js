// tests/test_stone_mechanics.js
const {
    mulberry32,
    StoneQualities,
    createStone, // Using createStone as it encompasses deriveStoneQualities and StoneQualities instantiation
    calculateStonePower,
    generateNewStoneSeed
} = require('../src/stone_mechanics.js');

// Basic assertion helper for tests
function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        console.error(`Assertion Failed: ${message}. Expected "${expected}", but got "${actual}".`);
    } else {
        console.log(`Assertion Passed: ${message}.`);
    }
}

function assertDeepEqual(actual, expected, message) {
    // Simple JSON stringify comparison for deep equality for this basic test
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        console.error(`Assertion Failed: ${message}. Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}.`);
    } else {
        console.log(`Assertion Passed: ${message}.`);
    }
}

function assert(condition, message) {
    if (!condition) {
        console.error(`Assertion Failed: ${message}.`);
    } else {
        console.log(`Assertion Passed: ${message}.`);
    }
}

console.log("--- Starting Stone Mechanics Tests ---");

console.log("\n--- Testing mulberry32 PRNG ---");
const prng1_seed123 = mulberry32(123);
const prng2_seed123 = mulberry32(123);
const prng_seed456 = mulberry32(456);

const r1_1 = prng1_seed123();
const r1_2 = prng1_seed123();
assertEqual(typeof r1_1, 'number', "PRNG produces a number");
assertEqual(prng2_seed123(), r1_1, "PRNG with same seed produces same first number");
assertEqual(prng2_seed123(), r1_2, "PRNG with same seed produces same second number");
assert(prng_seed456() !== r1_1, "PRNG with different seed produces different first number generally");

console.log("\n--- Testing createStone ---");
const testSeed = 12345;
const stone1 = createStone(testSeed);

// Expected values for seed 12345:
// mulberry32(12345)() = 2786303861 (0xA6169F75)
// color_val  = (0xA6169F75 >>> 0) & 0xFF  = 0x75 = 117 -> "color_0x75"
// shape_val  = (0xA6169F75 >>> 8) & 0xFF  = 0x9F = 159 -> "shape_0x9f"
// weight_val = (0xA6169F75 >>> 16) & 0xFF = 0x16 = 22
// rarity_val = (0xA6169F75 >>> 24) & 0x0F = 0x06 = 6  (from 0xA6)
// magic_val  = (0xA6169F75 >>> 28) & 0x0F = 0x0A = 10 (from 0xA6)

assertEqual(stone1.seed, testSeed, "Stone has correct seed");
assertEqual(stone1.color, "color_0x75", "Stone has correct color for seed 12345");
assertEqual(stone1.shape, "shape_0x9f", "Stone has correct shape for seed 12345");
assertEqual(stone1.weight, 22, "Stone has correct weight for seed 12345");
assertEqual(stone1.rarity, 6, "Stone has correct rarity for seed 12345");
assertEqual(stone1.magic, 10, "Stone has correct magic for seed 12345");
assertEqual(stone1.name, `Stone ${testSeed}`, "Stone has correct name");
assert(typeof stone1.createdAt === 'number' && stone1.createdAt > 0, "Stone has createdAt timestamp");

// Note: Test for different createdAt on subsequent calls is omitted for reliability in fast execution.

console.log("\n--- Testing calculateStonePower ---");
const sampleStoneData = { rarity: 10, magic: 5, weight: 20 }; // Plain object for direct test
const expectedPower = (10 * 0.4) + (5 * 0.3) + (20 * 0.5); // 4 + 1.5 + 10 = 15.5
assertEqual(calculateStonePower(sampleStoneData), expectedPower, "Calculates power correctly for sample stone data");

const stoneFromCreate = createStone(987); // Use a real stone from createStone
// For seed 987, mulberry32(987)() = 1118868711 (0x42B094E7)
// rarity: 0x2 (from 0x42), magic: 0x4 (from 0x42), weight: 0xB0 (176)
const expectedPowerForStone987 = (2 * 0.4) + (4 * 0.3) + (176 * 0.5); // 0.8 + 1.2 + 88 = 90
assertEqual(calculateStonePower(stoneFromCreate), expectedPowerForStone987, "Calculates power correctly for a created stone (seed 987)");
assertEqual(calculateStonePower({}), 0, "Handles invalid stone in calculateStonePower gracefully (returns 0)");

console.log("\n--- Testing generateNewStoneSeed ---");
const newSeedNoPrng1 = generateNewStoneSeed();
// It's hard to test for difference with Date.now() reliably in automated tests.
// const newSeedNoPrng2 = generateNewStoneSeed();
assertEqual(typeof newSeedNoPrng1, 'number', "generateNewStoneSeed (no PRNG) returns a number");

const prngSeedForGen = 1000;
const expectedFirstValFromPrng1000 = mulberry32(prngSeedForGen)();

// Test with newly created PRNG instance each time
assertEqual(generateNewStoneSeed(mulberry32(prngSeedForGen)), expectedFirstValFromPrng1000, "generateNewStoneSeed with new PRNG instance returns its first value");
assertEqual(generateNewStoneSeed(mulberry32(prngSeedForGen)), expectedFirstValFromPrng1000, "generateNewStoneSeed with another new PRNG instance also returns its first value");

// Test with a shared PRNG instance
const sharedPrngForTest = mulberry32(prngSeedForGen); // Create one instance
const expectedVal1Shared = expectedFirstValFromPrng1000; // First value from this PRNG sequence

// We need to get the second value from *this specific instance* for the next comparison
const tempPrngToGetSecondVal = mulberry32(prngSeedForGen);
tempPrngToGetSecondVal(); // Call once to discard first value
const expectedVal2Shared = tempPrngToGetSecondVal(); // This is the second value in the sequence

assertEqual(generateNewStoneSeed(sharedPrngForTest), expectedVal1Shared, "generateNewStoneSeed with shared PRNG returns its first value on first call");
assertEqual(generateNewStoneSeed(sharedPrngForTest), expectedVal2Shared, "generateNewStoneSeed with shared PRNG returns its second value on second call");

console.log("\n--- All tests complete ---");
console.log("Run these tests using: node tests/test_stone_mechanics.js");
