// src/fight_service.ts
import { StoneQualities, calculateStonePower, createStone, generateNewStoneSeed, mulberry32 } from "./stone_mechanics";
import {
    CombatParticipantState,
    ActiveEffect,
    FightSessionData,
    Card,
    NewRoundInfo,
    TargetType,
    CardPlayOutcome,
    RoundResolutionOutcome,
    FightOutcome
} from "./combat_interfaces";
import { GameState } from "./game_state";
import { GameStateManager } from "./game_state_manager";

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

export function applyActiveEffectsToParticipant(
    participantState: CombatParticipantState,
    effectsToApply: ReadonlyArray<ActiveEffect>
): CombatParticipantState {
    let calculatedPower = participantState.basePower;
    let calculatedDefense = participantState.baseDefense;
    let newCurrentHealth = participantState.currentHealth; // Health changes are cumulative from effects

    for (const effect of effectsToApply) {
        if (effect.powerBoost) calculatedPower += effect.powerBoost;
        if (effect.defenseBoost) calculatedDefense += effect.defenseBoost;
        if (effect.healAmount) newCurrentHealth += effect.healAmount;
    }

    if (newCurrentHealth > participantState.maxHealth) newCurrentHealth = participantState.maxHealth;
    if (newCurrentHealth < 0) newCurrentHealth = 0; // Should not happen with heal, but good for damage later

    return {
        ...participantState,
        currentPower: calculatedPower,
        currentDefense: calculatedDefense,
        currentHealth: newCurrentHealth,
        // activeEffects: [...effectsToApply], // This was in the prompt, but applyActiveEffectsToParticipant should not manage the list itself, only calculate stats from it. The list is managed externally.
    };
}

function updateAndCleanupActiveEffects(activeEffects: ReadonlyArray<ActiveEffect>): ActiveEffect[] {
    const updatedEffects: ActiveEffect[] = [];
    for (const effect of activeEffects) {
        const newDuration = effect.remainingDuration - 1;
        if (newDuration > 0) {
            updatedEffects.push({ ...effect, remainingDuration: newDuration });
        }
    }
    return updatedEffects;
}

let currentFightSession: FightSessionData | null = null;

