// src/interfaces/card.ts
import type { ActiveEffect } from './activeEffect'; // Import ActiveEffect

// Forward declaration for CombatParticipantState
interface CombatParticipantState {}

export enum CardType {
  BUFF_ATTACK = 'BUFF_ATTACK',
  BUFF_DEFENSE = 'BUFF_DEFENSE',
  SPECIAL = 'SPECIAL',
}

export interface Effect {
  id: string;
  description: string;
  apply: (target: CombatParticipantState, existingEffects: ActiveEffect[]) => ActiveEffect[];
}

export interface Card {
  id: string;
  name: string;
  type: CardType;
  description: string;
  effect: Effect;
}
