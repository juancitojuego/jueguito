// tests/fight_service.test.ts
import {
    createInitialCombatParticipantState,
    startFight,
    getCurrentFightSession,
    clearCurrentFightSession,
    applyActiveEffectsToParticipant,
    startNewRound,
    playerSelectsCard,
    playerPlaysCard,
    resolveCurrentRound,
    endFight
} from '../src/fight_service';
import { GameState } from '../src/game_state';
import { StoneQualities, createStone, calculateStonePower, mulberry32, generateNewStoneSeed } from '../src/stone_mechanics';
import { CombatParticipantState, FightSessionData, ActiveEffect, Card, NewRoundInfo, TargetType, CardPlayOutcome, RoundResolutionOutcome, FightOutcome, CardType, Effect } from '../src/combat_interfaces';
import { PREDEFINED_CARDS, getPredefinedCards } from '../src/config/cards';
import { GameStateManager } from '../src/game_state_manager';

// Mock the GameStateManager.saveGame function
jest.mock('../src/game_state_manager', () => {
    const originalModule = jest.requireActual('../src/game_state_manager');
    return {
        ...originalModule,
        GameStateManager: {
            ...originalModule.GameStateManager,
            saveGame: jest.fn(),
        }
    };
});

// Helper to create a card with a specific effect for testing
const createTestCardWithEffect = (id: string, name: string, cardType: CardType, effectLogic: (target: CombatParticipantState, existingEffects: ReadonlyArray<ActiveEffect>) => ActiveEffect[]): Card => ({
    id,
    name,
    type: cardType,
    description: `Test card ${name}`,
    effect: {
        id: `eff_${id}`,
        description: `Effect of ${name}`,
        apply: effectLogic,
    },
});


