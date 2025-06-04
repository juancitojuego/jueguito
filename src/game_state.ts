// src/game_state.ts
import { StoneQualities, createStone, generateNewStoneSeed, mulberry32 } from './stone_mechanics';
import { generateNewOpponentQueue } from './opponent_system';
import { Card, ActiveEffect } from './combat_interfaces';
import { getPredefinedCards } from './config/cards';

export const LOCAL_STORAGE_KEY: string = 'stoneCrafterGameState';

export class PlayerStats {
    public name: string;
    constructor(name: string) {
        this.name = name;
    }
}

export class GameState {
    public gameSeed: number;
    public playerStats: PlayerStats;
    public currency: number;
    public stones: StoneQualities[];
    public equippedStoneId: number | null;
    public opponentsSeed: number | null;
    public opponents_index: number;
    public opponentQueue: StoneQualities[];
    public deck: Card[];
    public hand: Card[];
    public discardPile: Card[];
    public playerActiveCombatEffects: ActiveEffect[];

    constructor(playerName: string, initialGameSeedInput: number) {
        this.gameSeed = initialGameSeedInput;
        this.playerStats = new PlayerStats(playerName);
        this.currency = 0;
        this.stones = [];
        this.equippedStoneId = null;
        this.opponentsSeed = null;
        this.opponents_index = 0;
        this.opponentQueue = [];
        this.deck = [];
        this.hand = [];
        this.discardPile = [];
        this.playerActiveCombatEffects = [];
    }

    public addStoneToInventory(stoneInstance: StoneQualities): boolean {
        if (!(stoneInstance instanceof StoneQualities)) { return false; }
        if (this.stones.some(s => s.seed === stoneInstance.seed)) { return false; }
        this.stones.push(stoneInstance);
        this.stones.sort((a, b) => a.createdAt - b.createdAt);
        if (this.equippedStoneId === null) { this.autoEquipNextAvailable(); }
        return true;
    }

    public removeStoneFromInventory(stoneSeed: number): boolean {
        const stoneIndex = this.stones.findIndex(s => s.seed === stoneSeed);
        if (stoneIndex === -1) { return false; }
        const removedStoneWasEquipped = (this.equippedStoneId === stoneSeed);
        this.stones.splice(stoneIndex, 1);
        if (removedStoneWasEquipped) { this.equippedStoneId = null; }
        this.autoEquipNextAvailable();
        return true;
    }

    public getStoneById(stoneSeed: number | null | undefined): StoneQualities | undefined {
        if (stoneSeed === null || typeof stoneSeed === 'undefined') return undefined;
        return this.stones.find(s => s.seed === stoneSeed);
    }

    public equipStone(stoneSeed: number | null | undefined): boolean {
        if (stoneSeed === null || typeof stoneSeed === 'undefined') {
             this.equippedStoneId = null; return true;
        }
        const stoneToEquip = this.getStoneById(stoneSeed);
        if (stoneToEquip) { this.equippedStoneId = stoneSeed; return true; }
        return false;
    }

    public autoEquipNextAvailable(): void {
        let currentEquippedStoneIsValid = false;
        if (this.equippedStoneId !== null) {
            if (this.getStoneById(this.equippedStoneId)) {
                currentEquippedStoneIsValid = true;
            } else { this.equippedStoneId = null; }
        }
        if (!currentEquippedStoneIsValid) {
            if (this.stones.length > 0) { this.equipStone(this.stones[0].seed); }
            else { this.equippedStoneId = null; }
        }
    }

    public getCurrentOpponent(): StoneQualities | null {
        if (this.opponentQueue.length === 0 || this.opponents_index >= this.opponentQueue.length) {
            if (this.opponentsSeed === null) {
                const gamePrng = mulberry32(this.gameSeed);
                this.opponentsSeed = generateNewStoneSeed(gamePrng);
            }
            this.opponentQueue = generateNewOpponentQueue(this.opponentsSeed!, 100);
            this.opponents_index = 0;
        }
        if (this.opponentQueue.length === 0 || this.opponents_index >= this.opponentQueue.length) {
            return null;
        }
        return this.opponentQueue[this.opponents_index];
    }

    public advanceOpponent(): void {
        this.opponents_index++;
    }

    public generateDeck(): void {
        this.deck = getPredefinedCards();
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
        this.hand = [];
        this.discardPile = [];
    }

