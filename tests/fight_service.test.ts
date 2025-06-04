// tests/fight_service.test.ts
import {
    createInitialCombatParticipantState,
    startFight,
    getCurrentFightSession,
    clearCurrentFightSession
} from '../src/fight_service';
import { GameState } from '../src/game_state';
import { StoneQualities, createStone, calculateStonePower } from '../src/stone_mechanics';
import { CombatParticipantState, FightSessionData, ActiveEffect } from '../src/combat_interfaces';

describe('FightService', () => {
    let playerStone: StoneQualities;
    let opponentStone: StoneQualities;
    let gameState: GameState;

    beforeEach(() => {
        // Create some sample stones for testing
        playerStone = createStone(101); // Seed 101 for player
        opponentStone = createStone(102); // Seed 102 for opponent

        // Initialize GameState
        // Using a fixed master seed for GameState.createInitial to ensure test consistency
        gameState = GameState.createInitial("CombatTester", 2000);

        // Ensure playerStone is in inventory and equipped (createInitial might add its own stone)
        // For these tests, we want to specifically use `playerStone` created here.
        gameState.stones = []; // Clear any stones from createInitial
        gameState.addStoneToInventory(playerStone);
        gameState.equipStone(playerStone.seed);

        // Clear any fight session from previous tests
        clearCurrentFightSession();
    });

    describe('createInitialCombatParticipantState', () => {
        it('should correctly initialize participant state with specified health', () => {
            const health = 150;
            const state = createInitialCombatParticipantState(playerStone, health);

            expect(state.baseStone).toBe(playerStone);
            expect(state.maxHealth).toBe(health);
            expect(state.currentHealth).toBe(health);
            expect(state.basePower).toBe(calculateStonePower(playerStone));
            expect(state.baseDefense).toBe(0); // Default
            expect(state.currentPower).toBe(state.basePower);
            expect(state.currentDefense).toBe(state.baseDefense);
            expect(state.activeEffects).toEqual([]);
        });

        it('should use default health (100) if not provided', () => {
            const state = createInitialCombatParticipantState(playerStone);
            expect(state.maxHealth).toBe(100); // Default health
            expect(state.currentHealth).toBe(100);
        });
    });

    describe('startFight', () => {
        it('should return null if playerStone is missing', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress error log
            const session = startFight(null, opponentStone, gameState);
            expect(session).toBeNull();
            consoleSpy.mockRestore();
        });

        it('should return null if opponentStone is missing', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress error log
            const session = startFight(playerStone, null, gameState);
            expect(session).toBeNull();
            consoleSpy.mockRestore();
        });

        it('should create and return a valid FightSessionData object', () => {
            const session = startFight(playerStone, opponentStone, gameState);

            expect(session).not.toBeNull();
            expect(session!.sessionId).toMatch(/^fight_\d+_\w+$/); // Basic format check
            expect(session!.playerParticipantId).toBe(playerStone.seed);
            expect(session!.opponentParticipantId).toBe(opponentStone.seed);
            expect(session!.currentRound).toBe(0);
            expect(session!.isFightOver).toBe(false);
            expect(session!.fightLog.length).toBeGreaterThanOrEqual(1);
            expect(session!.fightLog[0]).toContain(`Stone ${playerStone.seed}`)
            expect(session!.fightLog[0]).toContain(`Stone ${opponentStone.seed}`)

            // Check player state in session
            expect(session!.playerState.baseStone.seed).toBe(playerStone.seed);
            expect(session!.playerState.maxHealth).toBe(100); // Default health
            expect(session!.playerState.basePower).toBe(calculateStonePower(playerStone));

            // Check opponent state in session
            expect(session!.opponentState.baseStone.seed).toBe(opponentStone.seed);
            expect(session!.opponentState.maxHealth).toBe(100); // Default health
            expect(session!.opponentState.basePower).toBe(calculateStonePower(opponentStone));
        });

        it('should clear playerActiveCombatEffects in GameState', () => {
            const initialEffect: ActiveEffect = { id: 'eff1', name: 'Old Effect', description: 'lingering', remainingDuration: 2 };
            gameState.playerActiveCombatEffects = [initialEffect]; // Setup pre-existing effect
            expect(gameState.playerActiveCombatEffects.length).toBe(1);

            startFight(playerStone, opponentStone, gameState);
            expect(gameState.playerActiveCombatEffects.length).toBe(0);
        });

        it('should set the currentFightSession in fight_service module', () => {
            const session = startFight(playerStone, opponentStone, gameState);
            expect(getCurrentFightSession()).toBe(session); // Check if the same object instance
            if (session) { // Type guard for session
                 expect(getCurrentFightSession()?.sessionId).toBe(session.sessionId);
            } else {
                fail('Session should not be null here');
            }
        });
    });

    describe('getCurrentFightSession and clearCurrentFightSession', () => {
        it('should return null if no session is active initially', () => {
            expect(getCurrentFightSession()).toBeNull();
        });

        it('clearCurrentFightSession should set the current session to null', () => {
            startFight(playerStone, opponentStone, gameState); // Start a session
            expect(getCurrentFightSession()).not.toBeNull(); // Confirm it's active

            clearCurrentFightSession(); // Clear it
            expect(getCurrentFightSession()).toBeNull(); // Confirm it's null
        });

        it('getCurrentFightSession should return the active session if one was started', () => {
            const session = startFight(playerStone, opponentStone, gameState);
            expect(getCurrentFightSession()).toBe(session);
        });
    });
});
