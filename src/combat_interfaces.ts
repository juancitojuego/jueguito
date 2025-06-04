// src/combat_interfaces.ts
import { StoneQualities } from "./stone_mechanics";

// Placeholder for ActiveEffect - will be detailed later
export interface ActiveEffect {
    id: string;          // Unique identifier for the effect instance
    name: string;        // Display name of the effect
    description: string; // Description of what the effect does
    remainingDuration: number; // How many more rounds the effect will last
    powerBoost?: number;    // Optional: Amount to add to currentPower
    defenseBoost?: number;  // Optional: Amount to add to currentDefense
    healAmount?: number;    // Optional: Amount to heal (applied once or over time based on card logic)
    // Other potential properties: damageOverTime, stun, etc.
}

export interface CombatParticipantState {
    baseStone: StoneQualities;    // The underlying stone providing base characteristics
    maxHealth: number;
    currentHealth: number;
    readonly basePower: number;   // Intrinsic power, derived from calculateStonePower(baseStone)
    readonly baseDefense: number; // Intrinsic defense, currently defaults to 0
    currentPower: number;        // Actual power used in combat (basePower + effects)
    currentDefense: number;      // Actual defense used (baseDefense + effects)
    activeEffects: ActiveEffect[]; // Array of ActiveEffect objects currently affecting the participant
}

export interface FightSessionData {
    sessionId: string;
    playerParticipantId: number; // e.g., player's stone seed
    opponentParticipantId: number; // e.g., opponent's stone seed
    playerState: CombatParticipantState;
    opponentState: CombatParticipantState;
    currentRound: number;
    isFightOver: boolean;
    fightLog: string[]; // Log of significant events in the fight
}

export enum TargetType {
    PLAYER = 'player',
    OPPONENT = 'opponent',
}