export function startFight(
    playerStone: StoneQualities | null,
    opponentStone: StoneQualities | null,
    gameState: GameState,
    defaultHealth: number = 100
): FightSessionData | null {
    if (!playerStone || !opponentStone) {
        // console.error("[startFight] Player or opponent stone is missing.");
        return null;
    }
    const playerInitialState = createInitialCombatParticipantState(playerStone, defaultHealth);
    const opponentInitialState = createInitialCombatParticipantState(opponentStone, defaultHealth);
    GameStateManager.updatePlayerActiveCombatEffects(gameState, []); // Clear existing player effects via manager
    const newSession: FightSessionData = {
        sessionId: `fight_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        playerParticipantId: playerStone.seed,
        opponentParticipantId: opponentStone.seed,
        playerState: playerInitialState,
        opponentState: opponentInitialState,
        currentRound: 0,
        isFightOver: false,
        fightLog: [`Fight started between Player (Stone ${playerStone.seed}) and Opponent (Stone ${opponentStone.seed}).`],
        currentRoundChoices: []
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
    if (!fightSession || fightSession.isFightOver) { return null; }
    fightSession.currentRound++;
    fightSession.fightLog.push(`Round ${fightSession.currentRound} begins.`);
    fightSession.playerState = applyActiveEffectsToParticipant(fightSession.playerState, gameState.playerActiveCombatEffects);
    fightSession.opponentState = applyActiveEffectsToParticipant(fightSession.opponentState, fightSession.opponentState.activeEffects);
    const cardsForChoice = GameStateManager.drawCardsFromDeck(gameState, 3);
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
    GameStateManager.addCardsToHand(gameState, [chosenCard]);
    const discardedCards = fightSession.currentRoundChoices.filter(card => card.id !== chosenCardId);
    if (discardedCards.length > 0) {
        GameStateManager.addCardsToDiscardPile(gameState, discardedCards);
    }
    fightSession.currentRoundChoices = [];
    fightSession.fightLog.push(`Round ${fightSession.currentRound}: Player selected ${chosenCard.name}.`);
    return {
        success: true,
        message: `Player selected card: ${chosenCard.name}.`,
        chosenCard: chosenCard,
    };
}

export function playerPlaysCard(
    fightSession: FightSessionData | null,
    gameState: GameState,
    cardId: string,
    targetType: TargetType
): CardPlayOutcome {
    if (!fightSession || fightSession.isFightOver) {
        return { success: false, message: "PlayerPlaysCard: No active fight session or fight is over." };
    }
    const cardToPlay = gameState.hand.find(card => card.id === cardId);
    if (!cardToPlay) {
        return { success: false, message: `PlayerPlaysCard: Card with ID '${cardId}' not found in hand.` };
    }
    const playedCard = GameStateManager.removeCardFromHand(gameState, cardId);
    if (!playedCard) {
        return { success: false, message: `PlayerPlaysCard: Failed to remove card '${cardId}' from hand.` };
    }
    GameStateManager.addCardsToDiscardPile(gameState, [playedCard]);
    let targetState: CombatParticipantState;
    let existingEffectsList: ReadonlyArray<ActiveEffect>;
    if (targetType === TargetType.PLAYER) {
        targetState = fightSession.playerState;
        existingEffectsList = gameState.playerActiveCombatEffects;
    } else {
        targetState = fightSession.opponentState;
        existingEffectsList = fightSession.opponentState.activeEffects;
    }
    const newEffectsListForTarget = cardToPlay.effect.apply(targetState, existingEffectsList);
    if (targetType === TargetType.PLAYER) {
        GameStateManager.updatePlayerActiveCombatEffects(gameState, newEffectsListForTarget);
        fightSession.playerState = applyActiveEffectsToParticipant(fightSession.playerState, gameState.playerActiveCombatEffects);
    } else {
        fightSession.opponentState.activeEffects = [...newEffectsListForTarget];
        fightSession.opponentState = applyActiveEffectsToParticipant(fightSession.opponentState, fightSession.opponentState.activeEffects);
    }
    fightSession.fightLog.push(`Round ${fightSession.currentRound}: Player played ${cardToPlay.name} on ${targetType}.`);
    return {
        success: true,
        message: `Played ${cardToPlay.name} on ${targetType}.`,
        updatedPlayerState: fightSession.playerState,
        updatedOpponentState: fightSession.opponentState
    };
}

export function resolveCurrentRound(
    fightSession: FightSessionData | null,
    gameState: GameState
): RoundResolutionOutcome | null {
    if (!fightSession || fightSession.isFightOver) { return null; }

    fightSession.playerState = applyActiveEffectsToParticipant(fightSession.playerState, gameState.playerActiveCombatEffects);
    fightSession.opponentState = applyActiveEffectsToParticipant(fightSession.opponentState, fightSession.opponentState.activeEffects);

    const player = fightSession.playerState;
    const opponent = fightSession.opponentState;
    const playerDamageDealt = Math.max(0, player.currentPower - opponent.currentDefense);
    const opponentDamageDealt = Math.max(0, opponent.currentPower - player.currentDefense);

    opponent.currentHealth = Math.max(0, opponent.currentHealth - playerDamageDealt);
    player.currentHealth = Math.max(0, player.currentHealth - opponentDamageDealt);

    GameStateManager.updatePlayerActiveCombatEffects(gameState, updateAndCleanupActiveEffects(gameState.playerActiveCombatEffects));
    fightSession.playerState = applyActiveEffectsToParticipant(player, gameState.playerActiveCombatEffects);

    fightSession.opponentState.activeEffects = updateAndCleanupActiveEffects(opponent.activeEffects);
    fightSession.opponentState = applyActiveEffectsToParticipant(opponent, fightSession.opponentState.activeEffects);

    let winner: TargetType | 'tie' | undefined = undefined;
    if (player.currentHealth <= 0 && opponent.currentHealth <= 0) {
        fightSession.isFightOver = true; winner = 'tie';
    } else if (opponent.currentHealth <= 0) {
        fightSession.isFightOver = true; winner = TargetType.PLAYER;
    } else if (player.currentHealth <= 0) {
        fightSession.isFightOver = true; winner = TargetType.OPPONENT;
    }

    const logEntry = `Round ${fightSession.currentRound} resolved. Player dealt ${playerDamageDealt}, Opponent dealt ${opponentDamageDealt}. Player HP: ${player.currentHealth}, Opponent HP: ${opponent.currentHealth}`;
    fightSession.fightLog.push(logEntry);
    if (fightSession.isFightOver) {
        fightSession.fightLog.push(`Fight Over! Winner: ${winner || 'None'}`);
    }
    return {
        playerDamageDealt,
        opponentDamageDealt,
        playerHealthAfter: player.currentHealth,
        opponentHealthAfter: opponent.currentHealth,
        roundWinner: winner,
        isFightOver: fightSession.isFightOver,
        logEntry,
    };
}

export function endFight(
    fightSession: FightSessionData | null,
    gameState: GameState,
    winner: TargetType | 'tie' | undefined
): FightOutcome | null {
    if (!fightSession) {
        // console.error("[endFight] No fight session provided.");
        return null;
    }

    if (!fightSession.isFightOver && winner === undefined) {
        // console.warn("[endFight] Fight is not marked over and winner is undefined. Determining from healths.");
        if (fightSession.playerState.currentHealth <= 0 && fightSession.opponentState.currentHealth <= 0) {
            winner = 'tie';
        } else if (fightSession.opponentState.currentHealth <= 0) {
            winner = TargetType.PLAYER;
        } else if (fightSession.playerState.currentHealth <= 0) {
            winner = TargetType.OPPONENT;
        } else {
            // console.warn("[endFight] Called on an ongoing fight without a clear winner from healths.");
             return { // Return a non-conclusive outcome if truly not over
                 playerStoneId: fightSession.playerParticipantId,
                 opponentStoneId: fightSession.opponentParticipantId,
                 winner: undefined,
                 fightLog: fightSession.fightLog,
                 currencyChange: 0,
                 stoneLostByPlayer: false,
                 newStoneGainedByPlayer: undefined,
            };
        }
        fightSession.isFightOver = true; // Mark it as over if determined here
    }

    let currencyChange = 0;
    let stoneLostByPlayer = false;
    let newStoneGainedByPlayer: StoneQualities | undefined = undefined;

    const fightOutcomeLog: string[] = [...fightSession.fightLog];

    // Use a PRNG for rewards/penalties. Seed it for deterministic testing if needed.
    // Using gameSeed + currentRound for some determinism based on game state.
    const outcomePrng = mulberry32(gameState.gameSeed + fightSession.currentRound + fightSession.sessionId.length);

    if (winner === TargetType.PLAYER) {
        currencyChange = 10;
        GameStateManager.updateCurrency(gameState, currencyChange);
        fightOutcomeLog.push(`Player wins! Gained ${currencyChange} currency.`);

        if ((outcomePrng() / 0xFFFFFFFF) < 0.10) { // 10% chance for new stone
            const newStoneSeed = generateNewStoneSeed(outcomePrng);
            newStoneGainedByPlayer = createStone(newStoneSeed);
            GameStateManager.addStoneToInventory(gameState, newStoneGainedByPlayer);
            fightOutcomeLog.push(`Player found a new stone: ${newStoneGainedByPlayer.name}!`);
        }
    } else if (winner === TargetType.OPPONENT) {
        fightOutcomeLog.push("Opponent wins.");
        if (gameState.equippedStoneId !== null && (outcomePrng() / 0xFFFFFFFF) < 0.15) { // 15% chance to lose equipped stone
            const lostStone = gameState.getStoneById(gameState.equippedStoneId); // getStoneById is on GameState instance
            if (lostStone) {
                GameStateManager.removeStoneFromInventory(gameState, gameState.equippedStoneId);
                stoneLostByPlayer = true;
                fightOutcomeLog.push(`Player lost their equipped stone: ${lostStone.name}!`);
            }
        }
    } else {
        fightOutcomeLog.push("The fight is a tie. No rewards or penalties.");
    }

    const outcome: FightOutcome = {
        playerStoneId: fightSession.playerParticipantId,
        opponentStoneId: fightSession.opponentParticipantId,
        winner: winner,
        fightLog: fightOutcomeLog,
        currencyChange,
        stoneLostByPlayer,
        newStoneGainedByPlayer,
    };

    clearCurrentFightSession();
    // console.log(`[endFight] Fight ended. Winner: ${winner}. Session cleared.`);
    return outcome;
}
