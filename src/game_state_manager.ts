// src/game_state_manager.ts
import { GameState, PlayerStats } from './game_state';
import { StoneQualities, createStone, generateNewStoneSeed, mulberry32 } from './stone_mechanics';
import { Card, ActiveEffect, IStoneQualities, CardType } from './combat_interfaces'; // Added CardType, IStoneQualities
import { getPredefinedCards, PREDEFINED_CARDS } from './config/cards'; // Added PREDEFINED_CARDS for loading
import { generateNewOpponentQueue } from './opponent_system';
import * as fs from 'fs';
import * as path from 'path';

export const SAVE_FILE_NAME = 'stoneCrafterGameState.json';
const SAVE_GAME_PATH = path.join(process.cwd(), SAVE_FILE_NAME);

export class GameStateManager {

    public static updateCurrency(gameState: GameState, amount: number): void {
        gameState.currency += amount;
        if (gameState.currency < 0) {
            gameState.currency = 0;
        }
    }

    public static addStoneToInventory(gameState: GameState, stoneInstance: StoneQualities): boolean {
        if (!(stoneInstance instanceof StoneQualities)) { return false; }
        if (gameState.stones.some(s => s.seed === stoneInstance.seed)) { return false; }
        gameState.stones.push(stoneInstance);
        gameState.stones.sort((a, b) => a.createdAt - b.createdAt);
        if (gameState.equippedStoneId === null) {
            GameStateManager.autoEquipNextAvailable(gameState);
        }
        return true;
    }

    public static removeStoneFromInventory(gameState: GameState, stoneSeed: number): boolean {
        const stoneIndex = gameState.stones.findIndex(s => s.seed === stoneSeed);
        if (stoneIndex === -1) { return false; }
        const removedStoneWasEquipped = (gameState.equippedStoneId === stoneSeed);
        gameState.stones.splice(stoneIndex, 1);
        if (removedStoneWasEquipped) {
            gameState.equippedStoneId = null;
        }
        GameStateManager.autoEquipNextAvailable(gameState);
        return true;
    }

    public static equipStone(gameState: GameState, stoneSeed: number | null | undefined): boolean {
        if (stoneSeed === null || typeof stoneSeed === 'undefined') {
             gameState.equippedStoneId = null; return true;
        }
        const stoneToEquip = gameState.getStoneById(stoneSeed);
        if (stoneToEquip) { gameState.equippedStoneId = stoneSeed; return true; }
        return false;
    }

    public static autoEquipNextAvailable(gameState: GameState): void {
        let currentEquippedStoneIsValid = false;
        if (gameState.equippedStoneId !== null) {
            if (gameState.getStoneById(gameState.equippedStoneId)) {
                currentEquippedStoneIsValid = true;
            } else { gameState.equippedStoneId = null; }
        }
        if (!currentEquippedStoneIsValid) {
            if (gameState.stones.length > 0) {
                GameStateManager.equipStone(gameState, gameState.stones[0].seed);
            }
            else { gameState.equippedStoneId = null; }
        }
    }

    public static getCurrentOpponent(gameState: GameState): StoneQualities | null {
        if (gameState.opponentQueue.length === 0 || gameState.opponents_index >= gameState.opponentQueue.length) {
            if (gameState.opponentsSeed === null) {
                const gamePrng = mulberry32(gameState.gameSeed);
                gameState.opponentsSeed = generateNewStoneSeed(gamePrng);
            }
            gameState.opponentQueue = generateNewOpponentQueue(gameState.opponentsSeed!, 100);
            gameState.opponents_index = 0;
        }
        if (gameState.opponentQueue.length === 0 || gameState.opponents_index >= gameState.opponentQueue.length) {
            return null;
        }
        return gameState.opponentQueue[gameState.opponents_index];
    }

    public static advanceOpponent(gameState: GameState): void {
        gameState.opponents_index++;
    }

    public static generateDeck(gameState: GameState): void {
        gameState.deck = getPredefinedCards();
        for (let i = gameState.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [gameState.deck[i], gameState.deck[j]] = [gameState.deck[j], gameState.deck[i]];
        }
        gameState.hand = [];
        gameState.discardPile = [];
    }

    public static drawCardsFromDeck(gameState: GameState, count: number): Card[] {
        const drawnCards: Card[] = [];
        for (let i = 0; i < count; i++) {
            if (gameState.deck.length === 0) {
                if (gameState.discardPile.length === 0) { break; }
                gameState.deck = [...gameState.discardPile];
                gameState.discardPile = [];
                for (let k = gameState.deck.length - 1; k > 0; k--) {
                    const j = Math.floor(Math.random() * (k + 1));
                    [gameState.deck[k], gameState.deck[j]] = [gameState.deck[j], gameState.deck[k]];
                }
            }
            if (gameState.deck.length > 0) {
                const card = gameState.deck.pop();
                if (card) drawnCards.push(card);
            }
        }
        return drawnCards;
    }

    public static addCardsToHand(gameState: GameState, cardsToAdd: Card[]): void {
        gameState.hand.push(...cardsToAdd);
    }

    public static removeCardFromHand(gameState: GameState, cardId: string): Card | undefined {
        const cardIndex = gameState.hand.findIndex(card => card.id === cardId);
        if (cardIndex > -1) {
            const removedCard = gameState.hand.splice(cardIndex, 1)[0];
            return removedCard;
        }
        return undefined;
    }

