// src/game_state.js
const { StoneQualities, createStone, generateNewStoneSeed, mulberry32 } = require('./stone_mechanics.js');

const LOCAL_STORAGE_KEY = 'stoneCrafterGameState';

class PlayerStats {
    constructor(name) {
        this.name = name;
    }
}

class GameState {
    // Constructor initializes basic structure
    constructor(playerName, initialGameSeedInput) {
        this.gameSeed = initialGameSeedInput; // This will be the seed for the main game session PRNG
        this.playerStats = new PlayerStats(playerName);
        this.currency = 0;
        this.stones = [];
        this.equippedStoneId = null;
        this.opponentsSeed = null; // Seed for opponent queue PRNG
        this.opponents_index = 0;
        this.deck = []; // Will be Card[]
        this.hand = []; // Will be Card[]
        this.discardPile = []; // Will be Card[]
        this.playerActiveCombatEffects = []; // Will be ActiveEffect[]
    }

    // Inventory Management Methods
    addStoneToInventory(stoneInstance) {
        if (!(stoneInstance instanceof StoneQualities)) {
            // console.error("addStoneToInventory: Expected StoneQualities instance", stoneInstance);
            return false;
        }
        if (this.stones.some(s => s.seed === stoneInstance.seed)) {
            // console.log(`addStoneToInventory: Stone with seed ${stoneInstance.seed} already in inventory.`);
            return false;
        }
        this.stones.push(stoneInstance);
        this.stones.sort((a, b) => a.createdAt - b.createdAt);
        if (this.equippedStoneId === null) { this.autoEquipNextAvailable(); }
        return true;
    }

    removeStoneFromInventory(stoneSeed) {
        const stoneIndex = this.stones.findIndex(s => s.seed === stoneSeed);
        if (stoneIndex === -1) {
            // console.warn(`removeStoneFromInventory: Stone with seed ${stoneSeed} not found.`);
            return false;
        }
        const removedStoneWasEquipped = (this.equippedStoneId === stoneSeed);
        this.stones.splice(stoneIndex, 1);
        if (removedStoneWasEquipped) { this.equippedStoneId = null; }
        this.autoEquipNextAvailable();
        return true;
    }

    getStoneById(stoneSeed) {
        if (stoneSeed === null || typeof stoneSeed === 'undefined') return undefined;
        return this.stones.find(s => s.seed === stoneSeed);
    }

    // Equipping Methods
    equipStone(stoneSeed) {
        if (stoneSeed === null || typeof stoneSeed === 'undefined') {
             this.equippedStoneId = null; return true;
        }
        const stoneToEquip = this.getStoneById(stoneSeed);
        if (stoneToEquip) { this.equippedStoneId = stoneSeed; return true; }
        // console.warn(`equipStone: Attempted to equip stone ${stoneSeed}, but it was not found in inventory.`);
        return false;
    }

    autoEquipNextAvailable() {
        let currentEquippedStoneIsValid = false;
        if (this.equippedStoneId !== null) {
            if (this.getStoneById(this.equippedStoneId)) {
                currentEquippedStoneIsValid = true;
            } else {
                // console.warn(`autoEquipNextAvailable: Equipped stone ${this.equippedStoneId} is no longer valid (not in inventory).`);
                this.equippedStoneId = null;
            }
        }
        if (!currentEquippedStoneIsValid) {
            if (this.stones.length > 0) {
                // Sorting is done in addStoneToInventory, so stones[0] is the oldest
                this.equipStone(this.stones[0].seed);
            } else {
                this.equippedStoneId = null;
            }
        }
    }

    // Static factory for creating a new, fully initialized game state
    // This replaces the concept of a separate `resetGameDefaults` function for now.
    static createInitial(playerName, masterSeed) {
        // Use a PRNG dedicated to setup to derive other initial seeds
        const setupPrng = mulberry32(masterSeed);

        // Derive the main gameSeed for this session's general PRNG (e.g., for new stone generation)
        const sessionGameSeed = setupPrng();

        const newGameState = new GameState(playerName, sessionGameSeed);
        newGameState.currency = 0; // Default currency

        // Derive a seed for the opponent queue generation
        newGameState.opponentsSeed = generateNewStoneSeed(setupPrng); // Use the setupPrng

        // Create and equip an initial stone
        const firstStoneSeed = generateNewStoneSeed(setupPrng); // Use the setupPrng again
        const initialStone = createStone(firstStoneSeed);

        // Add to inventory (which also sorts and calls autoEquipNextAvailable if needed)
        newGameState.addStoneToInventory(initialStone);
        // Ensure it's equipped, autoEquip might not run if addStoneToInventory doesn't see equippedStoneId as null
        // or if other logic changes. Direct equip after add is safer for initial setup.
        if (newGameState.stones.length > 0) { // Check if stone was actually added
             newGameState.equipStone(newGameState.stones[0].seed);
        }


        // Placeholder for generating a fresh deck of cards
        // newGameState.deck = generateNewDeck();
        // newGameState.hand = [];
        // newGameState.discardPile = [];

        // Placeholder for generating a new opponent queue
        // newGameState.opponentQueue = generateNewOpponentQueue(newGameState.opponentsSeed);
        // newGameState.opponents_index = 0;

        console.log(`[GameState.createInitial] New game state created for ${playerName} with master seed ${masterSeed}.`);
        console.log(`  - Session Game Seed: ${newGameState.gameSeed}`);
        console.log(`  - Opponents Seed: ${newGameState.opponentsSeed}`);
        console.log(`  - Initial Stone Seed: ${initialStone.seed}`);

        return newGameState;
    }
}

