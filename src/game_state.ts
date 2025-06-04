// src/game_state.ts
import { StoneQualities, createStone, generateNewStoneSeed, mulberry32, IStoneQualities, StonePowerInputs } from './stone_mechanics';

export const LOCAL_STORAGE_KEY: string = 'stoneCrafterGameState';

// Placeholder for Card and ActiveEffect types based on NEXT.md
export interface Card {
    id: string;
    name: string;
    type: string; // Example: BUFF_ATTACK, BUFF_DEFENSE, SPECIAL - consider enum
    description: string;
    effect: any; // Define Effect interface later
}

export interface ActiveEffect {
    id: string;
    name: string;
    description: string;
    remainingDuration: number;
    powerBoost?: number;
    defenseBoost?: number;
    healAmount?: number;
}

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
        this.deck = [];
        this.hand = [];
        this.discardPile = [];
        this.playerActiveCombatEffects = [];
    }

    public addStoneToInventory(stoneInstance: StoneQualities): boolean {
        if (!(stoneInstance instanceof StoneQualities)) {
            return false;
        }
        if (this.stones.some(s => s.seed === stoneInstance.seed)) {
            return false;
        }
        this.stones.push(stoneInstance);
        this.stones.sort((a, b) => a.createdAt - b.createdAt);
        if (this.equippedStoneId === null) {
            this.autoEquipNextAvailable();
        }
        return true;
    }

    public removeStoneFromInventory(stoneSeed: number): boolean {
        const stoneIndex = this.stones.findIndex(s => s.seed === stoneSeed);
        if (stoneIndex === -1) {
            return false;
        }
        const removedStoneWasEquipped = (this.equippedStoneId === stoneSeed);
        this.stones.splice(stoneIndex, 1);
        if (removedStoneWasEquipped) {
            this.equippedStoneId = null;
        }
        this.autoEquipNextAvailable();
        return true;
    }

    public getStoneById(stoneSeed: number | null | undefined): StoneQualities | undefined {
        if (stoneSeed === null || typeof stoneSeed === 'undefined') return undefined;
        return this.stones.find(s => s.seed === stoneSeed);
    }

    public equipStone(stoneSeed: number | null | undefined): boolean {
        if (stoneSeed === null || typeof stoneSeed === 'undefined') {
            this.equippedStoneId = null;
            return true;
        }
        const stoneToEquip = this.getStoneById(stoneSeed);
        if (stoneToEquip) {
            this.equippedStoneId = stoneSeed;
            return true;
        }
        return false;
    }

    public autoEquipNextAvailable(): void {
        let currentEquippedStoneIsValid = false;
        if (this.equippedStoneId !== null) {
            if (this.getStoneById(this.equippedStoneId)) {
                currentEquippedStoneIsValid = true;
            } else {
                this.equippedStoneId = null;
            }
        }
        if (!currentEquippedStoneIsValid) {
            if (this.stones.length > 0) {
                this.equipStone(this.stones[0].seed);
            } else {
                this.equippedStoneId = null;
            }
        }
    }

    public static createInitial(playerName: string, masterSeed: number): GameState {
        const setupPrng = mulberry32(masterSeed);
        const sessionGameSeed = setupPrng();
        const newGameState = new GameState(playerName, sessionGameSeed);
        newGameState.currency = 0;
        newGameState.opponentsSeed = generateNewStoneSeed(setupPrng);
        const firstStoneSeed = generateNewStoneSeed(setupPrng);
        const initialStone = createStone(firstStoneSeed);
        newGameState.addStoneToInventory(initialStone);
        if (newGameState.stones.length > 0) {
            newGameState.equipStone(newGameState.stones[0].seed);
        }
        // console.log(`[GameState.createInitial] New game state created for ${playerName} with master seed ${masterSeed}.`);
        // console.log(`  - Session Game Seed: ${newGameState.gameSeed}`);
        // console.log(`  - Opponents Seed: ${newGameState.opponentsSeed}`);
        // console.log(`  - Initial Stone Seed: ${initialStone.seed}`);
        return newGameState;
    }
}

export function saveGame(gameStateInstance: GameState): boolean {
    console.log(`[SaveGame] Player: ${gameStateInstance.playerStats.name}. Attempting to save...`);
    try {
        const gameStateJson = JSON.stringify(gameStateInstance);
        // console.log(`[SaveGame] Placeholder: Game state would be saved (e.g., to localStorage with key '${LOCAL_STORAGE_KEY}').`);
        // Example: global.localStorage.setItem(LOCAL_STORAGE_KEY, gameStateJson); // Use global for Node if testing outside browser
        return true;
    } catch (error) {
        // console.error("[SaveGame] Error saving game state:", error);
        return false;
    }
}

export function loadGame(): GameState { // Always returns a GameState instance
    // console.log("[LoadGame] Attempting to load game state from key:", LOCAL_STORAGE_KEY);
    // Example: const savedGameStateJson = global.localStorage.getItem(LOCAL_STORAGE_KEY);
    const savedGameStateJson: string | null = null;
    // console.log("[LoadGame] Placeholder: Game state would be loaded from storage.");

    if (savedGameStateJson) {
        try {
            const loadedData: any = JSON.parse(savedGameStateJson); // Parse as any first
            // console.log("[LoadGame] Successfully parsed saved data. Player:", loadedData.playerStats.name);

            const reconstructedState = new GameState(loadedData.playerStats.name, loadedData.gameSeed);
            reconstructedState.currency = loadedData.currency;

            reconstructedState.stones = loadedData.stones.map((stoneData: any) => {
                // Pass plain data object to constructor; constructor handles optional createdAt
                return new StoneQualities(stoneData);
            });

            reconstructedState.equippedStoneId = loadedData.equippedStoneId;
            reconstructedState.opponentsSeed = loadedData.opponentsSeed;
            reconstructedState.opponents_index = loadedData.opponents_index;
            reconstructedState.deck = loadedData.deck || [];
            reconstructedState.hand = loadedData.hand || [];
            reconstructedState.discardPile = loadedData.discardPile || [];
            reconstructedState.playerActiveCombatEffects = loadedData.playerActiveCombatEffects || [];

            // console.log("[LoadGame] Game state reconstructed. Player:", reconstructedState.playerStats.name);
            return reconstructedState;

        } catch (error) {
            // console.error("[LoadGame] Error parsing or reconstructing saved game state:", error);
            // console.log("[LoadGame] Creating a new game due to load error.");
            return GameState.createInitial("Player (LoadFail)", Date.now() | 0);
        }
    } else {
        // console.log("[LoadGame] No saved game found. Creating a new game.");
        return GameState.createInitial("Player (NewGame)", Date.now() | 0);
    }
}
