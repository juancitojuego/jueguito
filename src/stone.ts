// src/stone.ts

// --- Interfaces and Types ---
export interface StoneQualities {
  seed: number; // Keep the seed with its qualities
  color: string;
  rarity: number; // 0-100
  weight: number; // 1-100
  shape: string;
  hardness: number; // 0.00-1.00
}

// --- Constants ---
export const COLORS: string[] = [
  "Red", "Blue", "Green", "Yellow", "Magenta", "Cyan", "White", "Black",
];

export const SHAPES: string[] = [
  "Cube", "Sphere", "Pyramid", "Prism", "Cylinder",
];

// --- PRNG (Mulberry32) ---
/**
 * Creates a Mulberry32 pseudo-random number generator.
 * @param seed A 32-bit integer seed.
 * @returns A function that returns a new pseudo-random number (0 to 1, exclusive) each time it's called.
 */
export function mulberry32(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

/**
 * Generates a new 32-bit integer seed from a PRNG function.
 * The PRNG function should output values between 0 (inclusive) and 1 (exclusive).
 * @param prng A PRNG function, like one returned by mulberry32.
 * @returns A new 32-bit integer seed.
 */
export function generateNewStoneSeed(prng: () => number): number {
  // Multiply by 2^32 to get a full 32-bit integer range, then floor.
  return Math.floor(prng() * 0xFFFFFFFF);
}


// --- Quality Derivation ---
/**
 * Derives stone qualities from a given 32-bit integer seed.
 * @param seed The 32-bit integer seed for the stone.
 * @returns An object containing the stone's qualities.
 */
export function deriveStoneQualities(seed: number): StoneQualities {
  const prng = mulberry32(seed); // Create a PRNG instance specifically for this seed

  // For each quality, call prng() to get a new random number.
  // This ensures that each quality is derived independently from the seed's PRNG sequence.

  const colorIndex = Math.floor(prng() * COLORS.length);
  const color = COLORS[colorIndex];

  const rarity = Math.floor(prng() * 101); // 0-100

  const weight = 1 + Math.floor(prng() * 100); // 1-100

  const shapeIndex = Math.floor(prng() * SHAPES.length);
  const shape = SHAPES[shapeIndex];

  // Hardness: 0.00 - 1.00 (float with two decimals)
  // Corrected to ensure two decimal places properly:
  const hardness = parseFloat((prng()).toFixed(2)); // Generate a float 0-0.99... then fix to 2 decimals.
                                                 // If we want 0-1.00 inclusive with 2 decimals,
                                                 // Math.floor(prng() * 101) / 100 is better. Let's use that.
  const correctedHardness = Math.floor(prng() * 101) / 100;


  return {
    seed, // Include the original seed
    color,
    rarity,
    weight,
    shape,
    hardness: correctedHardness,
  };
}
