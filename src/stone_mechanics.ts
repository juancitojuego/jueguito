// src/stone_mechanics.ts

/**
 * Interface defining the properties of a stone.
 */
export interface IStoneQualities {
    seed: number;
    name: string; // Getter in the class
    color: string;
    shape: string;
    weight: number;
    rarity: number;
    magic: number;
    createdAt: number;
}

/**
 * Represents the qualities of a stone.
 * Implements IStoneQualities.
 */
export class StoneQualities implements IStoneQualities {
    public readonly seed: number;
    public readonly color: string;
    public readonly shape: string;
    public readonly weight: number;
    public readonly rarity: number;
    public readonly magic: number;
    public createdAt: number; // Not readonly to allow setting during rehydration from save

    constructor(data: {
        seed: number;
        color: string;
        shape: string;
        weight: number;
        rarity: number;
        magic: number;
        createdAt?: number; // createdAt is optional in constructor data
    }) {
        this.seed = data.seed;
        this.color = data.color;
        this.shape = data.shape;
        this.weight = data.weight;
        this.rarity = data.rarity;
        this.magic = data.magic;
        this.createdAt = data.createdAt !== undefined ? data.createdAt : Date.now();
    }

    get name(): string {
        return `Stone ${this.seed}`;
    }
}

/**
 * Mulberry32 Pseudo-Random Number Generator.
 * @param {number} seed - The initial seed (32-bit integer).
 * @returns {function(): number} A function that returns a new pseudo-random number.
 */
export function mulberry32(seed: number): () => number {
    let a = seed | 0;
    return function(): number {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a); // eslint-disable-line no-var
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return (t ^ (t >>> 14)) >>> 0;
    }
}

/**
 * Derives all stone qualities from a single 32-bit seed
 * and returns a StoneQualities object.
 * @param {number} seed - The 32-bit integer seed for the stone.
 * @returns {StoneQualities} An instance of StoneQualities.
 */
export function deriveStoneQualities(seed: number): StoneQualities {
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
        // createdAt will be set by the StoneQualities constructor
    });
}

/**
 * Creates a new stone with all its qualities derived from the given seed.
 * @param {number} seed - The 32-bit integer seed for the stone.
 * @returns {StoneQualities} The fully created stone object.
 */
export function createStone(seed: number): StoneQualities {
    return deriveStoneQualities(seed);
}

/**
 * Generates a new seed for creating a new stone.
 * @param {function(): number} [globalPrng] - An optional global PRNG function.
 * @returns {number} A new 32-bit integer seed.
 */
export function generateNewStoneSeed(globalPrng?: () => number): number {
    if (globalPrng && typeof globalPrng === 'function') {
        return globalPrng();
    }
    // Placeholder: returns a timestamp-based seed if no global PRNG is provided.
    return (Date.now() & 0xFFFFFFFF) | 0;
}

/**
 * Interface for the properties required to calculate stone power.
 * Used if a full StoneQualities instance isn't available or needed.
 */
export interface StonePowerInputs {
    rarity: number;
    magic: number;
    weight: number;
}

/**
 * Calculates the combat power of a stone.
 * @param {StonePowerInputs} stone - The stone (or object with relevant properties) whose power is to be calculated.
 * @returns {number} The calculated power of the stone.
 */
export function calculateStonePower(stone: StonePowerInputs): number {
    if (!stone || typeof stone.rarity !== 'number' || typeof stone.magic !== 'number' || typeof stone.weight !== 'number') {
        // console.error("Invalid stone object provided to calculateStonePower", stone);
        return 0;
    }
    const power = (stone.rarity * 0.4) + (stone.magic * 0.3) + (stone.weight * 0.5);
    return power;
}

// Note: module.exports is removed as ES6 export syntax is used.
