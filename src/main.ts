// src/main.ts
import { GameState } from './game_state';
import { StoneQualities, calculateStonePower } from './stone_mechanics';

function displayStoneDetails(stone: StoneQualities | null, label: string): void {
    console.log(`--- ${label} ---`);
    if (stone) {
        console.log(`  Name: ${stone.name}`);
        console.log(`  Seed: ${stone.seed}`);
        console.log(`  Color: ${stone.color}`);
        console.log(`  Shape: ${stone.shape}`);
        console.log(`  Weight: ${stone.weight}`);
        console.log(`  Rarity: ${stone.rarity}`);
        console.log(`  Magic: ${stone.magic}`);
        console.log(`  Created At: ${new Date(stone.createdAt).toLocaleString()}`);
        console.log(`  Power: ${calculateStonePower(stone).toFixed(2)}`);
    } else {
        console.log("  No stone to display.");
    }
}

function runGameDemo(): void {
    console.log("Starting Stone Crafter Demo...\n");

    // 1. Initialize Game State
    const masterSeed = Date.now(); // Use a dynamic seed for variety each run
    const gameState = GameState.createInitial("Player One", masterSeed);
    console.log(`Game initialized for player: ${gameState.playerStats.name}`);
    console.log(`Game Seed: ${gameState.gameSeed}, Opponents Seed: ${gameState.opponentsSeed}\n`);

    // 2. Display Player's Initial Equipped Stone
    const equippedStoneId = gameState.equippedStoneId;
    const equippedStone = equippedStoneId ? gameState.getStoneById(equippedStoneId) : null;
    displayStoneDetails(equippedStone, "Player's Equipped Stone");

    // 3. Display Current Opponent
    console.log(""); // Extra line for spacing
    const currentOpponent = gameState.getCurrentOpponent();
    displayStoneDetails(currentOpponent, "Current Opponent");

    // 4. Simple inventory overview
    console.log("\n--- Player Inventory ---");
    if (gameState.stones.length > 0) {
        gameState.stones.forEach(stone => {
            console.log(`  - ${stone.name} (Power: ${calculateStonePower(stone).toFixed(2)})${stone.seed === gameState.equippedStoneId ? ' [EQUIPPED]' : ''}`);
        });
    } else {
        console.log("  Inventory is empty.");
    }

    // 5. Advance to next opponent and display
    gameState.advanceOpponent();
    const nextOpponent = gameState.getCurrentOpponent();
    console.log("");
    displayStoneDetails(nextOpponent, "Next Opponent (after advancing)");

    console.log("\n--- Game Demo End ---");
    console.log("To see more, expand this script with interactions or load a saved game (once saving is fully implemented).");
}

// Run the demo
runGameDemo();
