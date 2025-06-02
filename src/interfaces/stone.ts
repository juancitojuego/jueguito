// src/interfaces/stone.ts
export interface StoneQualities {
  seed: number;
  color: string; // Consider using a specific color palette type if applicable
  shape: string; // Consider an enum or literal union for shapes
  rarity: number;
  hardness: number;
  weight: number;
  magic: number;
  createdAt: number; // Timestamp
  name?: string; // Optional user-defined name
  // Any other intrinsic properties
}
