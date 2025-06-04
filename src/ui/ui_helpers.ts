// src/ui/ui_helpers.ts
import { GameState } from '../game_state';
import { StoneQualities, calculateStonePower } from '../stone_mechanics';
import { FightSessionData, CombatParticipantState, ActiveEffect, Card } from '../combat_interfaces'; // Added Card
import { term } from './index'; // Assuming term is exported from src/ui/index.ts

export function displayStoneDetails(stone: StoneQualities | null | undefined, label: string): void {
    term.brightWhite(`--- ${label} ---\n`);
    if (stone) { // This condition correctly handles both null and undefined
        term(`  Name: `).green(`${stone.name}\n`);
        term(`  Seed: ${stone.seed}\n`);
        term(`  Rarity: ${stone.rarity}, Magic: ${stone.magic}, Weight: ${stone.weight}\n`);
        term(`  Power: `).yellow(`${calculateStonePower(stone).toFixed(2)}\n`);
        term(`  Created At: ${new Date(stone.createdAt).toLocaleString()}\n`);
    } else {
        term.dim("  No stone to display.\n");
    }
}

export function listInventory(gameState: GameState): void {
    term.brightWhite(`\n--- Player Inventory --- (Stones: ${gameState.stones.length}, Currency: ${gameState.currency})\n`);
    if (gameState.stones.length > 0) {
        gameState.stones.forEach(stone => {
            const power = calculateStonePower(stone).toFixed(2);
            if (stone.seed === gameState.equippedStoneId) {
                term.bgColorRgb(30,30,70).brightYellow(`  - ${stone.name} (Pwr: ${power}) [EQUIPPED]\n`);
            } else {
                term(`  - ${stone.name} (Pwr: ${power})\n`);
            }
        });
    } else {
        term.dim("  Inventory is empty.\n");
    }
}

// Renamed from prompt to avoid conflict if CombatParticipantState is also a global type
function displaySingleParticipantInfo(label: string, participantState: CombatParticipantState | undefined, activeEffectsSource?: ReadonlyArray<ActiveEffect>) {
    if (!participantState) {
        term.dim(`  ${label}: State not available.\n`);
        return;
    }
    term.bold(`  ${label} (Stone: ${participantState.baseStone.name}):\n`);
    term(`    Health: `).red(`${participantState.currentHealth.toFixed(0)}/${participantState.maxHealth.toFixed(0)}\n`);
    term(`    Power: `).yellow(`${participantState.currentPower.toFixed(2)}`).dim(` (Base: ${participantState.basePower.toFixed(2)})\n`);
    term(`    Defense: `).blue(`${participantState.currentDefense.toFixed(2)}`).dim(` (Base: ${participantState.baseDefense.toFixed(2)})\n`);

    const effectsToDisplay = activeEffectsSource || participantState.activeEffects;
    if (effectsToDisplay.length > 0) {
        term.underline("    Active Effects:\n");
        effectsToDisplay.forEach(eff => term(`      - ${eff.name} (${eff.description}), Duration: ${eff.remainingDuration}\n`));
    }
}

export function displayFightSession(session: FightSessionData | null, gameState?: GameState): void {
    term.brightWhite("\n--- Current Fight Session ---\n");
    if (session) {
        term(`  Session ID: ${session.sessionId}\n`);
        term(`  Round: `).magenta(`${session.currentRound}\n`);
        term(`  Fight Over: `).red(`${session.isFightOver}\n`);

        displaySingleParticipantInfo("Player", session.playerState, gameState?.playerActiveCombatEffects);
        displaySingleParticipantInfo("Opponent", session.opponentState, session.opponentState.activeEffects);

        if (session.currentRoundChoices && session.currentRoundChoices.length > 0) {
            term.underline("  Cards for Choice (Player):\n");
            session.currentRoundChoices.forEach(card => term(`    - ${card.name} (ID: ${card.id}, Type: ${card.type})\n`));
        }
        if (session.fightLog.length > 0) {
            term.underline("  Fight Log (Last 5 entries):\n");
            session.fightLog.slice(-5).forEach(entry => term.gray(`    - ${entry}\n`));
        }
    } else {
        term.dim("  No active fight session.\n");
    }
}

// This function was removed from the prompt but existed in the previous version of main.ts.
// It's not directly used by the updated main.ts code in the prompt.
// Adding it back here if it's intended to be part of ui_helpers.ts for general use.
// If not, this can be omitted. For now, let's assume it's a general helper.
export function assignPlaceholderEffectsToCardsIfNecessary(gameState: GameState): void {
    const placeholderCardEffects: Record<string, (target: CombatParticipantState, existingEffects: ReadonlyArray<ActiveEffect>) => ActiveEffect[]> = {
        default: (target, existingEffects) => { console.warn(`Using default placeholder effect for a card.`); return [...existingEffects]; },
        power_boost_sml: (target, existingEffects) => {
            const newEffect: ActiveEffect = { id: `eff_pbs_${Date.now()}`, name: "Minor Power Boost", description: "+5 Power", remainingDuration: 3, powerBoost: 5, sourceCardId: 'card_001' };
            return [...existingEffects, newEffect];
        },
        defense_boost_sml: (target, existingEffects) => {
            const newEffect: ActiveEffect = { id: `eff_dbs_${Date.now()}`, name: "Minor Defense Boost", description: "+5 Defense", remainingDuration: 3, defenseBoost: 5, sourceCardId: 'card_002' };
            return [...existingEffects, newEffect];
        },
        heal_sml: (target, existingEffects) => {
            const newEffect: ActiveEffect = { id: `eff_hsl_${Date.now()}`, name: "Small Heal", description: "+10 HP", remainingDuration: 1, healAmount: 10, sourceCardId: 'card_003' };
            return [...existingEffects, newEffect];
        }
    };

    const assignLogic = (card: Card): Card => {
        let effectLogic = placeholderCardEffects.default;
        if (card.id === 'card_001') effectLogic = placeholderCardEffects.power_boost_sml;
        if (card.id === 'card_002') effectLogic = placeholderCardEffects.defense_boost_sml;
        if (card.id === 'card_003') effectLogic = placeholderCardEffects.heal_sml;
        // Add more mappings as needed for other predefined cards from src/config/cards.ts

        return {
            ...card,
            effect: {
                id: card.effect?.id || card.id + "_effect",
                description: card.effect?.description || card.description,
                apply: effectLogic
            }
        };
    };
    if (gameState.deck && gameState.deck.length > 0 && typeof gameState.deck[0].effect?.apply !== 'function') {
        gameState.deck = gameState.deck.map(assignLogic);
    }
    if (gameState.hand && gameState.hand.length > 0 && typeof gameState.hand[0].effect?.apply !== 'function') {
        gameState.hand = gameState.hand.map(assignLogic);
    }
    if (gameState.discardPile && gameState.discardPile.length > 0 && typeof gameState.discardPile[0].effect?.apply !== 'function') {
        gameState.discardPile = gameState.discardPile.map(assignLogic);
    }
}
