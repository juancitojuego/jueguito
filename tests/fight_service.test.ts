// tests/fight_service.test.ts
import {
    createInitialCombatParticipantState,
    startFight,
    getCurrentFightSession,
    clearCurrentFightSession,
    applyActiveEffectsToParticipant,
    startNewRound,
    playerSelectsCard, // Added import
    PlayerSelectsCardResult // Added import
} from '../src/fight_service';
import { GameState } from '../src/game_state';
import { StoneQualities, createStone, calculateStonePower } from '../src/stone_mechanics';
import { CombatParticipantState, FightSessionData, ActiveEffect, Card, NewRoundInfo } from '../src/combat_interfaces';
import * as CardConfig from '../src/config/cards';

describe('FightService', () => {
    let playerStone: StoneQualities;
    let opponentStone: StoneQualities;
    let gameState: GameState;
    let fightSession: FightSessionData | null;

    beforeEach(() => {
        playerStone = createStone(101);
        opponentStone = createStone(102);
        gameState = GameState.createInitial("CombatTester", 2000);

        gameState.stones = [];
        gameState.addStoneToInventory(playerStone);
        gameState.equipStone(playerStone.seed);

        clearCurrentFightSession();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('createInitialCombatParticipantState', () => {
        it('should correctly initialize participant state with specified health', () => {
            const health = 150;
            const state = createInitialCombatParticipantState(playerStone, health);
            expect(state.baseStone).toBe(playerStone);
            expect(state.maxHealth).toBe(health);
            expect(state.currentHealth).toBe(health);
            expect(state.basePower).toBe(calculateStonePower(playerStone));
            expect(state.baseDefense).toBe(0);
            expect(state.currentPower).toBe(state.basePower);
            expect(state.currentDefense).toBe(state.baseDefense);
            expect(state.activeEffects).toEqual([]);
        });
        it('should use default health (100) if not provided', () => {
            const state = createInitialCombatParticipantState(playerStone);
            expect(state.maxHealth).toBe(100);
            expect(state.currentHealth).toBe(100);
        });
    });

    describe('startFight', () => {
        beforeEach(() => {
            clearCurrentFightSession();
        });

        it('should return null if playerStone is missing', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const session = startFight(null, opponentStone, gameState);
            expect(session).toBeNull();
            consoleSpy.mockRestore();
        });
        it('should return null if opponentStone is missing', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const session = startFight(playerStone, null, gameState);
            expect(session).toBeNull();
            consoleSpy.mockRestore();
        });
        it('should create and return a valid FightSessionData object', () => {
            const session = startFight(playerStone, opponentStone, gameState);
            expect(session).not.toBeNull();
            expect(session!.sessionId).toMatch(/^fight_\d+_\w+$/);
            expect(session!.playerParticipantId).toBe(playerStone.seed);
            expect(session!.opponentParticipantId).toBe(opponentStone.seed);
            expect(session!.currentRound).toBe(0);
            expect(session!.isFightOver).toBe(false);
            expect(session!.fightLog.length).toBeGreaterThanOrEqual(1);
            expect(session!.playerState.baseStone.seed).toBe(playerStone.seed);
            expect(session!.opponentState.baseStone.seed).toBe(opponentStone.seed);
        });
        it('should clear playerActiveCombatEffects in GameState', () => {
            gameState.playerActiveCombatEffects = [{ id: 'eff1', name: 'Old', description: '', remainingDuration: 1 }];
            startFight(playerStone, opponentStone, gameState);
            expect(gameState.playerActiveCombatEffects.length).toBe(0);
        });
        it('should set the currentFightSession', () => {
            const session = startFight(playerStone, opponentStone, gameState);
            expect(getCurrentFightSession()).toBe(session);
        });
    });

    describe('getCurrentFightSession and clearCurrentFightSession', () => {
        it('should return null if no session is active', () => {
            clearCurrentFightSession();
            expect(getCurrentFightSession()).toBeNull();
        });
        it('clearCurrentFightSession should set the current session to null', () => {
            startFight(playerStone, opponentStone, gameState);
            expect(getCurrentFightSession()).not.toBeNull();
            clearCurrentFightSession();
            expect(getCurrentFightSession()).toBeNull();
        });
    });

    describe('applyActiveEffectsToParticipant', () => {
        let participantState: CombatParticipantState;

        beforeEach(() => {
            const stoneForEffectTest = createStone(301);
            participantState = createInitialCombatParticipantState(stoneForEffectTest, 100);
        });

        it('should correctly apply power and defense boosts', () => {
            const effects: ActiveEffect[] = [
                { id: 'p1', name: 'P+', description: '', remainingDuration: 1, powerBoost: 10 },
                { id: 'd1', name: 'D+', description: '', remainingDuration: 1, defenseBoost: 5 },
            ];
            const newState = applyActiveEffectsToParticipant(participantState, effects);
            expect(newState.currentPower).toBe(participantState.basePower + 10);
            expect(newState.currentDefense).toBe(participantState.baseDefense + 5);
        });

        it('should not apply healing directly in current placeholder (currentHealth not changed by this func)', () => {
            const effects: ActiveEffect[] = [
                { id: 'h1', name: 'Heal', description: '', remainingDuration: 1, healAmount: 20 },
            ];
            participantState.currentHealth = 70;
            const newState = applyActiveEffectsToParticipant(participantState, effects);
            expect(newState.currentHealth).toBe(70);
        });

        it('should handle multiple effects of the same type (e.g., multiple power boosts)', () => {
            const effects: ActiveEffect[] = [
                { id: 'p1', name: 'P+', description: '', remainingDuration: 1, powerBoost: 10 },
                { id: 'p2', name: 'P++', description: '', remainingDuration: 1, powerBoost: 5 },
            ];
            const newState = applyActiveEffectsToParticipant(participantState, effects);
            expect(newState.currentPower).toBe(participantState.basePower + 15);
        });

        it('should return a new state object and not mutate the original participantState directly', () => {
            const originalPower = participantState.currentPower;
            const effects: ActiveEffect[] = [{ id: 'p1', name: 'P+', description: '', remainingDuration: 1, powerBoost: 10 }];
            const newState = applyActiveEffectsToParticipant(participantState, effects);

            expect(newState).not.toBe(participantState);
            expect(participantState.currentPower).toBe(originalPower);
            expect(newState.currentPower).toBe(originalPower + 10);
        });
    });

    describe('startNewRound', () => {
        beforeEach(() => {
            fightSession = startFight(playerStone, opponentStone, gameState);
            if (gameState.deck.length < 3) {
                gameState.generateDeck();
            }
        });

        it('should return null if fight session is null or over', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            expect(startNewRound(null, gameState)).toBeNull();
            if (fightSession) fightSession.isFightOver = true;
            expect(startNewRound(fightSession, gameState)).toBeNull();
            consoleSpy.mockRestore();
        });

        it('should increment currentRound in the session', () => {
            const initialRound = fightSession!.currentRound;
            startNewRound(fightSession, gameState);
            expect(fightSession!.currentRound).toBe(initialRound + 1);
        });

        it('should apply active effects to player and opponent', () => {
            gameState.playerActiveCombatEffects = [{ id: 'p_eff', name: 'PBoost', description: '', remainingDuration: 1, powerBoost: 5 }];
            fightSession!.opponentState.activeEffects = [{ id: 'o_eff', name: 'DBoost', description: '', remainingDuration: 1, defenseBoost: 3 }];

            const initialPlayerPower = fightSession!.playerState.basePower;
            const initialOpponentDefense = fightSession!.opponentState.baseDefense;

            startNewRound(fightSession, gameState);

            expect(fightSession!.playerState.currentPower).toBe(initialPlayerPower + 5);
            expect(fightSession!.opponentState.currentDefense).toBe(initialOpponentDefense + 3);
        });

        it('should draw 3 cards for choice and store them in fightSession.currentRoundChoices', () => {
            if (gameState.deck.length < 3) gameState.generateDeck();
            const updatedInitialDeckSize = gameState.deck.length;

            const newRoundInfo = startNewRound(fightSession, gameState);

            expect(newRoundInfo).not.toBeNull();
            expect(newRoundInfo!.cardsForChoice.length).toBe(3);
            expect(fightSession!.currentRoundChoices).toBeDefined();
            expect(fightSession!.currentRoundChoices!.length).toBe(3);
            expect(fightSession!.currentRoundChoices).toEqual(newRoundInfo!.cardsForChoice);
            expect(gameState.deck.length).toBe(updatedInitialDeckSize - 3);
        });

        it('should reshuffle discard pile into deck if deck is empty before drawing', () => {
            gameState.deck = [];
            gameState.discardPile = CardConfig.getPredefinedCards();
            const discardPileSize = gameState.discardPile.length;
            expect(discardPileSize).toBeGreaterThanOrEqual(3);

            const newRoundInfo = startNewRound(fightSession, gameState);

            expect(newRoundInfo).not.toBeNull();
            expect(newRoundInfo!.cardsForChoice.length).toBe(3);
            expect(gameState.deck.length).toBe(discardPileSize - 3);
            expect(gameState.discardPile.length).toBe(0);
        });

        it('should return NewRoundInfo with correct data', () => {
            const newRoundInfo = startNewRound(fightSession, gameState);
            expect(newRoundInfo).not.toBeNull();
            expect(newRoundInfo!.roundNumber).toBe(fightSession!.currentRound);
            expect(newRoundInfo!.playerHealth).toBe(fightSession!.playerState.currentHealth);
            expect(newRoundInfo!.opponentHealth).toBe(fightSession!.opponentState.currentHealth);
            expect(newRoundInfo!.cardsForChoice.length).toBe(3);
        });
    });

    describe('playerSelectsCard', () => {
        let currentSession: FightSessionData | null; // Use local session for these tests
        let testGameState: GameState; // Use local GameState
        const cardChoices: Card[] = [
            { id: 'choice1', name: 'Choice Card 1', description: 'Desc1', type: 'A' },
            { id: 'choice2', name: 'Choice Card 2', description: 'Desc2', type: 'B' },
            { id: 'choice3', name: 'Choice Card 3', description: 'Desc3', type: 'C' },
        ];

        beforeEach(() => {
            testGameState = GameState.createInitial("CardSelector", 3000);
            const pStone = createStone(301);
            const oStone = createStone(302);

            if(!testGameState.getStoneById(pStone.seed)) testGameState.addStoneToInventory(pStone);
            testGameState.equipStone(pStone.seed);

            currentSession = startFight(pStone, oStone, testGameState);
            if (currentSession) {
                currentSession.currentRoundChoices = [...cardChoices]; // Deep copy for safety
            }
        });

        it('should return success false if fight session is null', () => {
            const result = playerSelectsCard(null, testGameState, 'choice1');
            expect(result.success).toBe(false);
            expect(result.message).toContain('No active fight session');
        });

        it('should return success false if fight is over', () => {
            if (currentSession) currentSession.isFightOver = true;
            const result = playerSelectsCard(currentSession, testGameState, 'choice1');
            expect(result.success).toBe(false);
            expect(result.message).toContain('fight is over');
        });

        it('should return success false if no cards are available for choice', () => {
            if (currentSession) currentSession.currentRoundChoices = [];
            const result = playerSelectsCard(currentSession, testGameState, 'choice1');
            expect(result.success).toBe(false);
            expect(result.message).toContain('No cards available for choice');
        });

        it('should return success false if chosen card ID is not in choices', () => {
            const result = playerSelectsCard(currentSession, testGameState, 'invalidCardId');
            expect(result.success).toBe(false);
            expect(result.message).toContain("Chosen card ID 'invalidCardId' not found");
        });

        it('should add chosen card to hand and others to discard pile', () => {
            const chosenId = 'choice2';
            const initialHandSize = testGameState.hand.length;
            const initialDiscardSize = testGameState.discardPile.length;

            const result = playerSelectsCard(currentSession, testGameState, chosenId);

            expect(result.success).toBe(true);
            expect(result.chosenCard).toBeDefined();
            expect(result.chosenCard!.id).toBe(chosenId);
            expect(result.message).toContain(`Player selected card: ${result.chosenCard!.name}`);

            expect(testGameState.hand.length).toBe(initialHandSize + 1);
            expect(testGameState.hand.find(c => c.id === chosenId)).toBeDefined();

            expect(testGameState.discardPile.length).toBe(initialDiscardSize + 2);
            expect(testGameState.discardPile.find(c => c.id === 'choice1')).toBeDefined();
            expect(testGameState.discardPile.find(c => c.id === 'choice3')).toBeDefined();

            expect(currentSession!.currentRoundChoices!.length).toBe(0);
        });

        it('should handle selecting the first card from choices', () => {
            const chosenId = cardChoices[0].id; // 'choice1'
            playerSelectsCard(currentSession, testGameState, chosenId);
            expect(testGameState.hand.find(c => c.id === chosenId)).toBeDefined();
            expect(testGameState.discardPile.find(c => c.id === cardChoices[1].id)).toBeDefined(); // choice2
            expect(testGameState.discardPile.find(c => c.id === cardChoices[2].id)).toBeDefined(); // choice3
        });

        it('should handle selecting the last card from choices', () => {
            const chosenId = cardChoices[2].id; // 'choice3'
            playerSelectsCard(currentSession, testGameState, chosenId);
            expect(testGameState.hand.find(c => c.id === chosenId)).toBeDefined();
            expect(testGameState.discardPile.find(c => c.id === cardChoices[0].id)).toBeDefined(); // choice1
            expect(testGameState.discardPile.find(c => c.id === cardChoices[1].id)).toBeDefined(); // choice2
        });
    });
});
