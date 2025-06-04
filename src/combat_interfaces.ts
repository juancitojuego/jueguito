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
    activeEffects: ActiveEffect[];
}

export interface Effect {
    id: string; // Identifier for the *type* of effect this card applies
    description: string; // Detailed description of the card's effect
    apply: (
        target: CombatParticipantState,
        existingEffects: ReadonlyArray<ActiveEffect> // Input can be readonly
    ) => ActiveEffect[]; // Output MUST be mutable ActiveEffect[]
}

export interface Card {
    id: string;
    name: string;
    type: CardType;
    description: string;
    effect: Effect;
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
    winner?: TargetType | 'tie';
    fightLog: string[];
    currencyChange: number;
    stoneLostByPlayer: boolean;
    newStoneGainedByPlayer?: StoneQualities;
}

// Added for use in GameStateManager.loadGame for casting stoneData from JSON
export interface IStoneQualities {
    seed: number;
    name: string;
    color: string;
    shape: string;
    weight: number;
    rarity: number;
    magic: number;
    createdAt: number;
}
