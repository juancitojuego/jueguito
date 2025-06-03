// src/interfaces/gameState.ts
import type { StoneQualities } from './stone';
import type { Card } from './card'; // Import Card
import type { ActiveEffect } from './activeEffect'; // Import ActiveEffect

export interface PlayerStats {
  name: string;
}

export interface GameState {
  gameSeed: number | null;
  playerStats: PlayerStats;
  currency: number;
  stones: StoneQualities[];
  equippedStoneId: number | null;
  
  opponentsSeed: number | null;
  opponents_index: number;

  // New properties for card game mechanics
  deck: Card[];
  hand: Card[];
  discardPile: Card[];

  // Active effects on the player's stone during combat.
  playerActiveCombatEffects: ActiveEffect[];
}
