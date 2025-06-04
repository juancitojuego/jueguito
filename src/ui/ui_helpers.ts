// src/ui/ui_helpers.ts
import { GameState } from '../game_state';
import { StoneQualities, calculateStonePower } from '../stone_mechanics';
import { FightSessionData, CombatParticipantState, ActiveEffect } from '../combat_interfaces'; // Added ActiveEffect
import { term } from './index'; // Assuming term is exported from src/ui/index.ts

export function displayStoneDetails(stone: StoneQualities | null, label: string): void {
    term.brightWhite(`--- ${label} ---\n`);
    if (stone) {
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
        effectsToDisplay.forEach(eff => term(`      - ${eff.name} (Desc: ${eff.description}), Duration: ${eff.remainingDuration}\n`));
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
