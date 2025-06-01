// Random Number Generator function type
export type RNG = () => number;

// Properties of a seed
export interface SeedProperties {
  color: string;
  shape: string;
  weight: number;
  hardness: number;
  rarity: number;
}

// Properties of a stone (can be identical to SeedProperties for now)
export interface StoneProperties {
  color: string;
  shape: string;
  weight: number;
  hardness: number;
  rarity: number;
}

// Represents a single stone in the game
export interface Stone {
  id: number;
  properties: StoneProperties;
  createdAt: number; // Unix timestamp (seconds)
}

// Represents the overall game state for saving and loading
export interface GameState {
  seed: string;
  seedProperties: SeedProperties;
  stones: Stone[];
  nextStoneIdCounter: number;
}