// Placeholder save function
function saveGame(gameStateInstance) {
    console.log(`[SaveGame] Player: ${gameStateInstance.playerStats.name}. Attempting to save...`);
    try {
        // For StoneQualities, we need to ensure they are plain objects for JSON stringify
        // or implement a toJSON method in StoneQualities class if it becomes complex.
        // Assuming StoneQualities instances are already serializable as plain objects.
        const gameStateJson = JSON.stringify(gameStateInstance);
        // console.log(`[SaveGame] Serialized State (first 200 chars): ${gameStateJson.substring(0, 200)}...`);
        console.log(`[SaveGame] Placeholder: Game state would be saved (e.g., to localStorage with key '${LOCAL_STORAGE_KEY}').`);
        // Example: localStorage.setItem(LOCAL_STORAGE_KEY, gameStateJson);
        return true;
    } catch (error) {
        console.error("[SaveGame] Error saving game state:", error);
        return false;
    }
}

// Placeholder load function
function loadGame() {
    console.log("[LoadGame] Attempting to load game state from key:", LOCAL_STORAGE_KEY);
    // Example: const savedGameStateJson = localStorage.getItem(LOCAL_STORAGE_KEY);
    const savedGameStateJson = null; // Simulate no saved game for now
    console.log("[LoadGame] Placeholder: Game state would be loaded from storage.");

    if (savedGameStateJson) {
        try {
            const loadedData = JSON.parse(savedGameStateJson);
            console.log("[LoadGame] Successfully parsed saved data. Player:", loadedData.playerStats.name);

            // Reconstruct GameState instance
            const reconstructedState = new GameState(loadedData.playerStats.name, loadedData.gameSeed);

            // Restore properties
            reconstructedState.currency = loadedData.currency;

            // Reconstruct StoneQualities instances
            reconstructedState.stones = loadedData.stones.map(stoneData => {
                // Create a new StoneQualities instance and assign properties
                // This ensures methods like .name getter are available.
                const sq = new StoneQualities({
                    seed: stoneData.seed,
                    color: stoneData.color,
                    shape: stoneData.shape,
                    weight: stoneData.weight,
                    rarity: stoneData.rarity,
                    magic: stoneData.magic
                });
                sq.createdAt = stoneData.createdAt; // Preserve original createdAt
                return sq;
            });

            reconstructedState.equippedStoneId = loadedData.equippedStoneId;
            reconstructedState.opponentsSeed = loadedData.opponentsSeed;
            reconstructedState.opponents_index = loadedData.opponents_index;

            // Restore card game state (ensure defaults if not present in old save)
            reconstructedState.deck = loadedData.deck || [];
            reconstructedState.hand = loadedData.hand || [];
            reconstructedState.discardPile = loadedData.discardPile || [];
            reconstructedState.playerActiveCombatEffects = loadedData.playerActiveCombatEffects || [];

            console.log("[LoadGame] Game state reconstructed. Player:", reconstructedState.playerStats.name);
            // Further re-initialization might be needed here:
            // - Re-initialize main PRNG service with reconstructedState.gameSeed
            // - Re-initialize opponent queue PRNG with reconstructedState.opponentsSeed
            // - Regenerate opponent queue using reconstructedState.opponentsSeed
            // - Restore deck/hand/discard or generate new deck if empty
            return reconstructedState;

        } catch (error) {
            console.error("[LoadGame] Error parsing or reconstructing saved game state:", error);
            console.log("[LoadGame] Creating a new game due to load error.");
            // Fallback to new game state, using a timestamp as master seed
            return GameState.createInitial("Player (LoadFail)", Date.now() | 0);
        }
    } else {
        console.log("[LoadGame] No saved game found. Creating a new game.");
        // Fallback to new game state, using a timestamp as master seed
        return GameState.createInitial("Player (NewGame)", Date.now() | 0);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PlayerStats,
        GameState,
        LOCAL_STORAGE_KEY,
        saveGame,
        loadGame
    };
}
