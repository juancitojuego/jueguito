// src/config/cards.ts
import type { Card, Effect } from '../interfaces/card'; // Keep Card, Effect from card.ts
import { CardType } from '../interfaces/card';
import type { ActiveEffect } from '../interfaces/activeEffect'; // Import ActiveEffect from activeEffect.ts

// Forward declaration for CombatParticipantState
interface CombatParticipantState {
  // Define a minimal structure for now, this will be expanded in Step 2
  basePower?: number; // Example property
  currentPower?: number; // Example property
  temporaryEffects?: ActiveEffect[]; // Example property
  // Add other relevant properties of a combatant here
}

// --- Effect Definitions ---

const E_POWER_BOOST_SMALL: Effect = {
  id: 'E_POWER_BOOST_SMALL',
  description: '+5 Power for 2 rounds.',
  apply: (target: CombatParticipantState, existingEffects: ActiveEffect[]): ActiveEffect[] => {
    const newEffect: ActiveEffect = {
      id: 'AE_' + E_POWER_BOOST_SMALL.id + '_' + Date.now(), // Unique instance ID
      name: 'Minor Power Boost',
      description: E_POWER_BOOST_SMALL.description,
      remainingDuration: 2,
      powerBoost: 5,
    };
    return [...existingEffects, newEffect];
  },
};

const E_DEFENSE_BOOST_SMALL: Effect = {
  id: 'E_DEFENSE_BOOST_SMALL',
  description: '+5 Defense for 2 rounds.',
  apply: (target: CombatParticipantState, existingEffects: ActiveEffect[]): ActiveEffect[] => {
    const newEffect: ActiveEffect = {
      id: 'AE_' + E_DEFENSE_BOOST_SMALL.id + '_' + Date.now(),
      name: 'Minor Defense Boost',
      description: E_DEFENSE_BOOST_SMALL.description,
      remainingDuration: 2,
      defenseBoost: 5,
    };
    return [...existingEffects, newEffect];
  },
};

// In src/config/cards.ts
// Ensure other imports and CombatParticipantState forward declaration are present as before

/* ... (other effects like E_POWER_BOOST_SMALL remain the same) ... */

const E_INSTANT_HEAL: Effect = {
  id: 'E_INSTANT_HEAL',
  description: 'Instantly recover 10 health.',
  apply: (target: CombatParticipantState, existingEffects: ActiveEffect[]): ActiveEffect[] => {
    const newEffect: ActiveEffect = {
      id: 'AE_' + E_INSTANT_HEAL.id + '_' + Date.now(),
      name: 'Instant Healing', // Changed name for clarity
      description: E_INSTANT_HEAL.description,
      remainingDuration: 1, // Will be applied once, then cleaned up
      healAmount: 10,
    };
    // Log the intention if desired, actual healing happens in applyActiveEffectsToParticipant
    console.log(`Effect ${newEffect.name} prepared for target.`);
    return [...existingEffects, newEffect];
  },
};

// Ensure E_INSTANT_HEAL is used in PREDEFINED_CARDS array for 'Healing Dust' card.
// Example card using this effect (should already be in PREDEFINED_CARDS):
/*
  {
    id: 'C_INSTANT_HEAL_1',
    name: 'Healing Dust',
    type: CardType.SPECIAL,
    description: 'A pinch of sparkling dust. ' + E_INSTANT_HEAL.description,
    effect: E_INSTANT_HEAL,
  },
*/

// --- Card Definitions ---
export const PREDEFINED_CARDS: Card[] = [
  {
    id: 'C_POWER_BOOST_1',
    name: 'Stone Shard',
    type: CardType.BUFF_ATTACK,
    description: 'A small shard that hums with energy. '+ E_POWER_BOOST_SMALL.description,
    effect: E_POWER_BOOST_SMALL,
  },
  {
    id: 'C_DEFENSE_BOOST_1',
    name: 'Rock Skin',
    type: CardType.BUFF_DEFENSE,
    description: 'Temporarily hardens the stone. ' + E_DEFENSE_BOOST_SMALL.description,
    effect: E_DEFENSE_BOOST_SMALL,
  },
  {
    id: 'C_INSTANT_HEAL_1',
    name: 'Healing Dust',
    type: CardType.SPECIAL,
    description: 'A pinch of sparkling dust. ' + E_INSTANT_HEAL.description,
    effect: E_INSTANT_HEAL,
  },
  {
    id: 'C_POWER_BOOST_2',
    name: 'Empowered Fragment',
    type: CardType.BUFF_ATTACK,
    description: '+8 Power for 1 round.',
    effect: {
      id: 'E_POWER_BOOST_MEDIUM',
      description: '+8 Power for 1 round.',
      apply: (target: CombatParticipantState, existingEffects: ActiveEffect[]): ActiveEffect[] => {
        const newEffect: ActiveEffect = {
          id: 'AE_E_POWER_BOOST_MEDIUM_' + Date.now(),
          name: 'Empowered Power Boost',
          description: '+8 Power for 1 round.',
          remainingDuration: 1,
          powerBoost: 8,
        };
        return [...existingEffects, newEffect];
      },
    },
  },
  {
    id: 'C_QUICK_STRIKE',
    name: 'Quick Strike',
    type: CardType.SPECIAL,
    description: 'Your next attack deals +10 Power (instant).',
    effect: {
        id: 'E_QUICK_STRIKE_EFFECT',
        description: 'Your next attack deals +10 Power (instant).',
        apply: (target: CombatParticipantState, existingEffects: ActiveEffect[]): ActiveEffect[] => {
            const newEffect: ActiveEffect = {
                id: 'AE_QUICK_STRIKE_' + Date.now(),
                name: 'Quick Strike Ready',
                description: 'Next attack +10 Power.',
                remainingDuration: 1,
                powerBoost: 10,
            };
            return [...existingEffects, newEffect];
        }
    }
  }
];

export function getPredefinedCards(): Card[] {
  return JSON.parse(JSON.stringify(PREDEFINED_CARDS));
}
