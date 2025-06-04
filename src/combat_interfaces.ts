// src/combat_interfaces.ts
import { StoneQualities } from "./stone_mechanics";

// Placeholder for Card - will be detailed more in a later step
export interface Card {
    id: string;
    name: string;
    description: string;
    type: string; // Example: BUFF_ATTACK, BUFF_DEFENSE, SPECIAL - consider enum later
    // effect: Effect; // Placeholder for actual effect logic
}

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
    currentRoundChoices?: Card[]; // Add this property - cards offered to player at start of round
}

export enum TargetType {
    PLAYER = 'player',
    OPPONENT = 'opponent',
}

// New Interface for Start New Round result
export interface NewRoundInfo {
    roundNumber: number;
    cardsForChoice: Card[];
    playerHealth: number;
    opponentHealth: number;
    // Optionally include player/opponent power & defense if useful for UI
    // playerCurrentPower: number;
    // opponentCurrentPower: number;
}
