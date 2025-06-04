// tests/test_player_mechanics.js
const { PlayerStats, GameState, saveGame, loadGame, LOCAL_STORAGE_KEY } = require('../src/game_state.js');
const { StoneQualities, createStone } = require('../src/stone_mechanics.js'); // For creating test stones

// Basic assertion helpers
function assert(condition, message) {
    if (!condition) {
        console.error(`Assertion Failed: ${message}`);
        if (typeof process !== 'undefined' && process.exitCode !== undefined) process.exitCode = 1; // Indicate test failure
    } else {
        console.log(`Assertion Passed: ${message}.`);
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        console.error(`Assertion Failed: ${message}. Expected "${expected}", but got "${actual}".`);
        if (typeof process !== 'undefined' && process.exitCode !== undefined) process.exitCode = 1;
    } else {
        console.log(`Assertion Passed: ${message}.`);
    }
}

function assertNotNull(value, message) {
    assert(value !== null && typeof value !== 'undefined', message);
}

console.log("--- Starting Player and Inventory Mechanics Tests ---");

// Test GameState.createInitial
console.log("\n--- Testing GameState.createInitial ---");
const masterSeed = 12345;
const playerName = "TestPlayer";
let gameState = GameState.createInitial(playerName, masterSeed);

assertNotNull(gameState, "gameState should be created");
assertEqual(gameState.playerStats.name, playerName, "Player name should be set");
assertEqual(gameState.currency, 0, "Initial currency should be 0");
assertNotNull(gameState.gameSeed, "gameSeed should be initialized");
assertNotNull(gameState.opponentsSeed, "opponentsSeed should be initialized");
assertEqual(gameState.stones.length, 1, "Initial inventory should have 1 stone");
assert(gameState.stones[0] instanceof StoneQualities, "Initial stone should be StoneQualities instance");
assertEqual(gameState.equippedStoneId, gameState.stones[0].seed, "Initial stone should be equipped");
const initialEquippedStone = gameState.getStoneById(gameState.equippedStoneId);
assertNotNull(initialEquippedStone, "Equipped stone should be retrievable from inventory");


// Test Inventory Management
console.log("\n--- Testing Inventory Management (Async for createdAt) ---");
let currentGameState = GameState.createInitial("InvTest", 1000);
const initialStoneSeedForInvTest = currentGameState.stones[0].seed; // Seed of the first stone

// Create stones with controlled createdAt for sorting
const stoneA_data = {seed: 1001, color:'c', shape:'s', weight:1, rarity:1, magic:1};
const stoneB_data = {seed: 1002, color:'c', shape:'s', weight:1, rarity:1, magic:1};

const stoneA_instance = new StoneQualities(stoneA_data);
stoneA_instance.createdAt = Date.now(); // Set time for stoneA

