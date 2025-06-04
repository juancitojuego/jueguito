// src/main.ts
import { GameState } from './game_state';
import { StoneQualities, calculateStonePower, createStone } from './stone_mechanics'; // Added createStone
import { crackOpenStone, salvageStone } from './player_actions'; // Import new actions

function displayStoneDetails(stone: StoneQualities | null, label: string): void {
    console.log(`--- ${label} ---`);
    if (stone) {
        console.log(`  Name: ${stone.name}`);
        console.log(`  Seed: ${stone.seed}`);
        // console.log(`  Color: ${stone.color}`); // Keep output concise for demo
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

function runGameDemo(): void {
    console.log("Starting Stone Crafter Demo - Actions...\n");

    const masterSeed = Date.now();
    let gameState = GameState.createInitial("ActionPlayer", masterSeed);
    console.log(`Game initialized for player: ${gameState.playerStats.name}`);
    console.log(`Game Seed: ${gameState.gameSeed}, Opponents Seed: ${gameState.opponentsSeed}`);
    console.log(`Initial currency: ${gameState.currency}\n`);

    let equippedStone = gameState.equippedStoneId ? gameState.getStoneById(gameState.equippedStoneId) : null;
    displayStoneDetails(equippedStone, "Initial Equipped Stone");
    listInventory(gameState);

    // --- Demonstrate Crack Open Stone ---
    console.log("\n\n--- Action: Crack Open Stone ---");
    if (gameState.equippedStoneId) {
        const crackResult = crackOpenStone(gameState);
        console.log(crackResult.message);
        // crackResult.newStones.forEach(stone => { // Details of new stones are less critical than seeing overall state
        //     displayStoneDetails(stone, "Newly Found Stone");
        // });
    } else {
        console.log("Skipping Crack Open Stone demo: No stone equipped.");
    }
    listInventory(gameState);
    equippedStone = gameState.equippedStoneId ? gameState.getStoneById(gameState.equippedStoneId) : null;
    displayStoneDetails(equippedStone, "Equipped Stone after Cracking");

    // --- Demonstrate Salvage Stone ---
    console.log("\n\n--- Action: Salvage Stone ---");
    // Ensure there's an equipped stone. If cracking resulted in no stones (highly unlikely), create one for salvage demo.
    if (!gameState.equippedStoneId && gameState.stones.length === 0) {
        console.log("Inventory empty. Adding a temporary stone to demonstrate salvage.");
        const tempStone = createStone(Date.now() | 0); // Ensure it's an int
        gameState.addStoneToInventory(tempStone);
        gameState.equipStone(tempStone.seed); // Equip it directly
        listInventory(gameState); // Show inventory with the temp stone
        equippedStone = gameState.getStoneById(tempStone.seed); // Update equippedStone ref
        displayStoneDetails(equippedStone, "Temporary Stone for Salvage Demo");
    }

    if (gameState.equippedStoneId) {
        const initialCurrency = gameState.currency;
        const stoneToSalvage = gameState.getStoneById(gameState.equippedStoneId!)!; // Non-null assertion as we checked
        console.log(`Attempting to salvage: ${stoneToSalvage.name} (Rarity: ${stoneToSalvage.rarity})`);

        const salvageResult = salvageStone(gameState);

        console.log(salvageResult.message);
        console.log(`Currency before: ${initialCurrency}, After: ${gameState.currency}, Gained: ${salvageResult.currencyGained}`);
    } else {
        console.log("Skipping Salvage Stone demo: No stone equipped.");
    }
    listInventory(gameState);
    equippedStone = gameState.equippedStoneId ? gameState.getStoneById(gameState.equippedStoneId) : null;
    displayStoneDetails(equippedStone, "Equipped Stone after Salvaging");

    // --- Try to salvage again if inventory is empty (should fail gracefully) ---
    if (!gameState.equippedStoneId) {
        console.log("\n\n--- Action: Salvage Stone (on empty/no equipped) ---");
        const salvageResultEmpty = salvageStone(gameState);
        console.log(salvageResultEmpty.message);
        console.log(`Currency: ${gameState.currency}`);
    }


    console.log("\n\n--- Game Demo End ---");
}

// Run the demo
runGameDemo();
