// src/config/cards.ts
import { Card } from '../combat_interfaces'; // Card will be defined in combat_interfaces

export const PREDEFINED_CARDS: Card[] = [
    { id: 'card_001', name: 'Minor Power Boost', type: 'BUFF_ATTACK', description: 'Increases power slightly.' },
    { id: 'card_002', name: 'Minor Defense Boost', type: 'BUFF_DEFENSE', description: 'Increases defense slightly.' },
    { id: 'card_003', name: 'Small Heal', type: 'HEAL', description: 'Heals a small amount of health.' },
    { id: 'card_004', name: 'Quick Jab', type: 'ATTACK', description: 'A fast but weak attack.' },
    { id: 'card_005', name: 'Guard Up', type: 'BUFF_DEFENSE', description: 'Bolster your defenses.' },
    { id: 'card_006', name: 'Focused Strike', type: 'ATTACK', description: 'A precise attack.' },
    { id: 'card_007', name: 'Rally Cry', type: 'BUFF_ATTACK', description: 'Inspire yourself to fight harder.' },
    { id: 'card_008', name: 'Mend Wounds', type: 'HEAL', description: 'Restore some health.' },
    { id: 'card_009', name: 'Stone Shield', type: 'BUFF_DEFENSE', description: 'A magical shield appears.' },
    { id: 'card_010', name: 'Power Surge', type: 'BUFF_ATTACK', description: 'Temporarily surge with power.' },
];

export function getPredefinedCards(): Card[] {
    // Return a deep copy to prevent modification of the original array
    return JSON.parse(JSON.stringify(PREDEFINED_CARDS));
}
