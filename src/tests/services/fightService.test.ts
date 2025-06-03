// src/tests/services/fightService.test.ts
import { FightService } from '../../services/fightService';
import type { IGameStateManager } from '../../interfaces/gameStateManager';
import type { IRandomService } from '../../interfaces/randomService';
import type { StoneQualities } from '../../interfaces/stone';
import { createInitialCombatParticipantState } from '../../interfaces/combat';
import type { Card, Effect } from '../../interfaces/card';
import { CardType } from '../../interfaces/card';
import type { ActiveEffect } from '../../interfaces/activeEffect';
import { PREDEFINED_CARDS as ACTUAL_PREDEFINED_CARDS } from '../../config/cards'; // For realistic card effects

// Mocks
const mockGameStateManager: jest.Mocked<IGameStateManager> = {
  getCurrentState: jest.fn(),
  subscribe: jest.fn(),
  loadGame: jest.fn(),
  saveGame: jest.fn(),
  resetGameDefaults: jest.fn(),
  setPlayerName: jest.fn(),
  updateCurrency: jest.fn(),
  addStoneToInventory: jest.fn(),
  removeStoneFromInventory: jest.fn(),
  equipStone: jest.fn(),
  generateNewOpponentQueue: jest.fn(),
  getCurrentOpponent: jest.fn(),
  advanceOpponent: jest.fn(),
  getEquippedStoneDetails: jest.fn(),
  getStoneById: jest.fn(),
  generateDeck: jest.fn(),
  drawCardsFromDeck: jest.fn(),
  addCardsToHand: jest.fn(),
  removeCardFromHand: jest.fn(),
  addCardsToDiscardPile: jest.fn(),
  addPlayerActiveCombatEffect: jest.fn(),
  removePlayerActiveCombatEffect: jest.fn(),
  updatePlayerActiveCombatEffects: jest.fn(),
};

const mockRandomService: jest.Mocked<IRandomService> = {
  initialize: jest.fn(),
  getRandom: jest.fn(() => 0.5),
  generateSeed: jest.fn(() => Date.now()), // Unique seed for sessions
  shuffleArray: jest.fn(arr => arr),
};

// Test data
const testPlayerStone: StoneQualities = { seed: 1, color: 'Red', shape: 'Cube', rarity: 50, hardness: 0.5, weight: 10, magic: 20, createdAt: 1, name: 'PlayerStone' };
const testOpponentStone: StoneQualities = { seed: 2, color: 'Blue', shape: 'Sphere', rarity: 60, hardness: 0.6, weight: 12, magic: 25, createdAt: 2, name: 'OpponentStone' };

// Use a subset of actual predefined cards for testing specific effects
const powerBoostCard = ACTUAL_PREDEFINED_CARDS.find(c => c.id === 'C_POWER_BOOST_1')!;
const defenseBoostCard = ACTUAL_PREDEFINED_CARDS.find(c => c.id === 'C_DEFENSE_BOOST_1')!;
const healingCard = ACTUAL_PREDEFINED_CARDS.find(c => c.id === 'C_INSTANT_HEAL_1')!;

