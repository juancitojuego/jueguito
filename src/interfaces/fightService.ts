// src/interfaces/fightService.ts
import type { StoneQualities } from './stone';
import type { Card } from './card';
import type { ActiveEffect } from './activeEffect';
import type { CombatParticipantState } from './combat';

// Describes the state of a participant within a fight session
export interface FightParticipantSessionState {
  stoneId: number;
  combatState: CombatParticipantState; // Holds all dynamic combat values
}

// Overall state of the current fight
export interface FightSession {
  sessionId: string; // Unique ID for this fight
  player: FightParticipantSessionState;
  opponent: FightParticipantSessionState;
  currentRound: number;
  isFightOver: boolean;
  winner?: 'player' | 'opponent' | 'tie'; // Set when fight is over
  log: string[]; // Log of actions and events during the fight
  currentRoundChoices: Card[]; // Cards available for the current round
}

// Information provided at the start of a new round, including cards for choice
export interface NewRoundInfo {
  roundNumber: number;
  cardsForChoice: Card[]; // Typically 3 cards
  playerHealth: number;
  opponentHealth: number;
}

// Outcome of playing a card
export interface CardPlayOutcome {
  success: boolean;
  message: string;
  updatedPlayerState?: CombatParticipantState;
  updatedOpponentState?: CombatParticipantState;
  activeEffectsPlayer: ActiveEffect[];
}

// Outcome of a single combat round's resolution
export interface RoundResolutionOutcome {
  roundNumber: number;
  playerDamageDealt?: number;
  opponentDamageDealt?: number;
  playerHealth: number;
  opponentHealth: number;
  roundWinner?: 'player' | 'opponent' | 'tie' | 'ongoing';
  logEntry: string; // Summary of the round
  activeEffectsPlayer: ActiveEffect[];
}

// Final outcome of the entire fight
export interface FightOutcome {
  playerStoneId: number;
  opponentStoneId: number;
  winner: 'player' | 'opponent' | 'tie';
  log: string[];
  currencyChange?: number;
  stoneLostByPlayer?: boolean;
  newStoneGainedByPlayer?: StoneQualities;
}


export interface IFightService {
  startFight(playerStoneId: number, opponentStone: StoneQualities): Promise<FightSession>;
  getCurrentFightSession(): Promise<FightSession | null>;
  startNewRound(): Promise<NewRoundInfo>;
  playerSelectsCard(chosenCardId: string, discardedCardIds: string[]): Promise<FightSession>;
  playerPlaysCard(cardId: string, targetId: 'player' | 'opponent'): Promise<CardPlayOutcome>;
  resolveCurrentRound(): Promise<RoundResolutionOutcome>;
  endFight(): Promise<FightOutcome | null>;
}