describe('FightService', () => {
    let playerStone: StoneQualities;
    let opponentStone: StoneQualities;
    let gameState: GameState;
    let fightSession: FightSessionData | null;

    beforeEach(() => {
        playerStone = createStone(101); // Player specific stone
        opponentStone = createStone(102); // Opponent specific stone
        gameState = GameState.createInitial("CombatTester", 2000);
        GameStateManager.generateDeck(gameState);

        // Clear default stone and add our specific playerStone
        gameState.stones = [];
        GameStateManager.addStoneToInventory(gameState, playerStone);
        GameStateManager.equipStone(gameState, playerStone.seed);

        clearCurrentFightSession();
        fightSession = startFight(playerStone, opponentStone, gameState); // Start a new fight for each relevant describe block or test
        (GameStateManager.saveGame as jest.Mock).mockClear();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('createInitialCombatParticipantState', () => {
        it('should correctly initialize participant state', () => {
            const health = 150;
            const state = createInitialCombatParticipantState(playerStone, health);
            expect(state.baseStone.seed).toBe(playerStone.seed);
            expect(state.maxHealth).toBe(health);
            expect(state.currentHealth).toBe(health);
        });
    });

    describe('startFight', () => {
        it('should create a valid FightSessionData object', () => {
            clearCurrentFightSession(); // ensure no session from outer beforeEach
            const session = startFight(playerStone, opponentStone, gameState);
            expect(session).not.toBeNull();
            if (!session) return;
            expect(session.playerParticipantId).toBe(playerStone.seed);
            expect(session.opponentParticipantId).toBe(opponentStone.seed);
            expect(session.currentRound).toBe(0);
        });
        it('should clear playerActiveCombatEffects in GameState', () => {
            GameStateManager.updatePlayerActiveCombatEffects(gameState, [{ id: 'eff1', name: 'Old', description: '', remainingDuration: 1 }]);
            startFight(playerStone, opponentStone, gameState);
            expect(gameState.playerActiveCombatEffects.length).toBe(0);
        });
    });

    describe('applyActiveEffectsToParticipant', () => {
        let participantState: CombatParticipantState;
        beforeEach(() => {
            participantState = createInitialCombatParticipantState(playerStone, 100);
        });
        it('should apply power/defense boosts and healing, clamping health', () => {
            const effects: ActiveEffect[] = [
                { id: 'p1', name: 'P+', description: '', remainingDuration: 1, powerBoost: 10 },
                { id: 'd1', name: 'D+', description: '', remainingDuration: 1, defenseBoost: 5 },
                { id: 'h1', name: 'Heal', description: '', remainingDuration: 1, healAmount: 20 },
            ];
            participantState.currentHealth = 70;
            const newState = applyActiveEffectsToParticipant(participantState, effects);
            expect(newState.currentPower).toBe(participantState.basePower + 10);
            expect(newState.currentDefense).toBe(participantState.baseDefense + 5);
            expect(newState.currentHealth).toBe(90); // 70 + 20

            participantState.currentHealth = 95; // Test clamping
            const newState2 = applyActiveEffectsToParticipant(participantState, effects);
            expect(newState2.currentHealth).toBe(100); // 95 + 20 clamped to 100 (maxHealth)
        });
    });

    describe('startNewRound', () => {
        beforeEach(() => {
            if (!getCurrentFightSession()) { // Ensure session is active
                 fightSession = startFight(playerStone, opponentStone, gameState);
            }
            if (gameState.deck.length < 3) GameStateManager.generateDeck(gameState);
        });
        it('should draw 3 cards and store them in currentRoundChoices', () => {
            const initialDeckSize = gameState.deck.length;
            const newRoundInfo = startNewRound(fightSession!, gameState); // Non-null assertion
            expect(newRoundInfo!.cardsForChoice.length).toBe(3);
            expect(fightSession!.currentRoundChoices!.length).toBe(3);
            expect(gameState.deck.length).toBe(initialDeckSize - 3);
        });
    });

    describe('playerSelectsCard', () => {
        const cardChoicesSample: Card[] = [ PREDEFINED_CARDS[0], PREDEFINED_CARDS[1], PREDEFINED_CARDS[2] ];
        beforeEach(() => {
            if (fightSession) fightSession.currentRoundChoices = [...cardChoicesSample];
        });
        it('should add chosen card to hand and others to discard pile', () => {
            const chosenId = cardChoicesSample[1].id;
            const result = playerSelectsCard(fightSession!, gameState, chosenId); // Non-null assertion
            expect(result.success).toBe(true);
            expect(gameState.hand.find(c => c.id === chosenId)).toBeDefined();
            expect(gameState.discardPile.find(c => c.id === cardChoicesSample[0].id)).toBeDefined();
        });
    });

    describe('playerPlaysCard', () => {
        let cardPowerBoost: Card;
        let cardHealPlayer: Card;

        beforeEach(() => {
            // Use actual predefined cards with their effects for more realistic testing
            cardPowerBoost = { ...PREDEFINED_CARDS.find(c => c.id === 'card_001')! }; // Minor Power Boost
            cardHealPlayer = { ...PREDEFINED_CARDS.find(c => c.id === 'card_003')! }; // Small Heal

            GameStateManager.addCardsToHand(gameState, [cardPowerBoost, cardHealPlayer]);
            if (fightSession) fightSession.playerState.currentHealth = 50;
        });

        it('should apply BUFF_ATTACK card to player and update stats', () => {
            const initialPlayerPower = fightSession!.playerState.basePower;
            const result = playerPlaysCard(fightSession!, gameState, cardPowerBoost.id, TargetType.PLAYER);
            expect(result.success).toBe(true);
            expect(gameState.playerActiveCombatEffects.length).toBe(1);
            const effect = gameState.playerActiveCombatEffects[0];
            expect(effect.name).toBe('Minor Power Boost');
            expect(effect.powerBoost).toBe(5);
            expect(effect.remainingDuration).toBe(3); // Duration is set to 3 in card_config for "2 rounds"
            expect(result.updatedPlayerState?.currentPower).toBe(initialPlayerPower + 5);
        });

        it('should apply HEAL card to player and update health', () => {
            fightSession!.playerState.currentHealth = 50; // Ensure health is not full
            const expectedHealth = Math.min(fightSession!.playerState.maxHealth, 50 + 10);

            const result = playerPlaysCard(fightSession!, gameState, cardHealPlayer.id, TargetType.PLAYER);
            expect(result.success).toBe(true);
            expect(result.updatedPlayerState?.currentHealth).toBe(expectedHealth);
            // Heal effect (duration 1) is added, then applyActiveEffectsToParticipant handles healing
            const healEffect = gameState.playerActiveCombatEffects.find(e => e.name === 'Small Heal');
            expect(healEffect).toBeDefined();
            expect(healEffect?.healAmount).toBe(10);
        });
    });

    describe('resolveCurrentRound', () => {
        beforeEach(() => {
            if (!fightSession) fightSession = startFight(playerStone, opponentStone, gameState);
            fightSession!.playerState = createInitialCombatParticipantState(playerStone, 100);
            fightSession!.opponentState = createInitialCombatParticipantState(opponentStone, 100);
            fightSession!.playerState.currentPower = 20; fightSession!.playerState.currentDefense = 5;
            fightSession!.opponentState.currentPower = 15; fightSession!.opponentState.currentDefense = 3;
            GameStateManager.updatePlayerActiveCombatEffects(gameState, []);
            fightSession!.opponentState.activeEffects = [];
            fightSession!.currentRound = 1;
            fightSession!.isFightOver = false;
        });

        it('should calculate damage, update healths, and manage effects', () => {
            GameStateManager.updatePlayerActiveCombatEffects(gameState, [
                { id: 'p_buff', name: 'PBuff', description: '', remainingDuration: 2, powerBoost: 5 }
            ]);
            fightSession!.opponentState.activeEffects = [
                { id: 'o_short_buff', name: 'OShortBuff', description: '', remainingDuration: 1, defenseBoost: 10 }
            ];

            // Player: 20P (base) + 5P (buff) = 25P. 5D (base)
            // Opponent: 15P (base). 3D (base) + 10D (buff) = 13D
            // Player deals: 25 - 13 = 12 damage
            // Opponent deals: 15 - 5 = 10 damage
            const outcome = resolveCurrentRound(fightSession!, gameState);
            expect(outcome!.playerDamageDealt).toBe(12);
            expect(outcome!.opponentDamageDealt).toBe(10);
            expect(fightSession!.playerState.currentHealth).toBe(100 - 10); // 90
            expect(fightSession!.opponentState.currentHealth).toBe(100 - 12); // 88

            expect(gameState.playerActiveCombatEffects.length).toBe(1); // PBuff duration from 2 to 1
            expect(gameState.playerActiveCombatEffects[0].remainingDuration).toBe(1);
            expect(fightSession!.opponentState.activeEffects.length).toBe(0); // OShortBuff expires

            // Check stats are re-calculated based on remaining effects
            expect(fightSession!.playerState.currentPower).toBe(fightSession!.playerState.basePower + 5);
            expect(fightSession!.opponentState.currentDefense).toBe(fightSession!.opponentState.baseDefense);
        });
    });

    describe('endFight', () => {
        let mockMathRandom: jest.SpyInstance;

        beforeEach(() => {
            if (fightSession) fightSession.isFightOver = true;
            mockMathRandom = jest.spyOn(Math, 'random');
        });

        afterEach(() => {
            mockMathRandom.mockRestore();
        });

        it('player wins: awards currency, 10% chance new stone (simulated success)', () => {
            mockMathRandom.mockReturnValue(0.05); // < 0.10 for stone gain
            const initialCurrency = gameState.currency;
            const initialStoneCount = gameState.stones.length;
            const outcome = endFight(fightSession!, gameState, TargetType.PLAYER);
            expect(outcome!.currencyChange).toBe(10);
            expect(gameState.currency).toBe(initialCurrency + 10);
            expect(outcome!.newStoneGainedByPlayer).toBeDefined();
            expect(gameState.stones.length).toBe(initialStoneCount + 1);
            expect(getCurrentFightSession()).toBeNull();
        });

        it('opponent wins: 15% chance player loses stone (simulated success)', () => {
            mockMathRandom.mockReturnValue(0.10); // < 0.15 for stone loss
            const equippedStoneId = gameState.equippedStoneId;
            const initialStoneCount = gameState.stones.length;
            const outcome = endFight(fightSession!, gameState, TargetType.OPPONENT);
            expect(outcome!.stoneLostByPlayer).toBe(true);
            expect(gameState.getStoneById(equippedStoneId!)).toBeUndefined();
            expect(gameState.stones.length).toBe(initialStoneCount - 1);
        });
    });
});