describe('FightService', () => {
  let fightService: FightService;
  let currentGameStateEffects: ActiveEffect[];

  beforeEach(() => {
    jest.clearAllMocks();
    currentGameStateEffects = [];
    mockGameStateManager.getStoneById.mockImplementation(id => (id === testPlayerStone.seed ? testPlayerStone : null));
    mockGameStateManager.getCurrentState.mockReturnValue({
      // Provide a bare minimum GameState that FightService might interact with
      playerActiveCombatEffects: currentGameStateEffects,
      // ... other properties can be default/empty for many tests
    } as any);
    mockGameStateManager.updatePlayerActiveCombatEffects.mockImplementation((effects) => {
      currentGameStateEffects = effects; // Simulate update
    });

    fightService = new FightService(mockGameStateManager, mockRandomService);
  });

<<<<<<< HEAD
  describe('executeFight', () => {
    // playerStoneBase and opponentStoneBase are now accessible here

    test('Player wins: player power > opponent power (no new stone, no loss)', () => {
      // Mock getRandom for variance:
      // 1st call for player variance, 2nd for opponent variance
      // Let variance be 0 for both (getRandom returns 0.5, so 0.5 * 0.3 - 0.15 = 0)
      mockRandomService.getRandom.mockReturnValue(0.5); 
      // 3rd call for new stone chance (if player wins) > 0.2 (no new stone)
      // This will only be called if player wins.
      // To be safe, if we only expect 2 calls, we can do mockReturnValueOnce twice.
      // Or, if we want to ensure it's called for the new stone check:
      mockRandomService.getRandom.mockReturnValueOnce(0.5); // Player variance
      mockRandomService.getRandom.mockReturnValueOnce(0.5); // Opponent variance
      mockRandomService.getRandom.mockReturnValueOnce(0.3); // New stone chance (>0.2)

      const outcome = fightService.executeFight(playerStoneBase, opponentStoneBase);

      expect(outcome.winner).toBe('player');
      expect(outcome.currencyChange).toBe(10);
      expect(outcome.stoneLostByPlayer).toBe(false);
      expect(outcome.newStoneGainedByPlayer).toBeUndefined();
      expect(outcome.logMessage).toContain('Player wins!');
      expect(outcome.logMessage).not.toContain('Player found a new stone');
      expect(mockRandomService.getRandom).toHaveBeenCalledTimes(3);
    });

    test('Player wins with new stone: 20% chance hits', () => {
      mockRandomService.getRandom.mockReturnValueOnce(0.5); // Player variance (0%)
      mockRandomService.getRandom.mockReturnValueOnce(0.5); // Opponent variance (0%)
      mockRandomService.getRandom.mockReturnValueOnce(0.1); // New stone chance (<0.2, triggers gain)
      
      // Mock for generateNewStoneSeed (which uses getRandom internally via callback)
      // and createStone for the new stone.
      const newGeneratedSeed = 12345;
      // generateNewStoneSeed will be called with () => this.randomService.getRandom()
      // So, the *next* call to getRandom will be for generating this seed.
      mockRandomService.getRandom.mockReturnValueOnce(0.5); // For generateNewStoneSeed's internal PRNG call
      
      // We don't need to mock generateNewStoneSeed or createStone themselves,
      // as FightService uses the actual imported ones. We just control the PRNG.

      const outcome = fightService.executeFight(playerStoneBase, opponentStoneBase);

      expect(outcome.winner).toBe('player');
      expect(outcome.currencyChange).toBe(10);
      expect(outcome.stoneLostByPlayer).toBe(false);
      expect(outcome.newStoneGainedByPlayer).toBeDefined();
      expect(outcome.newStoneGainedByPlayer?.seed).toBe(Math.floor(0.5 * 0xffffffff)); // Based on mocked getRandom for seed gen
      expect(outcome.logMessage).toContain('Player wins!');
      expect(outcome.logMessage).toContain('Player found a new stone');
      // Times called: PlayerVar, OpponentVar, NewStoneChance, generateNewStoneSeed's internal call
      expect(mockRandomService.getRandom).toHaveBeenCalledTimes(4); 
    });

    test('Opponent wins: opponent power > player power (no stone loss)', () => {
      // Mock getRandom for variance: make player power lower
      mockRandomService.getRandom.mockReturnValueOnce(0);   // Player variance (-15%) -> 55 * 0.85 = 46.75
      mockRandomService.getRandom.mockReturnValueOnce(0.5); // Opponent variance (0%) -> 44 * 1.0 = 44 -> Player still wins.
                                                            // Let's swap base stones for this test for clarity or make variance more extreme.
                                                            // Or, simpler: Player gets -15%, Opponent gets +15%
      mockRandomService.getRandom.mockReset(); // Reset for clear calls
      mockRandomService.getRandom.mockReturnValueOnce(0);   // Player variance (-15%) -> 55 * 0.85 = 46.75
      mockRandomService.getRandom.mockReturnValueOnce(1.0); // Opponent variance (+15%) -> 44 * 1.15 = 50.6
      // 3rd call for player stone loss chance > 0.3 (no loss)
      mockRandomService.getRandom.mockReturnValueOnce(0.4); 

      const outcome = fightService.executeFight(playerStoneBase, opponentStoneBase);

      expect(outcome.winner).toBe('opponent');
      expect(outcome.currencyChange).toBe(0);
      expect(outcome.stoneLostByPlayer).toBe(false);
      expect(outcome.newStoneGainedByPlayer).toBeUndefined();
      expect(outcome.logMessage).toContain('Opponent wins.');
      expect(outcome.logMessage).not.toContain("Player's stone was destroyed");
      expect(mockRandomService.getRandom).toHaveBeenCalledTimes(3);
    });

    test('Opponent wins with player stone loss: 30% chance hits', () => {
      mockRandomService.getRandom.mockReset();
      mockRandomService.getRandom.mockReturnValueOnce(0);   // Player variance (-15%)
      mockRandomService.getRandom.mockReturnValueOnce(1.0); // Opponent variance (+15%) -> Opponent wins
      mockRandomService.getRandom.mockReturnValueOnce(0.1); // Stone loss chance (<0.3, triggers loss)

      const outcome = fightService.executeFight(playerStoneBase, opponentStoneBase);

      expect(outcome.winner).toBe('opponent');
      expect(outcome.currencyChange).toBe(0);
      expect(outcome.stoneLostByPlayer).toBe(true);
      expect(outcome.newStoneGainedByPlayer).toBeUndefined();
      expect(outcome.logMessage).toContain('Opponent wins.');
      expect(outcome.logMessage).toContain(`Player's stone (Seed: ${playerStoneBase.seed}) was destroyed!`);
      expect(mockRandomService.getRandom).toHaveBeenCalledTimes(3);
    });

    test('Tie: player power === opponent power', () => {
      // Make base powers equal for simplicity, then ensure variance is same or zero
      const pStoneTie = createTestStone(10, { rarity: 50, hardness: 0.5, magic: 50, weight: 50 }); // Power 55
      const oStoneTie = createTestStone(11, { rarity: 50, hardness: 0.5, magic: 50, weight: 50 }); // Power 55
      
      mockRandomService.getRandom.mockReturnValue(0.5); // 0% variance for both

      const outcome = fightService.executeFight(pStoneTie, oStoneTie);

      expect(outcome.winner).toBe('tie');
      expect(outcome.currencyChange).toBe(0);
      expect(outcome.stoneLostByPlayer).toBe(false);
      expect(outcome.newStoneGainedByPlayer).toBeUndefined();
      expect(outcome.logMessage).toContain("It's a tie.");
      // Times called: PlayerVar, OpponentVar. No loss/gain checks for tie.
      expect(mockRandomService.getRandom).toHaveBeenCalledTimes(2); 
=======
  describe('startFight', () => {
    it('should initialize a fight session correctly', async () => {
      const session = await fightService.startFight(testPlayerStone.seed, testOpponentStone);
      expect(session).toBeDefined();
      expect(session.player.stoneId).toBe(testPlayerStone.seed);
      expect(session.opponent.stoneId).toBe(testOpponentStone.seed);
      expect(session.currentRound).toBe(0);
      expect(session.isFightOver).toBe(false);
      expect(mockGameStateManager.updatePlayerActiveCombatEffects).toHaveBeenCalledWith([]); // Clears old effects
>>>>>>> 5b3a217ad9efa2e08549371d8bcd692fd0158007
    });
  });

  describe('Round Workflow', () => {
    let initialCardsForChoice: Card[];

    beforeEach(async () => {
      await fightService.startFight(testPlayerStone.seed, testOpponentStone);
      initialCardsForChoice = [
        { ...powerBoostCard, id: 'choice1' },
        { ...defenseBoostCard, id: 'choice2' },
        { ...healingCard, id: 'choice3' }
      ];
      mockGameStateManager.drawCardsFromDeck.mockReturnValue([...initialCardsForChoice]); // Provide copies
    });

    it('startNewRound should provide cards for choice and update round number', async () => {
      const newRoundInfo = await fightService.startNewRound();
      expect(newRoundInfo.roundNumber).toBe(1);
      expect(newRoundInfo.cardsForChoice.length).toBe(3);
      expect(mockGameStateManager.drawCardsFromDeck).toHaveBeenCalledWith(3);
      const session = await fightService.getCurrentFightSession();
      expect(session?.currentRound).toBe(1);
    });

    it('playerSelectsCard should update hand and discard pile via GameStateManager', async () => {
      await fightService.startNewRound();
      const chosen = initialCardsForChoice[0];
      const discarded = [initialCardsForChoice[1], initialCardsForChoice[2]];
      
      await fightService.playerSelectsCard(chosen.id, discarded.map(c => c.id));

      expect(mockGameStateManager.addCardsToHand).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({id: chosen.id})]));
      expect(mockGameStateManager.addCardsToDiscardPile).toHaveBeenCalledWith(expect.arrayContaining(discarded.map(c => expect.objectContaining({id: c.id}))));
    });

    it('playerPlaysCard should apply effect and update states', async () => {
      // Setup: Start round, select powerBoostCard into hand
      await fightService.startNewRound();
      mockGameStateManager.removeCardFromHand.mockReturnValue(powerBoostCard); // Simulate card being in hand
      mockGameStateManager.getCurrentState.mockReturnValue({ playerActiveCombatEffects: [] } as any);

      const outcome = await fightService.playerPlaysCard(powerBoostCard.id, 'player');
      expect(outcome.success).toBe(true);
      expect(mockGameStateManager.removeCardFromHand).toHaveBeenCalledWith(powerBoostCard.id);
      expect(mockGameStateManager.addCardsToDiscardPile).toHaveBeenCalledWith([powerBoostCard]);
      // Check that updatePlayerActiveCombatEffects was called with the new effect
      expect(mockGameStateManager.updatePlayerActiveCombatEffects).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ name: 'Minor Power Boost', powerBoost: 5 })])
      );
      const session = await fightService.getCurrentFightSession();
      // Player's currentPower should be basePower + boost
      const basePlayerPower = createInitialCombatParticipantState(testPlayerStone).basePower;
      expect(session?.player.combatState.currentPower).toBe(basePlayerPower + 5);
    });

    it('resolveCurrentRound should calculate damage and update health', async () => {
      await fightService.startFight(testPlayerStone.seed, testOpponentStone);
      await fightService.startNewRound();
      // Simulate player playing a power boost card
      mockGameStateManager.removeCardFromHand.mockReturnValue(powerBoostCard);
      currentGameStateEffects = []; // Reset for this test case
      mockGameStateManager.getCurrentState.mockReturnValue({ playerActiveCombatEffects: currentGameStateEffects } as any);
      await fightService.playerPlaysCard(powerBoostCard.id, 'player');

      const playerInitialHealth = (await fightService.getCurrentFightSession())!.player.combatState.maxHealth;
      const opponentInitialHealth = (await fightService.getCurrentFightSession())!.opponent.combatState.maxHealth;

      const resolution = await fightService.resolveCurrentRound();

      expect(resolution.playerDamageDealt).toBeGreaterThanOrEqual(0);
      expect(resolution.opponentDamageDealt).toBeGreaterThanOrEqual(0);

      const session = await fightService.getCurrentFightSession();
      expect(session!.player.combatState.currentHealth).toBeLessThanOrEqual(playerInitialHealth);
      expect(session!.opponent.combatState.currentHealth).toBeLessThanOrEqual(opponentInitialHealth);
      // Check effect duration update
      const playerEffectsAfterRound = mockGameStateManager.getCurrentState().playerActiveCombatEffects;
      const powerBoostEffect = playerEffectsAfterRound.find(e => e.name === 'Minor Power Boost');
      expect(powerBoostEffect?.remainingDuration).toBe(1); // Was 2, now 1
    });

    it('resolveCurrentRound should end fight if health reaches zero', async () => {
        await fightService.startFight(testPlayerStone.seed, testOpponentStone);
        const session = await fightService.getCurrentFightSession();
        // Manually set opponent health low for testing ko
        if(session) session.opponent.combatState.currentHealth = 1;

        await fightService.startNewRound();
        // Assume player has a strong card or high base power
        // For simplicity, we don't play a card, just rely on base power difference
        // or ensure applyActiveEffectsToParticipant gives player enough power

        const resolution = await fightService.resolveCurrentRound();
        expect(resolution.roundWinner).toBe('player'); // Assuming player KO's opponent
        const finalSession = await fightService.getCurrentFightSession();
        expect(finalSession!.isFightOver).toBe(true);
        expect(finalSession!.winner).toBe('player');
    });
  });

  describe('endFight', () => {
    it('should return FightOutcome and clear session, applying rewards/penalties', async () => {
      await fightService.startFight(testPlayerStone.seed, testOpponentStone);
      const session = await fightService.getCurrentFightSession();
      // Simulate fight ending
      if(session) {
        session.isFightOver = true;
        session.winner = 'player';
      }
      mockRandomService.getRandom.mockReturnValue(0.05); // Ensure new stone gain

      const outcome = await fightService.endFight();
      expect(outcome).toBeDefined();
      expect(outcome!.winner).toBe('player');
      expect(outcome!.currencyChange).toBe(10);
      expect(outcome!.newStoneGainedByPlayer).toBeDefined();
      expect(mockGameStateManager.updateCurrency).toHaveBeenCalledWith(10);
      expect(mockGameStateManager.addStoneToInventory).toHaveBeenCalled();
      expect(await fightService.getCurrentFightSession()).toBeNull(); // Session cleared
    });
  });
});
