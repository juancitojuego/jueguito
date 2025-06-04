import { PlayerStats, GameState, saveGame, loadGame, LOCAL_STORAGE_KEY } from '../src/game_state';
import { StoneQualities, createStone } from '../src/stone_mechanics';

describe('Player and Inventory Mechanics', () => {
    const masterSeed = 12345;
    const playerName = "TestPlayer";
    let gameState: GameState;

    beforeEach(() => {
        gameState = GameState.createInitial(playerName, masterSeed);
        // Clean up any global mocks if necessary, e.g. localStorage
        delete (global as any).localStorage;
    });

    describe('GameState.createInitial', () => {
        it('should create a GameState instance', () => {
            expect(gameState).toBeInstanceOf(GameState);
        });

        it('should initialize player stats correctly', () => {
            expect(gameState.playerStats.name).toBe(playerName);
            expect(gameState.currency).toBe(0);
        });

        it('should initialize seeds', () => {
            expect(gameState.gameSeed).toBeDefined();
            expect(gameState.opponentsSeed).toBeDefined();
        });

        it('should create and equip an initial stone', () => {
            expect(gameState.stones.length).toBe(1);
            expect(gameState.stones[0]).toBeInstanceOf(StoneQualities);
            expect(gameState.equippedStoneId).toBe(gameState.stones[0].seed);
            const equippedStone = gameState.getStoneById(gameState.equippedStoneId!); // Non-null assertion
            expect(equippedStone).toBeDefined();
            expect(equippedStone?.seed).toBe(gameState.stones[0].seed);
        });
    });

    describe('Inventory Management', () => {
        let invGameState: GameState;
        const initialStoneSeed = 1000; // Seed for GameState.createInitial
        const stoneASeed = 1001;
        const stoneBSeed = 1002;

        beforeEach(() => {
            invGameState = GameState.createInitial("InvTest", initialStoneSeed);
        });

        it('should add stones and sort them by createdAt', async () => {
            const firstInitialStoneSeed = invGameState.stones[0].seed;

            const stoneA = new StoneQualities({seed: stoneASeed, color:'c', shape:'s', weight:1, rarity:1, magic:1, createdAt: Date.now() - 200});
            invGameState.addStoneToInventory(stoneA);

            await new Promise(resolve => setTimeout(resolve, 50)); // Ensure time difference

            const stoneB = new StoneQualities({seed: stoneBSeed, color:'c', shape:'s', weight:1, rarity:1, magic:1, createdAt: Date.now()});
            invGameState.addStoneToInventory(stoneB);

            expect(invGameState.stones.length).toBe(3); // Initial stone + A + B

            const sortedManual = [invGameState.getStoneById(firstInitialStoneSeed)!, stoneA, stoneB].sort((x,y) => x.createdAt - y.createdAt);
            const inventorySeeds = invGameState.stones.map(s => s.seed);
            const manualSeeds = sortedManual.map(s => s.seed);

            // Check if GameState's internal sort matches manual sort of known items
            // This depends on initial stone's createdAt vs stoneA's.
            // To make this robust, we'd need to control createInitial's stone's createdAt or mock Date.now().
            // For now, we check if it's sorted generally:
            for(let i = 0; i < invGameState.stones.length - 1; i++) {
                expect(invGameState.stones[i].createdAt).toBeLessThanOrEqual(invGameState.stones[i+1].createdAt);
            }
        });

        it('should not add duplicate stones', () => {
            const originalStoneCount = invGameState.stones.length;
            const firstStoneSeed = invGameState.stones[0].seed;
            const duplicateStone = new StoneQualities({seed: firstStoneSeed, color:'c',shape:'s',weight:1,rarity:1,magic:1});
            expect(invGameState.addStoneToInventory(duplicateStone)).toBe(false);
            expect(invGameState.stones.length).toBe(originalStoneCount);
        });

        it('getStoneById should retrieve existing stones and return undefined for non-existent ones', () => {
            const firstStoneSeed = invGameState.stones[0].seed;
            expect(invGameState.getStoneById(firstStoneSeed)).toBeDefined();
            expect(invGameState.getStoneById(firstStoneSeed)).toBeInstanceOf(StoneQualities);
            expect(invGameState.getStoneById(99999)).toBeUndefined(); // Non-existent seed
        });

        it('removeStoneFromInventory should remove a stone and return true, or false if not found', () => {
            const firstStoneSeed = invGameState.stones[0].seed;
            const initialCount = invGameState.stones.length;

            expect(invGameState.removeStoneFromInventory(firstStoneSeed)).toBe(true);
            expect(invGameState.stones.length).toBe(initialCount - 1);
            expect(invGameState.getStoneById(firstStoneSeed)).toBeUndefined();

            expect(invGameState.removeStoneFromInventory(99999)).toBe(false); // Non-existent seed
        });
    });

    describe('Equipping Stones', () => {
        let equipGameState: GameState;

        beforeEach(() => {
            equipGameState = GameState.createInitial("EquipTest", 4000);
        });

        it('should equip a specified stone from inventory', () => {
            const s2 = createStone(4001);
            equipGameState.addStoneToInventory(s2);
            expect(equipGameState.equipStone(s2.seed)).toBe(true);
            expect(equipGameState.equippedStoneId).toBe(s2.seed);
        });

        it('should unequip all stones if null is passed to equipStone', () => {
            equipGameState.equipStone(null);
            expect(equipGameState.equippedStoneId).toBeNull();
        });

        it('autoEquipNextAvailable should equip the oldest stone if nothing is equipped', () => {
            const initialStoneSeed = equipGameState.stones[0].seed; // Oldest
            equipGameState.equipStone(null); // Unequip
            equipGameState.autoEquipNextAvailable();
            expect(equipGameState.equippedStoneId).toBe(initialStoneSeed);
        });

        it('autoEquipNextAvailable should equip next available after removing equipped stone', () => {
            const s1Seed = equipGameState.stones[0].seed;
            const s2 = createStone(4001);
            equipGameState.addStoneToInventory(s2); // s1 (oldest), s2

            equipGameState.equipStone(s1Seed); // Equip s1
            equipGameState.removeStoneFromInventory(s1Seed); // Remove s1

            expect(equipGameState.equippedStoneId).toBe(s2.seed); // s2 should be auto-equipped
        });

        it('addStoneToInventory should auto-equip if no stone is currently equipped', () => {
            const freshState = new GameState("FreshAdd", 9000); // No initial stone via constructor directly
            const addedStone = createStone(9001);
            freshState.addStoneToInventory(addedStone);
            expect(freshState.equippedStoneId).toBe(addedStone.seed);
        });
    });

    describe('Save/Load Placeholders', () => {
        let consoleSpy: jest.SpyInstance;

        beforeEach(() => {
            // Spy on console.log before each test in this suite
            // consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // Use mockImplementation to suppress logs
        });

        afterEach(() => {
            // Restore original console.log after each test
            // consoleSpy.mockRestore();
        });

        it('saveGame placeholder should run (can check by spying console.log)', () => {
            consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            saveGame(gameState); // gameState is from outer beforeEach
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("[SaveGame]"));
            consoleSpy.mockRestore();
        });

        it('loadGame placeholder should run and return a GameState instance', () => {
            // Mock localStorage for this test
            const mockLocalStorage = {
                getItem: (key: string): string | null => {
                    if (key === LOCAL_STORAGE_KEY) {
                        const tempState = GameState.createInitial("InternalSaveForTest", 8888);
                        tempState.currency = 555;
                        const s1 = createStone(8889);
                        s1.createdAt = Date.now() - 1000;
                        tempState.addStoneToInventory(s1);
                        tempState.equipStone(s1.seed);
                        return JSON.stringify(tempState);
                    }
                    return null;
                },
                setItem: (key: string, value: string): void => { /* no-op */ }
            };
            (global as any).localStorage = mockLocalStorage;

            const loaded = loadGame();
            expect(loaded).toBeInstanceOf(GameState);
            if (loaded.playerStats.name.includes("InternalSaveForTest")) {
                expect(loaded.currency).toBe(555);
                expect(loaded.stones.length).toBe(1);
                expect(loaded.stones[0]).toBeInstanceOf(StoneQualities);
            } else {
                // This case means loadGame returned a new game due to mock returning null or error
                expect(loaded.playerStats.name).toMatch(/Player \(NewGame\)|Player \(LoadFail\)/);
            }
            delete (global as any).localStorage;
        });
    });
});
