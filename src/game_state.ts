// src/game_state.ts
import { StoneQualities, createStone, generateNewStoneSeed, mulberry32 } from './stone_mechanics';
import { Card, ActiveEffect } from './combat_interfaces';
// Removed imports for getPredefinedCards and generateNewOpponentQueue as they are now used by GameStateManager

export const LOCAL_STORAGE_KEY: string = 'stoneCrafterGameState'; // This can be specific to direct GameState saves if any, or removed if all saving is via manager

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
        this.deck = []; // Initialized empty, GameStateManager.generateDeck will populate
        this.hand = [];
        this.discardPile = [];
        this.playerActiveCombatEffects = [];
    }

    // Only getStoneById remains as an instance method for direct data access
    public getStoneById(stoneSeed: number | null | undefined): StoneQualities | undefined {
        if (stoneSeed === null || typeof stoneSeed === 'undefined') return undefined;
        return this.stones.find(s => s.seed === stoneSeed);
    }

    public static createInitial(playerName: string, masterSeed: number): GameState {
        const setupPrng = mulberry32(masterSeed);
        const sessionGameSeed = setupPrng();
        const newGameState = new GameState(playerName, sessionGameSeed);

        newGameState.opponentsSeed = generateNewStoneSeed(setupPrng);

        const firstStoneSeed = generateNewStoneSeed(setupPrng);
        const initialStone = createStone(firstStoneSeed);
        // Direct manipulation for initialization is fine here
        newGameState.stones.push(initialStone);
        newGameState.equippedStoneId = initialStone.seed;

        // Deck, hand, discard are initialized empty by constructor.
        // The caller of createInitial (e.g., main.ts or game setup logic)
        // will be responsible for calling GameStateManager.generateDeck(newGameState).
        return newGameState;
    }
}

// Global saveGame and loadGame functions are removed from this file.
// They are now static methods in GameStateManager.
