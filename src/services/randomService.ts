// src/services/randomService.ts

import type { IRandomService } from '../interfaces/randomService';
import seedrandom from 'seedrandom';
import { mulberry32 } from '../stone'; // Assuming mulberry32 might be used or referenced, though seedrandom is primary

export class RandomService implements IRandomService {
  private prng!: seedrandom.PRNG; // Definite assignment assertion, will be initialized in constructor or initialize

  constructor(initialSeed?: number | string) {
    this.initialize(initialSeed || Date.now().toString()); // Initialize with a default seed if none provided
  }

  public initialize(seed: number | string): void {
    this.prng = seedrandom(seed.toString());
  }

  public getRandom(): number {
    if (!this.prng) {
      // This case should ideally not be hit if constructor ensures initialization
      console.warn('RandomService not initialized, initializing with current time.');
      this.initialize(Date.now().toString());
    }
    return this.prng();
  }

  public generateSeed(): number {
    // Generates a new 32-bit integer seed from the current PRNG
    return Math.floor(this.getRandom() * 0xffffffff);
  }

  public shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array]; // Create a shallow copy to not mutate the original
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(this.getRandom() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]]; // Swap elements
    }
    return newArray;
  }

  // mulberry32 could be a static method or kept separate if preferred.
  // For this service, seedrandom is the primary PRNG.
  // If mulberry32 is needed as an alternative PRNG method within this service,
  // it could be exposed or used internally.
  // For now, it's imported but not directly used in the IRandomService methods.
  // Example:
  // public static mulberry32(seed: number): () => number {
  //   return mulberry32(seed);
  // }
}
