// src/config/cards.ts
import { Card, CardType, Effect, ActiveEffect, CombatParticipantState } from '../combat_interfaces';

// Helper to create unique effect instance IDs
const generateEffectInstanceId = (effectTypeId: string): string => `${effectTypeId}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

export const PREDEFINED_CARDS: Card[] = [
    {
        id: 'card_001',
        name: 'Minor Power Boost',
        type: CardType.BUFF_ATTACK,
        description: 'Increases current Power by 5 for 2 rounds.',
        effect: {
            id: 'effect_power_boost_minor', // Type ID for this kind of effect
            description: 'Grants +5 Power for 2 rounds.',
            apply: (target: CombatParticipantState, existingEffects: ReadonlyArray<ActiveEffect>): ActiveEffect[] => {
                const newEffect: ActiveEffect = {
                    id: generateEffectInstanceId('power_boost_minor'), // Unique instance ID
                    name: 'Minor Power Boost',
                    description: '+5 Power', // Effect's own description
                    remainingDuration: 3, // Lasts for this round and 2 more
                    powerBoost: 5,
                    sourceCardId: 'card_001',
                };
                return [...existingEffects, newEffect];
            }
        }
    },
    {
        id: 'card_002',
        name: 'Minor Defense Boost',
        type: CardType.BUFF_DEFENSE,
        description: 'Increases current Defense by 5 for 2 rounds.',
        effect: {
            id: 'effect_defense_boost_minor',
            description: 'Grants +5 Defense for 2 rounds.',
            apply: (target: CombatParticipantState, existingEffects: ReadonlyArray<ActiveEffect>): ActiveEffect[] => {
                const newEffect: ActiveEffect = {
                    id: generateEffectInstanceId('defense_boost_minor'),
                    name: 'Minor Defense Boost',
                    description: '+5 Defense',
                    remainingDuration: 3, // Lasts for this round and 2 more
                    defenseBoost: 5,
                    sourceCardId: 'card_002',
                };
                return [...existingEffects, newEffect];
            }
        }
    },
    {
        id: 'card_003',
        name: 'Small Heal',
        type: CardType.HEAL,
        description: 'Instantly heals 10 HP.',
        effect: {
            id: 'effect_heal_small',
            description: 'Heals 10 HP.',
            apply: (target: CombatParticipantState, existingEffects: ReadonlyArray<ActiveEffect>): ActiveEffect[] => {
                const newEffect: ActiveEffect = {
                    id: generateEffectInstanceId('heal_small'),
                    name: 'Small Heal',
                    description: '+10 HP (Instant)',
                    remainingDuration: 1, // Applied by applyActiveEffectsToParticipant, then removed next cleanup phase
                    healAmount: 10,
                    sourceCardId: 'card_003',
                };
                return [...existingEffects, newEffect];
            }
        }
    },
    {
        id: 'card_004',
        name: 'Quick Jab',
        type: CardType.ATTACK,
        description: 'A fast attack. Deals damage based on power.',
        effect: {
            id: 'effect_quick_jab',
            description: 'Standard attack, no persistent effect.',
            apply: (target: CombatParticipantState, existingEffects: ReadonlyArray<ActiveEffect>): ActiveEffect[] => {
                // No ActiveEffect applied by this card directly.
                // Damage is handled by combat resolution based on attacker's power.
                return [...existingEffects];
            }
        }
    },
    {
        id: 'card_005',
        name: 'Guard Up',
        type: CardType.BUFF_DEFENSE,
        description: 'Increases current Defense by 10 for 1 round.',
        effect: {
            id: 'effect_guard_up',
            description: 'Grants +10 Defense for 1 round.',
            apply: (target: CombatParticipantState, existingEffects: ReadonlyArray<ActiveEffect>): ActiveEffect[] => {
                const newEffect: ActiveEffect = {
                    id: generateEffectInstanceId('guard_up'),
                    name: 'Guard Up',
                    description: '+10 Defense',
                    remainingDuration: 2, // Lasts for this round and 1 more
                    defenseBoost: 10,
                    sourceCardId: 'card_005',
                };
                return [...existingEffects, newEffect];
            }
        }
    },
    {
        id: 'card_006',
        name: 'Focused Strike',
        type: CardType.ATTACK,
        description: 'A precise attack. (No special effect beyond base damage).',
        effect: {
            id: 'effect_focused_strike',
            description: 'Standard attack, no persistent effect.',
            apply: (target: CombatParticipantState, existingEffects: ReadonlyArray<ActiveEffect>): ActiveEffect[] => [...existingEffects]
        }
    },
    {
        id: 'card_007',
        name: 'Rally Cry',
        type: CardType.BUFF_ATTACK,
        description: 'Increases Power by 8 for 1 round.',
        effect: {
            id: 'effect_rally_cry',
            description: 'Grants +8 Power for 1 round.',
            apply: (target: CombatParticipantState, existingEffects: ReadonlyArray<ActiveEffect>): ActiveEffect[] => {
                const newEffect: ActiveEffect = {
                    id: generateEffectInstanceId('rally_cry'),
                    name: 'Rally Cry',
                    description: '+8 Power',
                    remainingDuration: 2, // Lasts for this round and 1 more
                    powerBoost: 8,
                    sourceCardId: 'card_007'
                };
                return [...existingEffects, newEffect];
            }
        }
    },
    {
        id: 'card_008',
        name: 'Mend Wounds',
        type: CardType.HEAL,
        description: 'Instantly heals 20 HP.',
        effect: {
            id: 'effect_mend_wounds',
            description: 'Heals 20 HP.',
            apply: (target: CombatParticipantState, existingEffects: ReadonlyArray<ActiveEffect>): ActiveEffect[] => {
                const newEffect: ActiveEffect = {
                    id: generateEffectInstanceId('mend_wounds'),
                    name: 'Mend Wounds',
                    description: '+20 HP (Instant)',
                    remainingDuration: 1,
                    healAmount: 20,
                    sourceCardId: 'card_008'
                };
                return [...existingEffects, newEffect];
            }
        }
    },
    {
        id: 'card_009',
        name: 'Stone Shield',
        type: CardType.BUFF_DEFENSE,
        description: 'Increases Defense by 7 for 3 rounds.',
        effect: {
            id: 'effect_stone_shield',
            description: 'Grants +7 Defense for 3 rounds.',
            apply: (target: CombatParticipantState, existingEffects: ReadonlyArray<ActiveEffect>): ActiveEffect[] => {
                const newEffect: ActiveEffect = {
                    id: generateEffectInstanceId('stone_shield'),
                    name: 'Stone Shield',
                    description: '+7 Defense', // Description of the active effect itself
                    remainingDuration: 4, // Lasts for this round and 3 more
                    defenseBoost: 7,
                    sourceCardId: 'card_009'
                };
                return [...existingEffects, newEffect];
            }
        }
    },
    {
        id: 'card_010',
        name: 'Power Surge',
        type: CardType.BUFF_ATTACK,
        description: 'Increases Power by 15 for 1 round.',
        effect: {
            id: 'effect_power_surge',
            description: 'Grants +15 Power for 1 round.',
            apply: (target: CombatParticipantState, existingEffects: ReadonlyArray<ActiveEffect>): ActiveEffect[] => {
                const newEffect: ActiveEffect = {
                    id: generateEffectInstanceId('power_surge_buff'),
                    name: 'Power Surge',
                    description: '+15 Power',
                    remainingDuration: 2, // Lasts for this round and 1 more
                    powerBoost: 15,
                    sourceCardId: 'card_010'
                };
                return [...existingEffects, newEffect];
            }
        }
    }
];

export function getPredefinedCards(): Card[] {
    // Return a deep copy to ensure card effect functions are fresh if they were mutated (though they shouldn't be)
    // and to prevent modification of the original PREDEFINED_CARDS array or its objects.
    return JSON.parse(JSON.stringify(PREDEFINED_CARDS)).map((card: Card) => {
        // Find the original card definition to copy its effect.apply function,
        // as functions are not preserved by JSON.parse(JSON.stringify(...)).
        const originalCard = PREDEFINED_CARDS.find(c => c.id === card.id);
        if (originalCard) {
            return {
                ...card, // Spread the parsed card (which has all properties except the function)
                effect: { // Re-assign the effect object with the function
                    ...card.effect, // Spread the parsed effect (id, description)
                    apply: originalCard.effect.apply // Assign the original function reference
                }
            };
        }
        return card; // Should not happen if all cards are in PREDEFINED_CARDS
    });
}