    public static addCardsToDiscardPile(gameState: GameState, cardsToDiscard: Card[]): void {
        gameState.discardPile.push(...cardsToDiscard);
    }

    public static updatePlayerActiveCombatEffects(gameState: GameState, newEffects: ActiveEffect[]): void {
        gameState.playerActiveCombatEffects = newEffects;
    }

    public static saveGame(gameState: GameState): boolean {
        console.log(`[GameStateManager.saveGame] Attempting to save to ${SAVE_GAME_PATH}...`);
        try {
            // Destructure to exclude non-serializable or runtime-only data
            const { opponentQueue, ...serializableCoreState } = gameState;

            // Create a serializable representation
            const stateToSave = {
                ...serializableCoreState,
                playerStats: { ...serializableCoreState.playerStats }, // Ensure plain object
                // Stones are already plain enough due to StoneQualities constructor, but ensure they are plain for JSON
                stones: serializableCoreState.stones.map(s => ({
                    seed: s.seed, color: s.color, shape: s.shape, weight: s.weight,
                    rarity: s.rarity, magic: s.magic, createdAt: s.createdAt
                })),
                // Save only card IDs for deck, hand, discardPile
                deck: serializableCoreState.deck.map(c => c.id),
                hand: serializableCoreState.hand.map(c => c.id),
                discardPile: serializableCoreState.discardPile.map(c => c.id),
                // ActiveEffects should also be plain objects
                playerActiveCombatEffects: serializableCoreState.playerActiveCombatEffects.map(e => ({ ...e })),
            };

            const gameStateJson = JSON.stringify(stateToSave, null, 2);
            fs.writeFileSync(SAVE_GAME_PATH, gameStateJson, 'utf8');
            console.log(`[GameStateManager.saveGame] Game state saved successfully to ${SAVE_GAME_PATH}.`);
            return true;
        } catch (error) {
            console.error("[GameStateManager.saveGame] Error saving game state:", error);
            return false;
        }
    }

    public static loadGame(): GameState {
        console.log("[GameStateManager.loadGame] Attempting to load game state from:", SAVE_GAME_PATH);
        try {
            if (fs.existsSync(SAVE_GAME_PATH)) {
                const savedGameStateJson = fs.readFileSync(SAVE_GAME_PATH, 'utf8');
                const loadedData = JSON.parse(savedGameStateJson) as any;
                console.log("[GameStateManager.loadGame] Successfully parsed saved data for player:", loadedData.playerStats.name);

                const reconstructedState = new GameState(loadedData.playerStats.name, loadedData.gameSeed);
                reconstructedState.currency = loadedData.currency || 0;

                if (loadedData.stones && Array.isArray(loadedData.stones)) {
                    reconstructedState.stones = loadedData.stones.map((stoneData: IStoneQualities) =>
                        new StoneQualities(stoneData) // StoneQualities constructor takes object matching its properties
                    );
                }

                reconstructedState.equippedStoneId = loadedData.equippedStoneId || null;
                reconstructedState.opponentsSeed = loadedData.opponentsSeed || null;
                reconstructedState.opponents_index = loadedData.opponents_index || 0;

                // Reconstruct Card arrays from IDs
                const allCardsMap = new Map<string, Card>(PREDEFINED_CARDS.map(c => [c.id, c]));
                const findCardById = (id: string): Card | undefined => {
                    const card = allCardsMap.get(id);
                    if (!card) console.warn(`[GameStateManager.loadGame] Card with ID '${id}' not found in PREDEFINED_CARDS.`);
                    return card;
                };

                reconstructedState.deck = (loadedData.deck || []).map((id: string) => findCardById(id)).filter(Boolean) as Card[];
                reconstructedState.hand = (loadedData.hand || []).map((id: string) => findCardById(id)).filter(Boolean) as Card[];
                reconstructedState.discardPile = (loadedData.discardPile || []).map((id: string) => findCardById(id)).filter(Boolean) as Card[];

                reconstructedState.playerActiveCombatEffects = (loadedData.playerActiveCombatEffects || []).map((effectData: any) => ({
                     ...effectData, // Assuming ActiveEffect structure is directly serializable
                })) as ActiveEffect[];

                GameStateManager.autoEquipNextAvailable(reconstructedState);

                if (reconstructedState.deck.length === 0 && reconstructedState.hand.length === 0 && reconstructedState.discardPile.length === 0) {
                    console.log("[GameStateManager.loadGame] Deck, hand, and discard are empty after load. Generating fresh deck.");
                    GameStateManager.generateDeck(reconstructedState);
                }
                console.log("[GameStateManager.loadGame] Game state reconstructed successfully.");
                return reconstructedState;
            } else {
                console.log("[GameStateManager.loadGame] No saved game file found. Creating a new game.");
                return GameState.createInitial("Player (NewFile)", Date.now() | 0);
            }
        } catch (error) {
            console.error("[GameStateManager.loadGame] Error parsing or reconstructing saved game state:", error);
            console.log("[GameStateManager.loadGame] Creating a new game due to load error.");
            return GameState.createInitial("Player (LoadErrorFile)", Date.now() | 0);
        }
    }
}