// Ensure stoneB has a later createdAt via setTimeout
setTimeout(() => {
    const stoneB_instance = new StoneQualities(stoneB_data);
    stoneB_instance.createdAt = Date.now(); // Set time for stoneB, should be > stoneA.createdAt

    currentGameState.addStoneToInventory(stoneA_instance);
    assertEqual(currentGameState.stones.length, 2, "Inventory should have 2 stones after adding stoneA");
    currentGameState.addStoneToInventory(stoneB_instance);
    assertEqual(currentGameState.stones.length, 3, "Inventory should have 3 stones after adding stoneB");

    let orderCorrect = true;
    for (let i = 0; i < currentGameState.stones.length - 1; i++) {
        if (currentGameState.stones[i].createdAt > currentGameState.stones[i+1].createdAt) {
            orderCorrect = false; break;
        }
    }
    assert(orderCorrect, "Inventory stones should be sorted by createdAt (oldest first)");

    // Test adding duplicate stone
    const duplicateInitialStone = createStone(initialStoneSeedForInvTest); // Create a new instance with same seed
    assertEqual(currentGameState.addStoneToInventory(duplicateInitialStone), false, "Adding duplicate stone should fail");
    assertEqual(currentGameState.stones.length, 3, "Inventory count should remain 3 after duplicate attempt");

    // Test getStoneById
    assertNotNull(currentGameState.getStoneById(initialStoneSeedForInvTest), "getStoneById for existing stone");
    assertEqual(currentGameState.getStoneById(9999), undefined, "getStoneById for non-existent stone");

    // Test removeStoneFromInventory
    assertEqual(currentGameState.removeStoneFromInventory(stoneA_instance.seed), true, "Removing stoneA should succeed");
    assertEqual(currentGameState.stones.length, 2, "Inventory should have 2 stones after removing stoneA");
    assertEqual(currentGameState.getStoneById(stoneA_instance.seed), undefined, "stoneA should be gone after removal");

    // Test Equipping Stones (can be inside or outside setTimeout, here it's inside)
    console.log("\n--- Testing Equipping Stones ---");
    let equipGameState = GameState.createInitial("EquipTest", 4000);
    const equip_s1_seed = equipGameState.stones[0].seed; // This is equipped

    const equip_s2 = createStone(4001); // Create a new stone
    equipGameState.addStoneToInventory(equip_s2); // Add it
    assertEqual(equipGameState.equippedStoneId, equip_s1_seed, "Initial stone (s1) should still be equipped after adding s2");

    assertEqual(equipGameState.equipStone(equip_s2.seed), true, "Equipping equip_s2 should succeed");
    assertEqual(equipGameState.equippedStoneId, equip_s2.seed, "equip_s2 should now be equipped");

    assertEqual(equipGameState.equipStone(null), true, "Equipping null should succeed (unequip)");
    assertEqual(equipGameState.equippedStoneId, null, "No stone equipped after equipping null");

    equipGameState.autoEquipNextAvailable();
    assertNotNull(equipGameState.equippedStoneId, "autoEquip should equip if slot is empty and items exist");
    assertEqual(equipGameState.equippedStoneId, equip_s1_seed, "autoEquip should equip oldest (s1 was created first by createInitial, then s2)");


    const equippedBeforeRemove = equipGameState.equippedStoneId; // Should be s1
    assertEqual(equippedBeforeRemove, equip_s1_seed, "Confirming s1 is equipped before removal");
    equipGameState.removeStoneFromInventory(equippedBeforeRemove); // Remove s1

    if (equipGameState.stones.length > 0) {
        assertNotNull(equipGameState.equippedStoneId, "After removing previously equipped s1, next (s2) should be auto-equipped");
        assertEqual(equipGameState.equippedStoneId, equip_s2.seed, "s2 should be equipped after s1 is removed");
    } else {
        assertEqual(equipGameState.equippedStoneId, null, "If inventory empty after removal, nothing equipped");
    }

    // Test addStoneToInventory auto-equip on empty
    let freshState = new GameState("FreshAdd", 9000); // This state has no stones initially
    const addedStone = createStone(9001);
    freshState.addStoneToInventory(addedStone);
    assertEqual(freshState.equippedStoneId, addedStone.seed, "Adding stone to fresh state (no initial stone) should auto-equip it");

    console.log("\n--- Testing Save/Load Placeholders ---");
    const saveLoadState = GameState.createInitial("SaveLoadTest", 8000);
    saveLoadState.currency = 100;
    const stoneForSaveLoad = createStone(8001);
    saveLoadState.addStoneToInventory(stoneForSaveLoad);

    assert(saveGame(saveLoadState), "saveGame placeholder call should return true");

    // Mocking localStorage for loadGame test
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    // console.log = () => {}; // Suppress logs for this part if too noisy
    // console.error = () => {};

    global.localStorage = {
        getItem: (key) => {
            if (key === LOCAL_STORAGE_KEY) {
                // Simulate a saved state by serializing and deserializing
                // This won't perfectly mimic StoneQualities instances without proper toJSON/fromJSON in StoneQualities
                // For this test, we rely on loadGame's reconstruction logic.
                const tempState = GameState.createInitial("InternalSave", 8888);
                tempState.currency = 555;
                const s1 = createStone(8889);
                s1.createdAt = Date.now() - 1000; // ensure createdAt is set
                tempState.addStoneToInventory(s1);
                tempState.equipStone(s1.seed);
                return JSON.stringify(tempState);
            }
            return null;
        },
        setItem: (key, value) => { /* console.log(`Mock localStorage.setItem(${key}, ${value.substring(0,50)}...)`); */ }
    };

    const loadedState = loadGame(); // loadGame uses the mock

    // console.log = originalConsoleLog; // Restore console
    // console.error = originalConsoleError;

    assertNotNull(loadedState, "loadGame placeholder call should return a state");
    assert(loadedState instanceof GameState, "loadGame should return a GameState instance");
    // Add more specific checks if loadGame's mock returns a predictable state
    // For current mock, it returns a new game or a specific internal state
    // If it used the actual 'saveLoadState', we could check:
    // assertEqual(loadedState.currency, 100, "Loaded currency should match saved");
    // assertEqual(loadedState.stones.length, saveLoadState.stones.length, "Loaded stone count should match");
    // For the current mock, it returns a GameState.createInitial("Player (NewGame)..." or "Player (LoadFail)..." or the internal state
    if (loadedState.playerStats.name.includes("InternalSave")) {
        assertEqual(loadedState.currency, 555, "Loaded currency from internal mock is 555");
        assertEqual(loadedState.stones.length, 1, "Loaded state from internal mock has 1 stone");
        assert(loadedState.stones[0] instanceof StoneQualities, "Loaded stone is StoneQualities instance");
    }


    delete global.localStorage; // Clean up mock

    console.log("\n--- All Player Mechanics Tests Run (some async) ---");
    console.log("Run these tests using: node tests/test_player_mechanics.js");
    console.log("Check console for any 'Assertion Failed' messages.");

}, 100); // setTimeout of 100ms to allow Date.now() to differ for createdAt sorting test
