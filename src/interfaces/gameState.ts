// src/interfaces/gameState.ts
import type { StoneQualities } from './stone';

export interface PlayerStats {
  name: string; // Player name
  // Potentially other stats like wins, losses, etc., if not top-level in GameState
}

export interface GameState {
  gameSeed: number | null;
  playerStats: PlayerStats;
  currency: number;
  stones: StoneQualities[]; // Player's inventory of stones
  equippedStoneId: number | null; // Seed of the equipped stone, or null if none
  
  // Opponent-related state.
  // Consider if opponent queue/details should be part of GameState or managed externally
  // and only the current opponent or progress is stored.
  // For simplicity in this definition, storing index and seed for regeneration.
  opponentsSeed: number | null; // Seed used to generate the current opponent queue
  opponents_index: number;     // Current position in the opponent queue

  // Could also include things like:
  // gameVersion: string;
  // lastPlayed: number; // Timestamp
  // settings: GameSettings;
}
