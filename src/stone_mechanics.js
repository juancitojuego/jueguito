// src/stone_mechanics.js

/**
 * Mulberry32 Pseudo-Random Number Generator.
 * Given a seed, it returns a function that, when called, produces
 * a new pseudo-random 32-bit unsigned integer and updates its internal state.
 * @param {number} seed - The initial seed (32-bit integer).
 * @returns {function(): number} A function that returns a new pseudo-random number.
 */
function mulberry32(seed) {
    let a = seed | 0;
    return function() {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return (t ^ (t >>> 14)) >>> 0;
    }
}

class StoneQualities {
    constructor({ seed, color, shape, weight, rarity, magic }) {
        this.seed = seed;
        this.color = color; // e.g., "color_0x..."
        this.shape = shape; // e.g., "shape_0x..."
        this.weight = weight; // number
        this.rarity = rarity; // number (0-15)
        this.magic = magic;   // number (0-15)
        this.createdAt = Date.now();
    }

    get name() {
        return `Stone ${this.seed}`;
    }
}

/**
 * Derives all stone qualities from a single 32-bit seed
 * and returns a StoneQualities object.
 * Uses Mulberry32 PRNG initialized with the stone's seed.
 * - Color: 8 bits
 * - Shape: 8 bits
 * - Weight: 8 bits
 * - Rarity: 4 bits
 * - Magic: 4 bits
 * @param {number} seed - The 32-bit integer seed for the stone.
 * @returns {StoneQualities} An instance of StoneQualities.
 */
function deriveStoneQualities(seed) {
    const prng = mulberry32(seed);
    const combined_qualities = prng(); // Generate one 32-bit number

    const color_val = (combined_qualities >>> 0) & 0xFF;    // Bits 0-7
    const shape_val = (combined_qualities >>> 8) & 0xFF;    // Bits 8-15
    const weight_val = (combined_qualities >>> 16) & 0xFF;  // Bits 16-23
    const rarity_val = (combined_qualities >>> 24) & 0x0F;  // Bits 24-27
    const magic_val = (combined_qualities >>> 28) & 0x0F;   // Bits 28-31

    return new StoneQualities({
        seed: seed,
        color: `color_0x${color_val.toString(16).padStart(2, '0')}`,
        shape: `shape_0x${shape_val.toString(16).padStart(2, '0')}`,
        weight: weight_val,
        rarity: rarity_val,
        magic: magic_val,
    });
}

/**
 * Creates a new stone with all its qualities derived from the given seed.
 * This is a convenience function that calls deriveStoneQualities.
 * @param {number} seed - The 32-bit integer seed for the stone.
 * @returns {StoneQualities} The fully created stone object.
 */
function createStone(seed) {
    return deriveStoneQualities(seed);
}

/**
 * Generates a new seed for creating a new stone.
 * This will typically use a global/contextual PRNG.
 * For now, it's a placeholder.
 * @param {function(): number} [globalPrng] - An optional global PRNG function.
 * @returns {number} A new 32-bit integer seed.
 */
function generateNewStoneSeed(globalPrng) {
    if (globalPrng && typeof globalPrng === 'function') {
        return globalPrng();
    }
    return (Date.now() & 0xFFFFFFFF) | 0;
}

/**
 * Calculates the combat power of a stone.
 * Formula: (rarity * 0.4) + (magic * 0.3) + (weight * 0.5)
 * @param {StoneQualities} stone - The stone whose power is to be calculated.
 * @returns {number} The calculated power of the stone.
 */
function calculateStonePower(stone) {
    if (!stone || typeof stone.rarity !== 'number' || typeof stone.magic !== 'number' || typeof stone.weight !== 'number') {
        // console.error("Invalid stone object provided to calculateStonePower", stone);
        return 0; // Or throw an error
    }
    const power = (stone.rarity * 0.4) + (stone.magic * 0.3) + (stone.weight * 0.5);
    return power;
}

// CommonJS exports for Node.js compatibility (useful for testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        mulberry32,
        StoneQualities,
        deriveStoneQualities,
        createStone,
        generateNewStoneSeed,
        calculateStonePower
    };
}
