// src/main.ts
import { GameState } from './game_state';
import { StoneQualities, calculateStonePower, createStone } from './stone_mechanics';
import { crackOpenStone, salvageStone } from './player_actions';
import {
    startFight,
    getCurrentFightSession,
    clearCurrentFightSession,
    startNewRound,
    playerSelectsCard,
    playerPlaysCard,
    resolveCurrentRound,
    endFight
} from './fight_service';
import {
    FightSessionData,
    NewRoundInfo,
    Card,
    TargetType,
    CardPlayOutcome,
    RoundResolutionOutcome,
    FightOutcome,
    ActiveEffect,
    CombatParticipantState // Ensured CombatParticipantState is imported
} from './combat_interfaces';
import { GameStateManager } from './game_state_manager'; // Import GameStateManager

// --- Display Helper Functions (largely unchanged) ---
function displayStoneDetails(stone: StoneQualities | null, label: string): void {
    console.log(`--- ${label} ---`);
    if (stone) {
        console.log(`  Name: ${stone.name}`);
        console.log(`  Seed: ${stone.seed}`);
        console.log(`  Rarity: ${stone.rarity}, Magic: ${stone.magic}, Weight: ${stone.weight}`);
        console.log(`  Power: ${calculateStonePower(stone).toFixed(2)}`);
        console.log(`  Created At: ${new Date(stone.createdAt).toLocaleString()}`);
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

function displayParticipantState(label: string, participantState: CombatParticipantState | undefined, activeEffectsSource?: ReadonlyArray<ActiveEffect>) {
    if (!participantState) {
        console.log(`  ${label}: State not available.`);
        return;
    }
    console.log(`  ${label} (Stone: ${participantState.baseStone.name}):`);
    console.log(`    Health: ${participantState.currentHealth.toFixed(0)}/${participantState.maxHealth.toFixed(0)}`);
    console.log(`    Power: ${participantState.currentPower.toFixed(2)} (Base: ${participantState.basePower.toFixed(2)})`);
    console.log(`    Defense: ${participantState.currentDefense.toFixed(2)} (Base: ${participantState.baseDefense.toFixed(2)})`);

    const effectsToDisplay = activeEffectsSource || participantState.activeEffects;
    if (effectsToDisplay.length > 0) {
        console.log("    Active Effects:");
        effectsToDisplay.forEach(eff => console.log(`      - ${eff.name} (Desc: ${eff.description}), Duration: ${eff.remainingDuration}`));
    }
}

function displayFightSession(session: FightSessionData | null, gameState?: GameState): void {
    console.log("\n--- Current Fight Session ---");
    if (session) {
        console.log(`  Session ID: ${session.sessionId}`);
        console.log(`  Round: ${session.currentRound}`);
        console.log(`  Fight Over: ${session.isFightOver}`);
        displayParticipantState("Player", session.playerState, gameState?.playerActiveCombatEffects);
        displayParticipantState("Opponent", session.opponentState, session.opponentState.activeEffects);

        if (session.currentRoundChoices && session.currentRoundChoices.length > 0) {
            console.log("  Cards for Choice (Player):");
            session.currentRoundChoices.forEach(card => console.log(`    - ${card.name} (ID: ${card.id}, Type: ${card.type})`));
        }
        if (session.fightLog.length > 0) {
            console.log("  Fight Log (Last 5 entries):");
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
            console.log("    No cards offered for choice (deck empty?).");
        }
    } else {
        console.log("  Could not start a new round.");
    }
}

function displayPlayerHandAndDiscard(gameState: GameState): void {
    console.log("\n--- Player Card State ---");
    console.log(`  Hand (${gameState.hand.length} cards): ${gameState.hand.map(c => `${c.name} (ID: ${c.id})`).join(', ') || 'Empty'}`);
    console.log(`  Discard Pile (${gameState.discardPile.length} cards): ${gameState.discardPile.map(c => c.name).join(', ') || 'Empty'}`);
    console.log(`  Deck (${gameState.deck.length} cards remaining)`);
}

// Placeholder card effect assignment (from previous step, ensure it's here)
const placeholderCardEffects: Record<string, (target: CombatParticipantState, existingEffects: ReadonlyArray<ActiveEffect>) => ActiveEffect[]> = {
    default: (target, existingEffects) => { console.warn(`Using default placeholder effect.`); return [...existingEffects]; },
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
function assignPlaceholderEffectsToCards(cards: Card[]): Card[] {
    return cards.map(card => {
        let effectLogic = placeholderCardEffects.default;
        if (card.id === 'card_001') effectLogic = placeholderCardEffects.power_boost_sml;
        if (card.id === 'card_002') effectLogic = placeholderCardEffects.defense_boost_sml;
        if (card.id === 'card_003') effectLogic = placeholderCardEffects.heal_sml;
        return { ...card, effect: { id: card.id + "_effect", description: card.description, apply: effectLogic } };
    });
}
// --- End Display Helper Functions & Placeholder Effects ---


function runGameDemo(): void {
    console.log("Starting Stone Crafter Demo - Save/Load Test...\n");

    // --- Attempt to Load Game ---
    console.log("\n--- Attempting to Load Game (Initial) ---");
    let gameState = GameStateManager.loadGame();
    console.log(`Game loaded. Player: ${gameState.playerStats.name}, Currency: ${gameState.currency}`);
    console.log(`Game Seed: ${gameState.gameSeed}, Opponents Seed: ${gameState.opponentsSeed}`);
    // Ensure deck is populated if it wasn't by load (e.g. new game from load)
    if (gameState.deck.length === 0 && gameState.hand.length === 0 && gameState.discardPile.length === 0) {
        console.log("Deck empty after load, generating fresh deck.");
        GameStateManager.generateDeck(gameState);
    }
    // Assign effects to cards in deck (important after load or new deck generation)
    gameState.deck = assignPlaceholderEffectsToCards(gameState.deck);
    gameState.hand = assignPlaceholderEffectsToCards(gameState.hand); // If any cards started in hand
    gameState.discardPile = assignPlaceholderEffectsToCards(gameState.discardPile); // If any started in discard


    listInventory(gameState);
    displayPlayerHandAndDiscard(gameState);
    let equippedStone = gameState.getStoneById(gameState.equippedStoneId); // Use instance method
    displayStoneDetails(equippedStone, "Equipped Stone after Initial Load/New Game");

    // --- Perform some actions to change state ---
    console.log("\n\n--- Performing some actions to change state... ---");
    if (!equippedStone && gameState.stones.length > 0) {
        GameStateManager.equipStone(gameState, gameState.stones[0].seed!);
        equippedStone = gameState.getStoneById(gameState.equippedStoneId);
        console.log("Auto-equipped a stone as none was equipped.");
        displayStoneDetails(equippedStone, "Newly Equipped Stone");
    }

    if (gameState.equippedStoneId) {
        console.log("\nAttempting to Crack Open Stone...");
        const crackResult = crackOpenStone(gameState); // Uses GameStateManager.saveGame internally
        console.log(crackResult.message);
        if (crackResult.newStones.length > 0) {
            displayStoneDetails(crackResult.newStones[0], "A new stone from cracking");
        }
        listInventory(gameState);
    } else {
        console.log("Skipping Crack Open Stone: No stone equipped.");
    }

    GameStateManager.updateCurrency(gameState, 50);
    console.log(`\nPlayer currency updated by +50. Current: ${gameState.currency}`);

    // --- Save Game ---
    console.log("\n\n--- Attempting to Save Game ---");
    const saveSuccess = GameStateManager.saveGame(gameState);
    console.log(saveSuccess ? "Game state saved." : "Failed to save game.");

    // --- Simulate restarting and loading again ---
    console.log("\n\n--- Simulating Restart: Attempting to Load Game Again ---");
    let loadedGameState = GameStateManager.loadGame();
    console.log(`Game re-loaded. Player: ${loadedGameState.playerStats.name}, Currency: ${loadedGameState.currency}`);
    console.log(`Game Seed: ${loadedGameState.gameSeed}, Opponents Seed: ${loadedGameState.opponentsSeed}`);
     // Assign effects to cards in re-loaded deck
    loadedGameState.deck = assignPlaceholderEffectsToCards(loadedGameState.deck);
    loadedGameState.hand = assignPlaceholderEffectsToCards(loadedGameState.hand);
    loadedGameState.discardPile = assignPlaceholderEffectsToCards(loadedGameState.discardPile);

    listInventory(loadedGameState);
    displayPlayerHandAndDiscard(loadedGameState);
    let reloadedEquippedStone = loadedGameState.getStoneById(loadedGameState.equippedStoneId); // Use instance method
    displayStoneDetails(reloadedEquippedStone, "Equipped Stone after Re-Load");

    // --- Demonstrate Starting a Fight with loaded state ---
    console.log("\n\n--- Action: Start Fight with Loaded State ---");
    equippedStone = loadedGameState.getStoneById(loadedGameState.equippedStoneId);
    let currentOpponent = GameStateManager.getCurrentOpponent(loadedGameState);
    displayStoneDetails(currentOpponent, "Current Opponent from Loaded State");

    if (equippedStone && currentOpponent) {
        let currentSession = startFight(equippedStone, currentOpponent, loadedGameState);
        if (currentSession) {
            console.log(`Fight started!`);
            displayFightSession(currentSession, loadedGameState);

            const round1Info = startNewRound(currentSession, loadedGameState);
            displayNewRoundInfo(round1Info);

            // ... (further combat demo could continue here if desired) ...
            clearCurrentFightSession();
        } else {
            console.log("Could not start fight with loaded state.");
        }
    } else {
        console.log("Cannot start fight with loaded state: Player's equipped stone or opponent missing.");
    }

    console.log("\n\n--- Game Demo End ---");
}

runGameDemo();
