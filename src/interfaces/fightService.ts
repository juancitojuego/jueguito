// src/interfaces/fightService.ts
import type { StoneQualities } from './stone';

export interface FightAttributes {
  power: number;
  // Could include other derived attributes relevant to a fight, e.g., defense, agility
}

export interface FightParticipant {
  stone: StoneQualities;
  attributes: FightAttributes; // Effective attributes after any pre-fight calculations or variance
}

export interface FightOutcome {
  player: FightParticipant;
  opponent: FightParticipant;
  winner: 'player' | 'opponent' | 'tie';
  currencyChange?: number;    // e.g., +10 for win, 0 for loss/tie
  stoneLostByPlayer?: boolean;  // True if player's stone was lost
  newStoneGainedByPlayer?: StoneQualities; // If player wins a new stone
  logMessage: string; // A descriptive message of the fight's key events and outcome
}

export interface IFightService {
  /**
   * Calculates the power and other fight-relevant attributes of a stone.
   * @param stone The stone for which to calculate attributes.
   * @returns The fight attributes.
   */
  calculateFightAttributes(stone: StoneQualities): FightAttributes;

  /**
   * Executes a fight between a player's stone and an opponent's stone.
   * This method should incorporate randomness for power variance.
   * @param playerStone The player's StoneQualities.
   * @param opponentStone The opponent's StoneQualities.
   * @param randomService An instance of IRandomService to ensure deterministic randomness if needed.
   * @returns A FightOutcome object detailing the result of the fight.
   */
  executeFight(
    playerStone: StoneQualities,
    opponentStone: StoneQualities,
    randomService: import('./randomService').IRandomService // Late import to avoid circular deps if RandomService needs types from here
  ): FightOutcome;
}
