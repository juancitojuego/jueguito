// src/main.ts
import { GameState } from './game_state';
import { StoneQualities, calculateStonePower, createStone } from './stone_mechanics';
import { crackOpenStone, salvageStone } from './player_actions'; // Import player actions
import { startFight, getCurrentFightSession, clearCurrentFightSession } from './fight_service'; // Import combat functions
import { FightSessionData } from './combat_interfaces'; // Import interface for type hinting

function displayStoneDetails(stone: StoneQualities | null, label: string): void {
    console.log(`--- ${label} ---`);
    if (stone) {
        console.log(`  Name: ${stone.name}`);
        console.log(`  Seed: ${stone.seed}`);
        // console.log(`  Color: ${stone.color}`);
        // console.log(`  Shape: ${stone.shape}`);
        console.log(`  Weight: ${stone.weight}`);
        console.log(`  Rarity: ${stone.rarity}`);
        console.log(`  Magic: ${stone.magic}`);
        console.log(`  Created At: ${new Date(stone.createdAt).toLocaleString()}`);
        console.log(`  Power: ${calculateStonePower(stone).toFixed(2)}`);
    } else {
        console.log("  No stone to display.");
    }
}

function listInventory(gameState: GameState): void {
    console.log(`\n--- Player Inventory --- (Stones: ${gameState.stones.length}, Currency: ${gameState.currency})`);
    if (gameState.stones.length > 0) {
        gameState.stones.forEach(stone => {
            console.log(`  - ${stone.name} (Pwr: ${calculateStonePower(stone).toFixed(2)})${stone.seed === gameState.equippedStoneId ? ' [EQUIPPED]' : ''}`);
        });
    } else {
        console.log("  Inventory is empty.");
    }
}

function displayFightSession(session: FightSessionData | null): void {
    console.log("\n--- Current Fight Session ---");
    if (session) {
        console.log(`  Session ID: ${session.sessionId}`);
        console.log(`  Round: ${session.currentRound}`);
        console.log(`  Fight Over: ${session.isFightOver}`);
        console.log("  Player:");
        console.log(`    Stone ID: ${session.playerParticipantId} (Name: ${session.playerState.baseStone.name})`);
        console.log(`    Health: ${session.playerState.currentHealth}/${session.playerState.maxHealth}`);
        console.log(`    Power: ${session.playerState.currentPower.toFixed(2)} (Base: ${session.playerState.basePower.toFixed(2)})`);
        console.log(`    Defense: ${session.playerState.currentDefense.toFixed(2)} (Base: ${session.playerState.baseDefense.toFixed(2)})`);
        console.log("  Opponent:");
        console.log(`    Stone ID: ${session.opponentParticipantId} (Name: ${session.opponentState.baseStone.name})`);
        console.log(`    Health: ${session.opponentState.currentHealth}/${session.opponentState.maxHealth}`);
        console.log(`    Power: ${session.opponentState.currentPower.toFixed(2)} (Base: ${session.opponentState.basePower.toFixed(2)})`);
        console.log(`    Defense: ${session.opponentState.currentDefense.toFixed(2)} (Base: ${session.opponentState.baseDefense.toFixed(2)})`);
        if (session.fightLog.length > 0) {
            console.log("  Fight Log:");
            session.fightLog.forEach(entry => console.log(`    - ${entry}`));
        }
    } else {
        console.log("  No active fight session.");
    }
}


function runGameDemo(): void {
    console.log("Starting Stone Crafter Demo - Combat Initiation...\n");

    const masterSeed = Date.now();
    let gameState = GameState.createInitial("CombatPlayer", masterSeed);
    console.log(`Game initialized for player: ${gameState.playerStats.name}`);
    console.log(`Game Seed: ${gameState.gameSeed}, Opponents Seed: ${gameState.opponentsSeed}\n`);

    let equippedStone = gameState.equippedStoneId ? gameState.getStoneById(gameState.equippedStoneId) : null;
    displayStoneDetails(equippedStone, "Player's Initial Equipped Stone");

    const currentOpponent = gameState.getCurrentOpponent();
    displayStoneDetails(currentOpponent, "Current Opponent");
    listInventory(gameState); // Show initial inventory and currency

    // --- Demonstrate Start Fight ---
    console.log("\n\n--- Action: Start Fight ---");
    if (equippedStone && currentOpponent) {
        const fightSession = startFight(equippedStone, currentOpponent, gameState);
        if (fightSession) {
            console.log(`Fight started! Session ID: ${fightSession.sessionId}`);
            displayFightSession(getCurrentFightSession());
        } else {
            console.log("Could not start fight (startFight returned null).");
        }
    } else {
        let reasons = [];
        if (!equippedStone) reasons.push("Player's equipped stone missing");
        if (!currentOpponent) reasons.push("Opponent missing");
        console.log(`Cannot start fight: ${reasons.join(', ')}.`);
    }

    // Example of other actions (can be uncommented to see a fuller flow)
    /*
    console.log("\n\n--- Action: Crack Open Stone ---");
    if (gameState.equippedStoneId) { // Player stone might have changed if fight occurred and had consequences
        const crackResult = crackOpenStone(gameState);
        console.log(crackResult.message);
    } else {
        console.log("Skipping Crack Open Stone demo: No stone equipped.");
    }
    listInventory(gameState);
    equippedStone = gameState.equippedStoneId ? gameState.getStoneById(gameState.equippedStoneId) : null;
    displayStoneDetails(equippedStone, "Equipped Stone after Cracking");

    console.log("\n\n--- Action: Salvage Stone ---");
    if (gameState.equippedStoneId) {
        const initialCurrency = gameState.currency;
        const stoneToSalvage = gameState.getStoneById(gameState.equippedStoneId!)!;
        console.log(`Attempting to salvage: ${stoneToSalvage.name} (Rarity: ${stoneToSalvage.rarity})`);
        const salvageResult = salvageStone(gameState);
        console.log(salvageResult.message);
        console.log(`Currency before: ${initialCurrency}, After: ${gameState.currency}, Gained: ${salvageResult.currencyGained}`);
    } else {
        console.log("Skipping Salvage Stone demo: No stone equipped.");
    }
    listInventory(gameState);
    */

    // Clear session at the end of the demo part related to fight
    if (getCurrentFightSession()) {
        clearCurrentFightSession();
        console.log("\nFight session cleared for demo end.");
        displayFightSession(getCurrentFightSession()); // Should show no active session
    }

    console.log("\n\n--- Game Demo End ---");
}

runGameDemo();