    public drawCardsFromDeck(count: number): Card[] {
        const drawnCards: Card[] = [];
        for (let i = 0; i < count; i++) {
            if (this.deck.length === 0) {
                if (this.discardPile.length === 0) { break; }
                this.deck = [...this.discardPile];
                this.discardPile = [];
                for (let k = this.deck.length - 1; k > 0; k--) {
                    const j = Math.floor(Math.random() * (k + 1));
                    [this.deck[k], this.deck[j]] = [this.deck[j], this.deck[k]];
                }
            }
            if (this.deck.length > 0) {
                const card = this.deck.pop();
                if (card) drawnCards.push(card);
            }
        }
        return drawnCards;
    }

    public updateCurrency(amount: number): void {
        this.currency += amount;
        if (this.currency < 0) {
            this.currency = 0;
        }
    }

    public addCardsToHand(cardsToAdd: Card[]): void {
        this.hand.push(...cardsToAdd);
    }

    public addCardsToDiscardPile(cardsToDiscard: Card[]): void {
        this.discardPile.push(...cardsToDiscard);
    }

    public updatePlayerActiveCombatEffects(newEffects: ActiveEffect[]): void {
        this.playerActiveCombatEffects = newEffects;
    }

    public removeCardFromHand(cardId: string): Card | undefined {
        const cardIndex = this.hand.findIndex(card => card.id === cardId);
        if (cardIndex > -1) {
            const removedCard = this.hand.splice(cardIndex, 1)[0];
            return removedCard;
        }
        return undefined;
    }

    public static createInitial(playerName: string, masterSeed: number): GameState {
        const setupPrng = mulberry32(masterSeed);
        const sessionGameSeed = setupPrng();
        const newGameState = new GameState(playerName, sessionGameSeed);
        newGameState.opponentsSeed = generateNewStoneSeed(setupPrng);
        const firstStoneSeed = generateNewStoneSeed(setupPrng);
        const initialStone = createStone(firstStoneSeed);
        newGameState.addStoneToInventory(initialStone);
        newGameState.generateDeck();
        return newGameState;
    }
}

export function saveGame(gameStateInstance: GameState): boolean {
    console.log(`[SaveGame] Player: ${gameStateInstance.playerStats.name}. Attempting to save...`);
    try {
        const { opponentQueue, ...dataToSave } = gameStateInstance;
        const gameStateJson = JSON.stringify(dataToSave);
        console.log(`[SaveGame] Placeholder: Game state would be saved (e.g., to localStorage with key '${LOCAL_STORAGE_KEY}').`);
        return true;
    } catch (error) {
        return false;
    }
}

export function loadGame(): GameState {
    console.log("[LoadGame] Attempting to load game state from key:", LOCAL_STORAGE_KEY);
    const savedGameStateJson: string | null = null;
    console.log("[LoadGame] Placeholder: Game state would be loaded.");

    if (savedGameStateJson) {
        try {
            const loadedData = JSON.parse(savedGameStateJson) as any;
            console.log("[LoadGame] Successfully parsed saved data. Player:", loadedData.playerStats.name);

            const reconstructedState = new GameState(loadedData.playerStats.name, loadedData.gameSeed);
            reconstructedState.currency = loadedData.currency || 0;

            if (loadedData.stones && Array.isArray(loadedData.stones)) {
                reconstructedState.stones = loadedData.stones.map((stoneData: any) => {
                    return new StoneQualities(stoneData);
                });
            } else {
                reconstructedState.stones = [];
            }

            reconstructedState.equippedStoneId = loadedData.equippedStoneId || null;
            reconstructedState.opponentsSeed = loadedData.opponentsSeed || null;
            reconstructedState.opponents_index = loadedData.opponents_index || 0;

            reconstructedState.deck = loadedData.deck || [];
            reconstructedState.hand = loadedData.hand || [];
            reconstructedState.discardPile = loadedData.discardPile || [];
            reconstructedState.playerActiveCombatEffects = loadedData.playerActiveCombatEffects || [];

            console.log("[LoadGame] Game state reconstructed. Player:", reconstructedState.playerStats.name);
            reconstructedState.autoEquipNextAvailable();
            return reconstructedState;

        } catch (error) {
            console.error("[LoadGame] Error parsing or reconstructing saved game state:", error);
            console.log("[LoadGame] Creating a new game due to load error.");
            return GameState.createInitial("Player (LoadFail)", Date.now() | 0);
        }
    } else {
        console.log("[LoadGame] No saved game found. Creating a new game.");
        return GameState.createInitial("Player (New)", Date.now() | 0);
    }
}
