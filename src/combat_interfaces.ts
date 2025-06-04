// src/combat_interfaces.ts
import { StoneQualities } from "./stone_mechanics";

export enum CardType {
    BUFF_ATTACK = "BUFF_ATTACK",
    BUFF_DEFENSE = "BUFF_DEFENSE",
    HEAL = "HEAL",
    ATTACK = "ATTACK",
    SPECIAL = "SPECIAL",
}

export interface ActiveEffect {
    id: string;              // Unique identifier for this specific *instance* of an effect
    name: string;            // Display name of the effect (e.g., "Minor Power Boost")
    description: string;     // Description of what the effect does (e.g., "+5 Power")
    remainingDuration: number; // How many more rounds the effect will last
    sourceCardId?: string;   // Optional: ID of the card that applied this effect

    powerBoost?: number;
    defenseBoost?: number;
    healAmount?: number;    // Applied by applyActiveEffectsToParticipant if duration is 1, then effect is removed
}

export interface CombatParticipantState {
    baseStone: StoneQualities;
    maxHealth: number;
    currentHealth: number;
    readonly basePower: number;
    readonly baseDefense: number;
    currentPower: number;
    currentDefense: number;
    activeEffects: ActiveEffect[]; // This list is what applyActiveEffectsToParticipant uses to calculate current stats
}

export interface Effect {
    id: string; // Identifier for the *type* of effect this card applies (e.g., "power_boost_sml")
    description: string; // Detailed description of the card's effect for UI or logs
    /**
     * Applies the card's effect to a target.
     * @param target The current state of the target participant *before* this card's specific effect is added.
     * @param existingEffects The target's current list of active effects *before* this card's specific effect is added.
     * @returns A new array of ActiveEffects that should be on the target.
     *          This array should include any new effect instance created by this card,
     *          plus all existingEffects that are not meant to be removed or replaced by this card's effect.
     */
    apply: (
        target: CombatParticipantState,
        existingEffects: ReadonlyArray<ActiveEffect>
        // Potential future extension: caster?: CombatParticipantState
    ) => ActiveEffect[];
}

export interface Card {
    id: string;          // Unique card identifier (e.g., "card_001")
    name: string;
    type: CardType;
    description: string; // Player-facing description of the card's action
    effect: Effect;      // The effect object defining the card's behavior
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

export interface CardPlayOutcome {
    success: boolean;
    message: string;
    updatedPlayerState?: CombatParticipantState;
    updatedOpponentState?: CombatParticipantState;
}

export interface RoundResolutionOutcome {
    playerDamageDealt: number;
    opponentDamageDealt: number;
    playerHealthAfter: number;
    opponentHealthAfter: number;
    roundWinner?: TargetType | 'tie';
    isFightOver: boolean;
    logEntry: string;
}

export interface FightOutcome {
    playerStoneId: number;
    opponentStoneId: number;
    winner?: TargetType | 'tie'; // Winner can be undefined if fight ended prematurely or by other means
    fightLog: string[];
    currencyChange: number;
    stoneLostByPlayer: boolean;
    newStoneGainedByPlayer?: StoneQualities;
}
