// src/fight_service.ts
import { StoneQualities, calculateStonePower } from "./stone_mechanics";
import { CombatParticipantState, ActiveEffect, FightSessionData } from "./combat_interfaces"; // ActiveEffect not used yet, but good for consistency
import { GameState } from "./game_state";

/**
 * Creates the initial state for a combat participant.
 * @param stone - The StoneQualities of the participant.
 * @param initialHealth - The initial health, defaults to 100.
 * @returns CombatParticipantState object.
 */
export function createInitialCombatParticipantState(
    stone: StoneQualities,
    initialHealth: number = 100
): CombatParticipantState {
    const basePower = calculateStonePower(stone);
    const baseDefense = 0; // Default base defense

    return {
        baseStone: stone,
        maxHealth: initialHealth,
        currentHealth: initialHealth,
        basePower: basePower,
        baseDefense: baseDefense,
        currentPower: basePower,    // Initially currentPower is basePower
        currentDefense: baseDefense, // Initially currentDefense is baseDefense
        activeEffects: [],          // No active effects at the start
    };
}

// Module-level variable to hold the active fight session
let currentFightSession: FightSessionData | null = null;

/**
 * Initiates a fight between the player and an opponent.
 * @param playerStone - The player's StoneQualities.
 * @param opponentStone - The opponent's StoneQualities.
 * @param gameState - The current GameState, used to clear player's active combat effects.
 * @param defaultHealth - The default health for participants (e.g. 100)
 * @returns The created FightSessionData object, or null if inputs are invalid.
 */
export function startFight(
    playerStone: StoneQualities | null,
    opponentStone: StoneQualities | null,
    gameState: GameState, // GameState is used to clear playerActiveCombatEffects
    defaultHealth: number = 100
): FightSessionData | null {
    if (!playerStone || !opponentStone) {
        console.error("[startFight] Player or opponent stone is missing.");
        return null;
    }

    const playerInitialState = createInitialCombatParticipantState(playerStone, defaultHealth);
    const opponentInitialState = createInitialCombatParticipantState(opponentStone, defaultHealth);

    // Clear player's active combat effects from previous fights at the GameState level
    gameState.playerActiveCombatEffects = [];

    const newSession: FightSessionData = {
        sessionId: `fight_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        playerParticipantId: playerStone.seed,
        opponentParticipantId: opponentStone.seed,
        playerState: playerInitialState,
        opponentState: opponentInitialState,
        currentRound: 0, // Round numbers usually start at 1 for display, but 0 for "before first round" is fine internally
        isFightOver: false,
        fightLog: [`Fight started between Player (Stone ${playerStone.seed}) and Opponent (Stone ${opponentStone.seed}).`],
    };

    currentFightSession = newSession; // Store as the active session
    // console.log(`[startFight] Fight session ${newSession.sessionId} started. Player health: ${newSession.playerState.currentHealth}, Opponent health: ${newSession.opponentState.currentHealth}`);
    return newSession;
}

/**
 * Retrieves the current active fight session.
 * @returns The current FightSessionData or null if no fight is active.
 */
export function getCurrentFightSession(): FightSessionData | null {
    return currentFightSession;
}

/**
 * Clears the current fight session, e.g., after a fight ends.
 */
export function clearCurrentFightSession(): void {
    currentFightSession = null;
    // console.log("[clearCurrentFightSession] Active fight session cleared.");
}
