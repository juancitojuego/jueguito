// src/combat_interfaces.ts
import { StoneQualities } from "./stone_mechanics";

export enum CardType {
    BUFF_ATTACK = "BUFF_ATTACK",
    BUFF_DEFENSE = "BUFF_DEFENSE",
    HEAL = "HEAL",
    ATTACK = "ATTACK",       // For cards that might directly cause damage or have attack-like properties
    SPECIAL = "SPECIAL",    // For more unique effects
}

// Forward declaration for CombatParticipantState if needed, or ensure order
// export interface CombatParticipantState;
// For ActiveEffect, it's used by Effect's apply method.

export interface ActiveEffect {
    id: string;              // Unique identifier for this specific instance of an effect (e.g., effectType_timestamp_random)
    name: string;            // Display name of the effect (e.g., "Minor Power Boost")
    description: string;     // Description of what the effect does
    remainingDuration: number; // How many more rounds the effect will last (e.g., 1 for instant, >1 for duration)
    sourceCardId?: string;   // Optional: ID of the card that applied this effect

    powerBoost?: number;
    defenseBoost?: number;
    healAmount?: number;    // Applied once when processed by applyActiveEffectsToParticipant if duration is 1, or by card's apply logic
    // Future: damageOverTime?: { amount: number, type: string };
    // Future: onTurnStart?: (self: CombatParticipantState, session: FightSessionData) => void;
    // Future: onTurnEnd?: (self: CombatParticipantState, session: FightSessionData) => void;
}

export interface Effect {
    id: string; // Unique ID for the type of effect (e.g., "power_boost_sml", "heal_sml")
    description: string; // Description of the effect provided by the card
    /**
     * Applies the card's effect to a target.
     * @param target The current state of the target participant.
     * @param existingEffects The target's current list of active effects.
     * @returns A new array of ActiveEffects that should be on the target after this card's effect is applied.
     *          This typically includes the new effect from this card and any existing effects that are not replaced or removed.
     */
    apply: (
        target: CombatParticipantState, // Target's current state
        existingEffects: ReadonlyArray<ActiveEffect>, // Target's current effects
        // Optional: caster?: CombatParticipantState // If some effects need info from the caster
    ) => ActiveEffect[]; // Returns the new list of active effects for the target
}

export interface Card {
    id: string;          // Unique card identifier (e.g., "card_001")
    name: string;
    type: CardType;      // Type of card, using the enum
    description: string; // Player-facing description of the card's action
    effect: Effect;      // The effect object defining the card's behavior
    // manaCost?: number; // Future consideration
}

export interface CombatParticipantState {
    baseStone: StoneQualities;
    maxHealth: number;
    currentHealth: number;
    readonly basePower: number;
    readonly baseDefense: number;
    currentPower: number;
    currentDefense: number;
    activeEffects: ActiveEffect[];
}

export interface FightSessionData {
    sessionId: string;
    playerParticipantId: number;
    opponentParticipantId: number;
    playerState: CombatParticipantState;
    opponentState: CombatParticipantState;
    currentRound: number;
    isFightOver: boolean;
    fightLog: string[];
    currentRoundChoices?: Card[];
}

export enum TargetType {
    PLAYER = 'player',
    OPPONENT = 'opponent',
}

export interface NewRoundInfo {
    roundNumber: number;
    cardsForChoice: Card[];
    playerHealth: number;
    opponentHealth: number;
}

// For Player Plays Card result (Phase C)
export interface CardPlayOutcome {
    success: boolean;
    message: string;
    updatedPlayerState?: CombatParticipantState;    // Optional: for UI to update immediately after card play
    updatedOpponentState?: CombatParticipantState;  // Optional: for UI to update immediately after card play
}

// For Resolve Current Round result (Phase D)
export interface RoundResolutionOutcome {
    playerDamageDealt: number;
    opponentDamageDealt: number;
    playerHealthAfter: number;
    opponentHealthAfter: number;
    roundWinner?: TargetType | 'tie'; // Indicates if someone won *this round* by reducing health to 0
    isFightOver: boolean; // Indicates if the entire fight is over
    logEntry: string; // Summary log for this round's resolution
}
