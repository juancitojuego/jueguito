// src/fight_service.ts
import { StoneQualities, calculateStonePower, createStone, generateNewStoneSeed, mulberry32 } from "./stone_mechanics"; // Added createStone, generateNewStoneSeed, mulberry32
import {
    CombatParticipantState,
    ActiveEffect,
    FightSessionData,
    Card,
    NewRoundInfo,
    TargetType,
    CardPlayOutcome,
    RoundResolutionOutcome,
    FightOutcome // Added import
} from "./combat_interfaces";
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

export function applyActiveEffectsToParticipant(
    participantState: CombatParticipantState,
    activeEffects: ReadonlyArray<ActiveEffect>
): CombatParticipantState {
    const newState = { ...participantState };
    newState.currentPower = newState.basePower;
    newState.currentDefense = newState.baseDefense;

    activeEffects.forEach(effect => {
        if (effect.powerBoost) newState.currentPower += effect.powerBoost;
        if (effect.defenseBoost) newState.currentDefense += effect.defenseBoost;
        if (effect.healAmount) {
            newState.currentHealth += effect.healAmount;
            if (newState.currentHealth > newState.maxHealth) {
                newState.currentHealth = newState.maxHealth;
            }
        }
    });
    return newState;
}

/**
 * Helper function to update durations of active effects and remove expired ones.
 * This function is internal to fight_service.ts (not exported).
 * @param activeEffects - The list of active effects to update.
 * @returns A new array with updated and filtered effects.
 */
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
        console.error("[startFight] Player or opponent stone is missing.");
        return null;
    }
    const playerInitialState = createInitialCombatParticipantState(playerStone, defaultHealth);
    const opponentInitialState = createInitialCombatParticipantState(opponentStone, defaultHealth);
    gameState.playerActiveCombatEffects = [];
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
    if (!fightSession || fightSession.isFightOver) {
        return null;
    }
    fightSession.currentRound++;
    fightSession.fightLog.push(`Round ${fightSession.currentRound} begins.`);

    fightSession.playerState = applyActiveEffectsToParticipant(
        fightSession.playerState,
        gameState.playerActiveCombatEffects
    );
    fightSession.opponentState = applyActiveEffectsToParticipant(
        fightSession.opponentState,
        fightSession.opponentState.activeEffects
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
    fightSession.currentRoundChoices = [];

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

    const playedCard = gameState.removeCardFromHand(cardId);
    if (!playedCard) {
        return { success: false, message: `PlayerPlaysCard: Failed to remove card '${cardId}' from hand.` };
    }
    gameState.addCardsToDiscardPile([playedCard]);

    let targetState: CombatParticipantState;
    let existingEffectsList: ReadonlyArray<ActiveEffect>;

    if (targetType === TargetType.PLAYER) {
        targetState = fightSession.playerState;
        existingEffectsList = gameState.playerActiveCombatEffects;
    } else {
        targetState = fightSession.opponentState;
        existingEffectsList = fightSession.opponentState.activeEffects;
    }

    if (!cardToPlay.effect || typeof cardToPlay.effect.apply !== 'function') {
        return { success: false, message: `Card ${cardToPlay.name} has no playable effect defined.` };
    }
    const newEffectsListForTarget = cardToPlay.effect.apply(targetState, existingEffectsList);

    if (targetType === TargetType.PLAYER) {
        gameState.updatePlayerActiveCombatEffects(newEffectsListForTarget);
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
    if (!fightSession || fightSession.isFightOver) {
        return null;
    }

    fightSession.playerState = applyActiveEffectsToParticipant(fightSession.playerState, gameState.playerActiveCombatEffects);
    fightSession.opponentState = applyActiveEffectsToParticipant(fightSession.opponentState, fightSession.opponentState.activeEffects);

    const player = fightSession.playerState;
    const opponent = fightSession.opponentState;

    const playerDamageDealt = Math.max(0, player.currentPower - opponent.currentDefense);
    const opponentDamageDealt = Math.max(0, opponent.currentPower - player.currentDefense);

    opponent.currentHealth = Math.max(0, opponent.currentHealth - playerDamageDealt);
    player.currentHealth = Math.max(0, player.currentHealth - opponentDamageDealt);

    gameState.playerActiveCombatEffects = updateAndCleanupActiveEffects(gameState.playerActiveCombatEffects);
    fightSession.playerState = applyActiveEffectsToParticipant(player, gameState.playerActiveCombatEffects);

    fightSession.opponentState.activeEffects = updateAndCleanupActiveEffects(opponent.activeEffects);
    fightSession.opponentState = applyActiveEffectsToParticipant(opponent, fightSession.opponentState.activeEffects);

    let winner: TargetType | 'tie' | undefined = undefined;
    if (player.currentHealth <= 0 && opponent.currentHealth <= 0) {
        fightSession.isFightOver = true;
        winner = 'tie';
    } else if (opponent.currentHealth <= 0) {
        fightSession.isFightOver = true;
        winner = TargetType.PLAYER;
    } else if (player.currentHealth <= 0) {
        fightSession.isFightOver = true;
        winner = TargetType.OPPONENT;
    }

    const logEntry = `Round ${fightSession.currentRound} resolved. Player dealt ${playerDamageDealt} dmg, Opponent dealt ${opponentDamageDealt} dmg. Player HP: ${player.currentHealth}, Opponent HP: ${opponent.currentHealth}.`;
    fightSession.fightLog.push(logEntry);
    if (fightSession.isFightOver) {
        fightSession.fightLog.push(`Fight Over! Winner: ${winner || 'None determined'}.`);
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
        console.error("[endFight] No fight session provided.");
        return null;
    }

    // Ensure fight is marked as over, even if winner wasn't determined by resolveCurrentRound (e.g. conceded)
    if (!fightSession.isFightOver) {
        if (winner === undefined) { // If winner is not passed, try to determine from health
            if (fightSession.playerState.currentHealth <= 0 && fightSession.opponentState.currentHealth <= 0) winner = 'tie';
            else if (fightSession.opponentState.currentHealth <= 0) winner = TargetType.PLAYER;
            else if (fightSession.playerState.currentHealth <= 0) winner = TargetType.OPPONENT;
            else { // Fight not actually over based on health, and no winner declared
                console.warn("[endFight] Called on an ongoing fight without a declared winner.");
                 return {
                     playerStoneId: fightSession.playerParticipantId,
                     opponentStoneId: fightSession.opponentParticipantId,
                     winner: undefined, // Explicitly undefined
                     fightLog: fightSession.fightLog,
                     currencyChange: 0,
                     stoneLostByPlayer: false,
                     newStoneGainedByPlayer: undefined,
                 };
            }
        }
        fightSession.isFightOver = true; // Mark it as over
    }


    let currencyChange = 0;
    let stoneLostByPlayer = false;
    let newStoneGainedByPlayer: StoneQualities | undefined = undefined;
    const fightOutcomeLog: string[] = [...fightSession.fightLog];

    if (winner === TargetType.PLAYER) {
        currencyChange = 10;
        gameState.updateCurrency(currencyChange);
        fightOutcomeLog.push(`Player wins! Gained ${currencyChange} currency.`);

        const rewardPrng = mulberry32(gameState.gameSeed + fightSession.currentRound + fightSession.playerParticipantId + Date.now());
        if ((rewardPrng() / 0xFFFFFFFF) < 0.10) {
            const newStoneSeed = generateNewStoneSeed(rewardPrng);
            newStoneGainedByPlayer = createStone(newStoneSeed);
            gameState.addStoneToInventory(newStoneGainedByPlayer);
            fightOutcomeLog.push(`Player found a new stone: ${newStoneGainedByPlayer.name}!`);
        }
    } else if (winner === TargetType.OPPONENT) {
        fightOutcomeLog.push("Opponent wins.");
        const penaltyPrng = mulberry32(gameState.gameSeed + fightSession.currentRound + fightSession.opponentParticipantId + Date.now());
        if ((penaltyPrng() / 0xFFFFFFFF) < 0.15 && gameState.equippedStoneId !== null) {
            const lostStone = gameState.getStoneById(gameState.equippedStoneId);
            if (lostStone) {
                gameState.removeStoneFromInventory(gameState.equippedStoneId);
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
