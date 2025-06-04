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
    CombatParticipantState
} from './combat_interfaces';

function displayStoneDetails(stone: StoneQualities | null, label: string): void {
    console.log(`--- ${label} ---`);
    if (stone) {
        console.log(`  Name: ${stone.name}`);
        console.log(`  Seed: ${stone.seed}`);
        console.log(`  Rarity: ${stone.rarity}, Magic: ${stone.magic}, Weight: ${stone.weight}`);
        console.log(`  Power: ${calculateStonePower(stone).toFixed(2)}`);
        // console.log(`  Created At: ${new Date(stone.createdAt).toLocaleString()}`);
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
        displayParticipantState("Player", session.playerState, gameState?.playerActiveCombatEffects); // Pass gameState for player effects
        displayParticipantState("Opponent", session.opponentState, session.opponentState.activeEffects); // Opponent effects are on their state

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


// Placeholder card effect implementations for demo
// These would normally be part of the card definition in src/config/cards.ts
const placeholderCardEffects: Record<string, (target: CombatParticipantState, existingEffects: ReadonlyArray<ActiveEffect>) => ActiveEffect[]> = {
    default: (target, existingEffects) => { // Default effect if specific one not found
        console.warn(`Using default placeholder effect for a card.`);
        return [...existingEffects]; // Return existing effects unchanged
    },
    power_boost_sml: (target, existingEffects) => {
        const newEffect: ActiveEffect = {
            id: `eff_pbs_${Date.now()}`, name: "Minor Power Boost", description: "+5 Power for 2 rounds",
            remainingDuration: 3, powerBoost: 5, sourceCardId: 'card_001' // Duration 3 so it lasts 2 full rounds after this one
        };
        return [...existingEffects, newEffect];
    },
    defense_boost_sml: (target, existingEffects) => {
        const newEffect: ActiveEffect = {
            id: `eff_dbs_${Date.now()}`, name: "Minor Defense Boost", description: "+5 Defense for 2 rounds",
            remainingDuration: 3, defenseBoost: 5, sourceCardId: 'card_002'
        };
        return [...existingEffects, newEffect];
    },
    heal_sml: (target, existingEffects) => {
        const newEffect: ActiveEffect = {
            id: `eff_hsl_${Date.now()}`, name: "Small Heal", description: "Heals 10 HP",
            remainingDuration: 1, healAmount: 10, sourceCardId: 'card_003' // Instant effect, duration 1 to be cleaned up
        };
        // Note: applyActiveEffectsToParticipant will handle the actual healing for healAmount effects
        return [...existingEffects, newEffect];
    }
};

function assignPlaceholderEffectsToCards(cards: Card[]): Card[] {
    return cards.map(card => {
        let effectLogic = placeholderCardEffects.default;
        if (card.id === 'card_001') effectLogic = placeholderCardEffects.power_boost_sml;
        if (card.id === 'card_002') effectLogic = placeholderCardEffects.defense_boost_sml;
        if (card.id === 'card_003') effectLogic = placeholderCardEffects.heal_sml;
        // Add more mappings as needed for other predefined cards

        return {
            ...card,
            effect: {
                id: card.id + "_effect", // Effect ID can be derived from card ID
                description: card.description, // Or a more specific effect description
                apply: effectLogic
            }
        };
    });
}


function runGameDemo(): void {
    console.log("Starting Stone Crafter Demo - Full Combat Round...\n");

    const masterSeed = Date.now();
    let gameState = GameState.createInitial("CombatPlayerFull", masterSeed);

    // Assign placeholder effects to the cards in the deck
    gameState.deck = assignPlaceholderEffectsToCards(gameState.deck);

    console.log(`Game initialized for player: ${gameState.playerStats.name}, Currency: ${gameState.currency}`);

    let equippedStone = gameState.getStoneById(gameState.equippedStoneId!); // Should be set by createInitial
    let currentOpponent = gameState.getCurrentOpponent();

    displayStoneDetails(equippedStone, "Player's Equipped Stone");
    displayStoneDetails(currentOpponent, "Current Opponent");
    listInventory(gameState);
    displayPlayerHandAndDiscard(gameState);

    console.log("\n--- Action: Start Fight ---");
    if (equippedStone && currentOpponent) {
        let currentSession = startFight(equippedStone, currentOpponent, gameState);
        if (!currentSession) {
            console.log("Could not start fight.");
            return;
        }
        console.log(`Fight started! Session ID: ${currentSession.sessionId}`);
        displayFightSession(currentSession, gameState);

        for (let i = 0; i < 5 && !currentSession!.isFightOver; i++) {
            console.log(`\n\n==================== ROUND ${currentSession!.currentRound + 1} ====================`);

            const roundInfo = startNewRound(currentSession, gameState);
            if (!roundInfo) { console.log("Failed to start new round."); break; }
            displayNewRoundInfo(roundInfo);
            displayFightSession(currentSession, gameState);

            if (roundInfo.cardsForChoice.length > 0) {
                const selectedCard = roundInfo.cardsForChoice[0];
                console.log(`\n--- Player Action: Selects Card '${selectedCard.name}' ---`);
                const selectionResult = playerSelectsCard(currentSession, gameState, selectedCard.id);
                console.log(selectionResult.message);
                displayPlayerHandAndDiscard(gameState);
            } else { console.log("\nPlayer has no cards to choose from."); }

            if (gameState.hand.length > 0) {
                const cardToPlay = gameState.hand[0];
                const target = (cardToPlay.type === CardType.HEAL || cardToPlay.type.startsWith("BUFF")) ? TargetType.PLAYER : TargetType.OPPONENT;
                console.log(`\n--- Player Action: Plays Card '${cardToPlay.name}' on ${target} ---`);
                const playResult = playerPlaysCard(currentSession, gameState, cardToPlay.id, target);
                console.log(playResult.message);
                if (playResult.success && playResult.updatedPlayerState && playResult.updatedOpponentState) {
                    currentSession.playerState = playResult.updatedPlayerState;
                    currentSession.opponentState = playResult.updatedOpponentState;
                }
                displayPlayerHandAndDiscard(gameState);
                displayFightSession(currentSession, gameState);
            } else { console.log("\nPlayer has no cards in hand to play."); }

            console.log("\n--- Action: Resolve Current Round --- ");
            const resolutionOutcome = resolveCurrentRound(currentSession, gameState);
            if (resolutionOutcome) {
                console.log(resolutionOutcome.logEntry);
                displayFightSession(currentSession, gameState);
                if (resolutionOutcome.isFightOver) {
                    console.log(`FIGHT OVER! Winner: ${resolutionOutcome.winner || 'None'}`);
                    const fightOutcome = endFight(currentSession, gameState, resolutionOutcome.winner);
                    if (fightOutcome) {
                        console.log("\n--- Fight Outcome ---");
                        console.log(`  Winner: ${fightOutcome.winner}`);
                        console.log(`  Currency Change: ${fightOutcome.currencyChange}`);
                        if (fightOutcome.newStoneGainedByPlayer) {
                            console.log(`  New Stone Gained: ${fightOutcome.newStoneGainedByPlayer.name}`);
                        }
                        if (fightOutcome.stoneLostByPlayer) {
                            console.log("  Player lost their stone!");
                        }
                        console.log("Final Player Currency:", gameState.currency);
                        listInventory(gameState);
                    }
                    gameState.advanceOpponent();
                    console.log(`Player is now at opponent index: ${gameState.opponents_index}`);
                    break;
                }
            } else { console.log("Could not resolve round."); break; }
        }
        if (currentSession && !currentSession.isFightOver){
             console.log("\nDemo fight ended due to round limit (5 rounds).");
             clearCurrentFightSession();
        }
    } else {
        console.log("Cannot start fight: Player's equipped stone or opponent missing.");
    }

    console.log("\n--- Game Demo End ---");
}

runGameDemo();
