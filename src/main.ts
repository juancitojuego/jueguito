// src/main.ts
import { GameState } from './game_state';
import { StoneQualities, calculateStonePower, createStone } from './stone_mechanics';
import { crackOpenStone, salvageStone } from './player_actions';
import {
    startFight,
    getCurrentFightSession,
    clearCurrentFightSession,
    startNewRound,
    playerSelectsCard // Import new function
} from './fight_service';
import { FightSessionData, NewRoundInfo, Card, ActiveEffect } from './combat_interfaces';

function displayStoneDetails(stone: StoneQualities | null, label: string): void {
    console.log(`--- ${label} ---`);
    if (stone) {
        console.log(`  Name: ${stone.name}`);
        console.log(`  Seed: ${stone.seed}`);
        console.log(`  Weight: ${stone.weight}`);
        console.log(`  Rarity: ${stone.rarity}`);
        console.log(`  Magic: ${stone.magic}`);
        // console.log(`  Created At: ${new Date(stone.createdAt).toLocaleString()}`);
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
        console.log(`    Stone: ${session.playerState.baseStone.name}`);
        console.log(`    Health: ${session.playerState.currentHealth.toFixed(0)}/${session.playerState.maxHealth.toFixed(0)}`);
        console.log(`    Power: ${session.playerState.currentPower.toFixed(2)} (Base: ${session.playerState.basePower.toFixed(2)})`);
        console.log(`    Defense: ${session.playerState.currentDefense.toFixed(2)} (Base: ${session.playerState.baseDefense.toFixed(2)})`);
        if(session.playerState.activeEffects.length > 0) {
            console.log(`    Active Effects: ${session.playerState.activeEffects.map(e => `${e.name}(${e.remainingDuration})`).join(', ')}`);
        }
        console.log("  Opponent:");
        console.log(`    Stone: ${session.opponentState.baseStone.name}`);
        console.log(`    Health: ${session.opponentState.currentHealth.toFixed(0)}/${session.opponentState.maxHealth.toFixed(0)}`);
        console.log(`    Power: ${session.opponentState.currentPower.toFixed(2)} (Base: ${session.opponentState.basePower.toFixed(2)})`);
        console.log(`    Defense: ${session.opponentState.currentDefense.toFixed(2)} (Base: ${session.opponentState.baseDefense.toFixed(2)})`);
        if(session.opponentState.activeEffects.length > 0) {
            console.log(`    Active Effects: ${session.opponentState.activeEffects.map(e => `${e.name}(${e.remainingDuration})`).join(', ')}`);
        }

        if (session.currentRoundChoices && session.currentRoundChoices.length > 0) {
            console.log("  Cards for Choice (Player):");
            session.currentRoundChoices.forEach(card => console.log(`    - ${card.name} (ID: ${card.id}, Type: ${card.type})`));
        }
        if (session.fightLog.length > 0) {
            console.log("  Recent Fight Log:");
            session.fightLog.slice(-5).forEach(entry => console.log(`    - ${entry}`));
        }
    } else {
        console.log("  No active fight session.");
    }
}

function displayNewRoundInfo(newRoundInfo: NewRoundInfo | null): void {
    console.log("\n--- New Round Info ---");
    if (newRoundInfo) {
        console.log(`  Round Number: ${newRoundInfo.roundNumber}`);
        console.log(`  Player Health: ${newRoundInfo.playerHealth.toFixed(0)}`);
        console.log(`  Opponent Health: ${newRoundInfo.opponentHealth.toFixed(0)}`);
        console.log("  Cards for Choice:");
        if (newRoundInfo.cardsForChoice.length > 0) {
            newRoundInfo.cardsForChoice.forEach(card => {
                console.log(`    - ${card.name} (ID: ${card.id}, Type: ${card.type}, Desc: ${card.description})`);
            });
        } else {
            console.log("    No cards offered for choice (deck potentially empty).");
        }
    } else {
        console.log("  Could not start a new round (or fight is over).");
    }
}

function displayPlayerHandAndDiscard(gameState: GameState): void {
    console.log("\n--- Player Card State ---");
    console.log(`  Hand (${gameState.hand.length} cards): ${gameState.hand.map(c => c.name).join(', ') || 'Empty'}`);
    console.log(`  Discard Pile (${gameState.discardPile.length} cards): ${gameState.discardPile.map(c => c.name).join(', ') || 'Empty'}`);
}

function runGameDemo(): void {
    console.log("Starting Stone Crafter Demo - Player Selects Card...\n");

    const masterSeed = Date.now();
    let gameState = GameState.createInitial("CardPlayer", masterSeed);
    console.log(`Game initialized for player: ${gameState.playerStats.name}. Deck size: ${gameState.deck.length}`);

    let equippedStone = gameState.equippedStoneId ? gameState.getStoneById(gameState.equippedStoneId) : null;
    let currentOpponent = gameState.getCurrentOpponent();

    displayStoneDetails(equippedStone, "Player's Equipped Stone");
    displayStoneDetails(currentOpponent, "Current Opponent");

    console.log("\n--- Action: Start Fight ---");
    if (equippedStone && currentOpponent) {
        let currentSession = startFight(equippedStone, currentOpponent, gameState);
        if (currentSession) {
            console.log(`Fight started!`);
            // displayFightSession(getCurrentFightSession()); // Initial session state

            // --- Start New Round (Round 1) ---
            console.log("\n--- Action: Start New Round (Round 1) ---");
            const round1Info = startNewRound(getCurrentFightSession(), gameState);
            displayNewRoundInfo(round1Info); // Shows cards for choice
            // displayFightSession(getCurrentFightSession()); // Shows session with choices populated

            // --- Demonstrate Player Selects Card ---
            if (round1Info && round1Info.cardsForChoice.length > 0) {
                const chosenCardFromOptions = round1Info.cardsForChoice[0]; // Simulate choosing the first card
                console.log(`\n--- Action: Player Selects Card: "${chosenCardFromOptions.name}" ---`);

                const selectionResult = playerSelectsCard(getCurrentFightSession(), gameState, chosenCardFromOptions.id);
                console.log(selectionResult.message);

                if (selectionResult.success && selectionResult.chosenCard) {
                    console.log(`  Chosen card '${selectionResult.chosenCard.name}' should now be in hand.`);
                }
                displayPlayerHandAndDiscard(gameState); // Show hand and discard pile
                displayFightSession(getCurrentFightSession()); // Show session after choices are cleared
            } else {
                console.log("\nNo cards were available to select for Round 1.");
            }

            // --- Start New Round (Round 2) to see deck behavior ---
            console.log("\n--- Action: Start New Round (Round 2) ---");
            const round2Info = startNewRound(getCurrentFightSession(), gameState);
            displayNewRoundInfo(round2Info);

            if (round2Info && round2Info.cardsForChoice.length > 0) {
                const chosenCardR2 = round2Info.cardsForChoice[0];
                console.log(`\n--- Action: Player Selects Card for Round 2: "${chosenCardR2.name}" ---`);
                const selectionResultR2 = playerSelectsCard(getCurrentFightSession(), gameState, chosenCardR2.id);
                console.log(selectionResultR2.message);
                displayPlayerHandAndDiscard(gameState);
            } else {
                 console.log("\nNo cards were available to select for Round 2.");
            }
            displayFightSession(getCurrentFightSession());


        } else {
            console.log("Could not start fight.");
        }
    } else {
        console.log("Cannot start fight: Player's equipped stone or opponent missing.");
    }

    clearCurrentFightSession();
    console.log("\n--- Game Demo End ---");
}

runGameDemo();
