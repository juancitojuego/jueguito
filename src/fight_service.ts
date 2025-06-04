// src/fight_service.ts
import { StoneQualities, calculateStonePower } from "./stone_mechanics";
import { CombatParticipantState, ActiveEffect, FightSessionData, Card, NewRoundInfo } from "./combat_interfaces";
import { GameState } from "./game_state";

export function createInitialCombatParticipantState(
    stone: StoneQualities,
    initialHealth: number = 100
): CombatParticipantState {
    const basePower = calculateStonePower(stone);
    const baseDefense = 0;
    return {
        baseStone: stone,
        maxHealth: initialHealth,
        currentHealth: initialHealth,
        basePower: basePower,
        baseDefense: baseDefense,
        currentPower: basePower,
        currentDefense: baseDefense,
        activeEffects: [],
    };
}

// Placeholder - to be implemented in a later step for full effect logic (duration, etc.)
export function applyActiveEffectsToParticipant(
    participantState: CombatParticipantState,
    activeEffects: ReadonlyArray<ActiveEffect> // Effects to apply for this turn's calculation
): CombatParticipantState {
    // console.log(`[applyActiveEffectsToParticipant] Applying effects to: ${participantState.baseStone.name}`);
    // Create a new state object to avoid mutating the original directly
    const newState = { ...participantState };

    // Start with base stats for this calculation turn
    newState.currentPower = newState.basePower;
    newState.currentDefense = newState.baseDefense;
    // Note: currentHealth is not reset here, it's carried over. Healing effects would add to it.

    activeEffects.forEach(effect => {
        if (effect.powerBoost) newState.currentPower += effect.powerBoost;
        if (effect.defenseBoost) newState.currentDefense += effect.defenseBoost;
        // if (effect.healAmount) newState.currentHealth += effect.healAmount; // Healing might be better applied directly or via specific card effect logic
    });

    // Clamp health if healing was applied and exceeded maxHealth
    // if (newState.currentHealth > newState.maxHealth) newState.currentHealth = newState.maxHealth;

    // console.log(`[applyActiveEffectsToParticipant] ${participantState.baseStone.name} - New Power: ${newState.currentPower}, New Defense: ${newState.currentDefense}`);
    return newState; // Return the new state with recalculated currentPower/Defense
}

let currentFightSession: FightSessionData | null = null;

export function startFight(
    playerStone: StoneQualities | null,
    opponentStone: StoneQualities | null,
    gameState: GameState,
    defaultHealth: number = 100
): FightSessionData | null {
    if (!playerStone || !opponentStone) {
        console.error("[startFight] Player or opponent stone is missing.");
        return null;
    }
    const playerInitialState = createInitialCombatParticipantState(playerStone, defaultHealth);
    const opponentInitialState = createInitialCombatParticipantState(opponentStone, defaultHealth);
    gameState.playerActiveCombatEffects = []; // Clear any lingering effects from previous fights on GameState
    const newSession: FightSessionData = {
        sessionId: `fight_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        playerParticipantId: playerStone.seed,
        opponentParticipantId: opponentStone.seed,
        playerState: playerInitialState,
        opponentState: opponentInitialState,
        currentRound: 0,
        isFightOver: false,
        fightLog: [`Fight started between Player (Stone ${playerStone.seed}) and Opponent (Stone ${opponentStone.seed}).`],
        currentRoundChoices: [] // Initialize as empty array
    };
    currentFightSession = newSession;
    return newSession;
}

export function getCurrentFightSession(): FightSessionData | null {
    return currentFightSession;
}

export function clearCurrentFightSession(): void {
    currentFightSession = null;
}

export function startNewRound(
    fightSession: FightSessionData | null,
    gameState: GameState
): NewRoundInfo | null {
    if (!fightSession || fightSession.isFightOver) {
        // console.error("[startNewRound] Invalid or finished fight session.");
        return null;
    }
    fightSession.currentRound++;
    fightSession.fightLog.push(`Round ${fightSession.currentRound} begins.`);

    // Apply active effects to player
    fightSession.playerState = applyActiveEffectsToParticipant(
        fightSession.playerState,
        gameState.playerActiveCombatEffects // Player's effects are managed in GameState
    );
    // Apply active effects to opponent
    fightSession.opponentState = applyActiveEffectsToParticipant(
        fightSession.opponentState,
        fightSession.opponentState.activeEffects // Opponent's effects are on their own state
    );

    const cardsForChoice = gameState.drawCardsFromDeck(3);
    fightSession.currentRoundChoices = cardsForChoice;
    fightSession.fightLog.push(`Player draws ${cardsForChoice.length} card(s) for choice.`);

    return {
        roundNumber: fightSession.currentRound,
        cardsForChoice: cardsForChoice,
        playerHealth: fightSession.playerState.currentHealth,
        opponentHealth: fightSession.opponentState.currentHealth,
    };
}

export interface PlayerSelectsCardResult {
    success: boolean;
    message: string;
    chosenCard?: Card;
}

export function playerSelectsCard(
    fightSession: FightSessionData | null,
    gameState: GameState,
    chosenCardId: string
): PlayerSelectsCardResult {
    if (!fightSession || fightSession.isFightOver) {
        return { success: false, message: "PlayerSelectsCard: No active fight session or fight is over." };
    }
    if (!fightSession.currentRoundChoices || fightSession.currentRoundChoices.length === 0) {
        return { success: false, message: "PlayerSelectsCard: No cards available for choice this round." };
    }
    const chosenCard = fightSession.currentRoundChoices.find(card => card.id === chosenCardId);
    if (!chosenCard) {
        return {
            success: false,
            message: `PlayerSelectsCard: Chosen card ID '${chosenCardId}' not found in current round choices.`,
        };
    }
    gameState.addCardsToHand([chosenCard]);
    const discardedCards = fightSession.currentRoundChoices.filter(card => card.id !== chosenCardId);
    if (discardedCards.length > 0) {
        gameState.addCardsToDiscardPile(discardedCards);
    }

    fightSession.fightLog.push(`Player selected '${chosenCard.name}'. ${discardedCards.length} other card(s) discarded.`);
    fightSession.currentRoundChoices = []; // Clear choices from session

    return {
        success: true,
        message: `Player selected card: ${chosenCard.name}.`,
        chosenCard: chosenCard,
    };
}
