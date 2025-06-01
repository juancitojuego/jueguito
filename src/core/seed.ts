import * as readline from 'readline';
import { SeedProperties, RNG } from '../types';

export async function promptForSeed(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Enter a seed string: ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

export function initializeRNG(seed: string): RNG {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }

  return function() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296; // Normalize to 0-1
  }
}

export function generateSeedProperties(seed: string, rng: RNG): SeedProperties {
  const colors = ["Red", "Green", "Blue", "Yellow", "Purple", "Orange"];
  const shapes = ["Sphere", "Cube", "Pyramid", "Obelisk", "Crystal", "Shard"];

  const color = colors[Math.floor(rng() * colors.length)];
  const shape = shapes[Math.floor(rng() * shapes.length)];
  const weight = Math.floor(rng() * 100) + 1; // 1-100
  const hardness = Math.floor(rng() * 101); // 0-100
  const rarity = Math.floor(rng() * 11); // 0-10

  return {
    color,
    shape,
    weight,
    hardness,
    rarity,
  };
}

export function displaySeedProperties(properties: SeedProperties): void {
  console.log("\n--- Seed Properties ---");
  console.log(`Color: ${properties.color}`);
  console.log(`Shape: ${properties.shape}`);
  console.log(`Weight: ${properties.weight}`);
  console.log(`Hardness: ${properties.hardness}`);
  console.log(`Rarity: ${properties.rarity}`);
  console.log("---------------------\n");
}
