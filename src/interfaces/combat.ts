// src/interfaces/combat.ts

import type { StoneQualities } from './stone';
import type { ActiveEffect } from './activeEffect';

export interface CombatParticipantState {
  // Intrinsic qualities from the stone
  baseStone: StoneQualities;

  // Core combat stats derived or initialized at the start of combat
  maxHealth: number; // Example: could be based on stone's weight or a fixed value
  currentHealth: number;

  basePower: number; // Calculated from baseStone.power or relevant qualities
  baseDefense: number; // Example: could be 0 or derived from hardness

  // Dynamically changing stats during combat due to card effects
  currentPower: number; // basePower + temporary power boosts/nerfs
  currentDefense: number; // baseDefense + temporary defense boosts/nerfs

  // Active effects applied by cards
  activeEffects: ActiveEffect[];

  // Other potential dynamic combat properties:
  // evasionChance?: number;
  // critChance?: number;
  // statusAilments?: Array<{ type: string, duration: number }>; // e.g., poison, stun
}

// Helper function to initialize CombatParticipantState from StoneQualities
export function createInitialCombatParticipantState(
  stone: StoneQualities,
  initialHealth: number = 100 // Default initial health, can be configured
): CombatParticipantState {
  // For now, basePower can be derived using the existing calculateStonePower or a new specific combat power calculation
  // Let's assume calculateStonePower is suitable for basePower for now.
  // This import might be better placed at the top level of the file.
  const { calculateStonePower } = require('../stone'); // Dynamically require to avoid immediate circular dependency issues if stone.ts grows to import combat.ts

  const calculatedBasePower = calculateStonePower(stone);

  return {
    baseStone: stone,
    maxHealth: initialHealth,
    currentHealth: initialHealth,
    basePower: calculatedBasePower,
    baseDefense: 0, // Assuming base defense starts at 0 for simplicity
    currentPower: calculatedBasePower, // Initially, currentPower is basePower
    currentDefense: 0, // Initially, currentDefense is baseDefense
    activeEffects: [],
  };
}
