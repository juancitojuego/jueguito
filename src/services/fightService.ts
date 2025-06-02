// src/services/fightService.ts

import type { IFightService, FightOutcome, FightAttributes, FightParticipant } from '../interfaces/fightService';
import type { StoneQualities } from '../interfaces/stone';
import type { IRandomService } from '../interfaces/randomService';
import { calculateStonePower, createStone, generateNewStoneSeed } from '../stone'; // Assuming createStone and generateNewStoneSeed are needed and available

export class FightService implements IFightService {
  constructor(private randomService: IRandomService) {}

  // Helper method to calculate attributes including variance
  private calculateEffectiveAttributes(stone: StoneQualities): FightAttributes {
    const basePower = calculateStonePower(stone);
    // Apply variance: +/- 15%
    // The random number from getRandom() is [0, 1).
    // (this.randomService.getRandom() * 0.3) gives [0, 0.3).
    // (this.randomService.getRandom() * 0.3 - 0.15) gives [-0.15, 0.15).
    const variance = this.randomService.getRandom() * 0.3 - 0.15;
    const effectivePower = basePower * (1 + variance);
    return { power: effectivePower }; // Simplified to just 'power' as per latest interface
  }

  public calculateFightAttributes(stone: StoneQualities): FightAttributes {
    // This can be the same as calculateEffectiveAttributes or just base power
    // if the interface implies "base" attributes before fight-time variance.
    // For now, let's make it return effective power, consistent with executeFight needs.
    return this.calculateEffectiveAttributes(stone);
  }

  public executeFight(playerStone: StoneQualities, opponentStone: StoneQualities): FightOutcome {
    const playerAttributes = this.calculateEffectiveAttributes(playerStone);
    const opponentAttributes = this.calculateEffectiveAttributes(opponentStone);

    let winner: 'player' | 'opponent' | 'tie';
    let currencyChange = 0;
    let stoneLostByPlayer = false;
    let newStoneGainedByPlayer: StoneQualities | undefined = undefined;
    let logMessage = `Player (Stone ${playerStone.seed}, P: ${playerAttributes.power.toFixed(2)}) vs Opponent (Stone ${opponentStone.seed}, P: ${opponentAttributes.power.toFixed(2)}). `;

    if (playerAttributes.power > opponentAttributes.power) {
      winner = 'player';
      currencyChange = 10;
      logMessage += `Player wins! +${currencyChange} currency.`;

      if (this.randomService.getRandom() < 0.2) { // 20% chance for an extra stone
        // Pass the getRandom function directly to generateNewStoneSeed
        const newSeed = generateNewStoneSeed(() => this.randomService.getRandom());
        newStoneGainedByPlayer = createStone(newSeed);
        logMessage += ` Player found a new stone (Seed: ${newStoneGainedByPlayer.seed})!`;
      }
    } else if (opponentAttributes.power > playerAttributes.power) {
      winner = 'opponent';
      logMessage += `Opponent wins.`;
      if (this.randomService.getRandom() < 0.3) { // 30% chance to destroy player's stone
        stoneLostByPlayer = true;
        logMessage += ` Player's stone (Seed: ${playerStone.seed}) was destroyed!`;
      }
    } else {
      winner = 'tie';
      logMessage += `It's a tie.`;
    }

    return {
      player: { stone: playerStone, attributes: playerAttributes },
      opponent: { stone: opponentStone, attributes: opponentAttributes },
      winner,
      currencyChange,
      stoneLostByPlayer,
      newStoneGainedByPlayer,
      logMessage,
    };
  }
}
