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
            id: 'effect_power_boost_minor',
            description: 'Grants +5 Power for 2 rounds.', // Card description of effect
            apply: (target: CombatParticipantState, existingEffects: ReadonlyArray<ActiveEffect>): ActiveEffect[] => {
                const newEffect: ActiveEffect = {
                    id: generateEffectInstanceId('power_boost_minor'),
                    name: 'Minor Power Boost', // Effect name (for UI, logs)
                    description: '+5 Power', // Effect description (for UI, logs)
                    remainingDuration: 2, // Active this round and next round. Cleaned up after 2nd round's resolution.
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
                    remainingDuration: 2,
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
                    name: 'Small Heal Effect', // Name of the temporary effect object
                    description: '+10 HP (Applied once)', // Description of the effect instance
                    remainingDuration: 1, // Will be applied by applyActiveEffectsToParticipant, then removed in cleanup
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
        description: 'A fast attack. Deals damage based on current power.',
        effect: {
            id: 'effect_quick_jab',
            description: 'Direct damage based on power, no lasting effect.',
            apply: (target: CombatParticipantState, existingEffects: ReadonlyArray<ActiveEffect>): ActiveEffect[] => {
                // ATTACK cards typically don't apply status effects unless specified.
                // Their "effect" is the damage dealt during combat resolution.
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
                    remainingDuration: 1, // Active for this round's resolution only.
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
            description: 'Direct damage based on power, no lasting effect.',
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
                    remainingDuration: 1,
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
                    name: 'Mend Wounds Effect',
                    description: '+20 HP (Applied once)',
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
                    description: '+7 Defense',
                    remainingDuration: 3,
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
                    remainingDuration: 1,
                    powerBoost: 15,
                    sourceCardId: 'card_010'
                };
                return [...existingEffects, newEffect];
            }
        }
    }
];

export function getPredefinedCards(): Card[] {
    return PREDEFINED_CARDS.map(card => {
        const originalCard = PREDEFINED_CARDS.find(c => c.id === card.id);
        if (originalCard) {
            return {
                ...card,
                effect: {
                    ...card.effect,
                    apply: originalCard.effect.apply
                }
            };
        }
        // This fallback should ideally not be reached if PREDEFINED_CARDS is the source
        return {
            ...card,
            effect: {
                ...card.effect,
                apply: (t, e) => e
            }
        };
    });
}
