// src/tests/services/fightService.test.ts

import { FightService } from '../../services/fightService';
import type { StoneQualities, IRandomService, FightOutcome } from '../../interfaces';
import { createStone, generateNewStoneSeed } from '../../stone'; // For actual stone creation if needed for newStoneGainedByPlayer

// Mock IRandomService
const mockRandomService: jest.Mocked<IRandomService> = {
  initialize: jest.fn(),
  getRandom: jest.fn(),
  generateSeed: jest.fn(),
  shuffleArray: jest.fn(),
  // getPrng: jest.fn(), // Not added to IRandomService in the end
};

// Helper to create mock StoneQualities for tests
// This ensures we have full StoneQualities objects as inputs.
// calculateStonePower (imported by FightService from ../stone) will use these.
const createTestStone = (seed: number, powerAttributes: { 
  rarity: number, hardness: number, magic: number, weight: number 
}, name?: string): StoneQualities => ({
  seed,
  color: 'TestColor',
  shape: 'TestShape',
  rarity: powerAttributes.rarity,
  hardness: powerAttributes.hardness,
  magic: powerAttributes.magic,
  weight: powerAttributes.weight,
  createdAt: Date.now(),
  name: name || `Stone ${seed}`,
});


describe('FightService', () => {
  let fightService: FightService;
  // Define base stones at a higher scope
  const playerStoneBase = createTestStone(1, { rarity: 50, hardness: 0.5, magic: 50, weight: 50 });
  const opponentStoneBase = createTestStone(2, { rarity: 40, hardness: 0.4, magic: 40, weight: 40 });

  beforeEach(() => {
    // Reset all mock implementations and call counts before each test
    mockRandomService.getRandom.mockReset();
    mockRandomService.generateSeed.mockReset();
    
    fightService = new FightService(mockRandomService);
  });

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
    });
  });

  describe('calculateFightAttributes (tested via executeFight outcomes)', () => {
    const stone = createTestStone(100, { rarity: 10, hardness: 0.1, magic: 10, weight: 10 });
    // Base power for this stone: (10*0.4) + (0.1*30) + (10*0.3) + (10*0.1) = 4 + 3 + 3 + 1 = 11

    test('should apply minimum variance (-15%)', () => {
      // To get -15% variance, getRandom() should be close to 0.
      // variance = getRandom() * 0.3 - 0.15. If getRandom() = 0, variance = -0.15.
      mockRandomService.getRandom.mockReturnValue(0); 
      const attributes = fightService.calculateFightAttributes(stone);
      expect(attributes.power).toBeCloseTo(11 * 0.85); // 9.35
    });

    test('should apply maximum variance (+15%)', () => {
      // To get +15% variance, getRandom() should be close to 1.
      // If getRandom() = 0.999..., variance = 0.999... * 0.3 - 0.15 approx 0.3 - 0.15 = 0.15
      mockRandomService.getRandom.mockReturnValue(0.999999999); 
      const attributes = fightService.calculateFightAttributes(stone);
      expect(attributes.power).toBeCloseTo(11 * 1.15); // 12.65
    });

    test('should apply zero variance (approx 0%)', () => {
      // To get 0% variance, getRandom() should be 0.5.
      // variance = 0.5 * 0.3 - 0.15 = 0.15 - 0.15 = 0.
      mockRandomService.getRandom.mockReturnValue(0.5); 
      const attributes = fightService.calculateFightAttributes(stone);
      expect(attributes.power).toBeCloseTo(11); // 11
    });
  });

  describe('Log Message Content', () => {
    test('log message should contain player and opponent powers', () => {
      mockRandomService.getRandom.mockReturnValue(0.5); // No variance
      const outcome = fightService.executeFight(playerStoneBase, opponentStoneBase);
      
      // Base powers: Player 55, Opponent 44. With 0% variance.
      expect(outcome.logMessage).toMatch(/Player \(Stone 1, P: 55.00\)/);
      expect(outcome.logMessage).toMatch(/Opponent \(Stone 2, P: 44.00\)/);
      expect(outcome.logMessage).toContain('Player wins!');
    });
  });
});
