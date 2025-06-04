// tests/game_state_manager.test.ts
import { GameState } from '../src/game_state';
import { GameStateManager, SAVE_FILE_NAME } from '../src/game_state_manager'; // Corrected import
import { StoneQualities, createStone, mulberry32, generateNewStoneSeed } from '../src/stone_mechanics';
import { Card, CardType, ActiveEffect } from '../src/combat_interfaces';
import * as CardConfig from '../src/config/cards';

describe('GameStateManager', () => {
    let gameState: GameState;
    const sampleCard1: Card = { id: 'c1', name: 'Card 1', description: 'Desc 1', type: CardType.ATTACK, effect: {id:'e1', description:'', apply: (t,e)=>[...e]} };
    const sampleCard2: Card = { id: 'c2', name: 'Card 2', description: 'Desc 2', type: CardType.BUFF_ATTACK, effect: {id:'e2', description:'', apply: (t,e)=>[...e]} };
    const sampleStone1Seed = 1001;
    const sampleStone2Seed = 1002;
    let sampleStone1: StoneQualities;
    let sampleStone2: StoneQualities;


    beforeEach(() => {
        gameState = GameState.createInitial('ManagerTester', Date.now());
        // It's important that GameState.createInitial does NOT call GameStateManager.generateDeck
        // so we can test GameStateManager.generateDeck independently if needed.
        // The current GameState.createInitial is fine as it only sets up basic state.
        sampleStone1 = createStone(sampleStone1Seed);
        sampleStone2 = createStone(sampleStone2Seed);

        // Mock localStorage for save/load tests if they interact with it
        // For now, saveGame/loadGame in GameStateManager use console logs and don't hit localStorage directly.
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // Tests for methods moved from GameState to GameStateManager
    describe('Currency Management', () => {
        it('updateCurrency should add to currency', () => {
            GameStateManager.updateCurrency(gameState, 50);
            expect(gameState.currency).toBe(50);
            GameStateManager.updateCurrency(gameState, 25);
            expect(gameState.currency).toBe(75);
        });
        it('updateCurrency should not allow negative currency', () => {
            GameStateManager.updateCurrency(gameState, -50);
            expect(gameState.currency).toBe(0);
        });
    });

    describe('Inventory Management (Stones)', () => {
        it('addStoneToInventory should add a stone and sort by createdAt', () => {
            const stoneOld = new StoneQualities({seed: 1, color:'c',shape:'s',weight:1,rarity:1,magic:1, createdAt: Date.now() - 100});
            const stoneNew = new StoneQualities({seed: 2, color:'c',shape:'s',weight:1,rarity:1,magic:1, createdAt: Date.now()});
            // gameState.stones is initially 1 from createInitial
            const initialCount = gameState.stones.length;
            GameStateManager.addStoneToInventory(gameState, stoneNew);
            GameStateManager.addStoneToInventory(gameState, stoneOld); // Add older one second
            expect(gameState.stones.length).toBe(initialCount + 2);
            expect(gameState.stones[0].createdAt).toBeLessThanOrEqual(gameState.stones[1].createdAt);
            if (gameState.stones.length > 2) { // If initial stone was there
                expect(gameState.stones[1].createdAt).toBeLessThanOrEqual(gameState.stones[2].createdAt);
            }
        });
        it('removeStoneFromInventory should remove a stone', () => {
            const initialStoneSeed = gameState.stones[0].seed;
            const initialCount = gameState.stones.length;
            GameStateManager.removeStoneFromInventory(gameState, initialStoneSeed);
            expect(gameState.stones.length).toBe(initialCount - 1);
            expect(gameState.getStoneById(initialStoneSeed)).toBeUndefined();
        });
         it('equipStone should set equippedStoneId', () => {
            GameStateManager.addStoneToInventory(gameState, sampleStone1);
            GameStateManager.equipStone(gameState, sampleStone1.seed);
            expect(gameState.equippedStoneId).toBe(sampleStone1.seed);
        });
        it('autoEquipNextAvailable should equip oldest if none equipped', () => {
            gameState.stones = []; // Clear initial stone
            gameState.equippedStoneId = null;
            GameStateManager.addStoneToInventory(gameState, sampleStone2); // newest
            GameStateManager.addStoneToInventory(gameState, sampleStone1); // oldest
            GameStateManager.autoEquipNextAvailable(gameState);
            expect(gameState.equippedStoneId).toBe(sampleStone1.seed); // Oldest should be equipped
        });
    });

    describe('Opponent System Management', () => {
        it('getCurrentOpponent should generate queue if empty', () => {
            gameState.opponentQueue = []; // Ensure empty
            const opponent = GameStateManager.getCurrentOpponent(gameState);
            expect(opponent).not.toBeNull();
            expect(gameState.opponentQueue.length).toBe(100);
        });
        it('advanceOpponent should increment index', () => {
            GameStateManager.getCurrentOpponent(gameState); // Ensure queue exists
            const initialIndex = gameState.opponents_index;
            GameStateManager.advanceOpponent(gameState);
            expect(gameState.opponents_index).toBe(initialIndex + 1);
        });
    });

    describe('Card Deck/Hand/Discard Management', () => {
        it('generateDeck should populate deck, clear hand/discard', () => {
            GameStateManager.addCardsToHand(gameState, [sampleCard1]);
            GameStateManager.addCardsToDiscardPile(gameState, [sampleCard2]);
            GameStateManager.generateDeck(gameState);
            expect(gameState.deck.length).toBe(CardConfig.PREDEFINED_CARDS.length);
            expect(gameState.hand.length).toBe(0);
            expect(gameState.discardPile.length).toBe(0);
        });
        it('drawCardsFromDeck should move cards from deck', () => {
            GameStateManager.generateDeck(gameState);
            const initialDeckSize = gameState.deck.length;
            const drawn = GameStateManager.drawCardsFromDeck(gameState, 3);
            expect(drawn.length).toBe(3);
            expect(gameState.deck.length).toBe(initialDeckSize - 3);
        });
        it('addCardsToHand should add cards to hand', () => {
            GameStateManager.addCardsToHand(gameState, [sampleCard1, sampleCard2]);
            expect(gameState.hand).toEqual([sampleCard1, sampleCard2]);
        });
        it('removeCardFromHand should remove a card and return it', () => {
            GameStateManager.addCardsToHand(gameState, [sampleCard1, sampleCard2]);
            const removed = GameStateManager.removeCardFromHand(gameState, sampleCard1.id);
            expect(removed).toEqual(sampleCard1);
            expect(gameState.hand).toEqual([sampleCard2]);
            expect(GameStateManager.removeCardFromHand(gameState, 'nonexistent')).toBeUndefined();
        });
        it('addCardsToDiscardPile should add cards to discard pile', () => {
            GameStateManager.addCardsToDiscardPile(gameState, [sampleCard1, sampleCard2]);
            expect(gameState.discardPile).toEqual([sampleCard1, sampleCard2]);
        });
    });

    describe('Player Effects Management', () => {
        it('updatePlayerActiveCombatEffects should replace effects list', () => {
            const effect1: ActiveEffect = {id:'e1', name:'eff1', description:'', remainingDuration:1};
            const effect2: ActiveEffect = {id:'e2', name:'eff2', description:'', remainingDuration:2};
            GameStateManager.updatePlayerActiveCombatEffects(gameState, [effect1]);
            expect(gameState.playerActiveCombatEffects).toEqual([effect1]);
            GameStateManager.updatePlayerActiveCombatEffects(gameState, [effect2]);
            expect(gameState.playerActiveCombatEffects).toEqual([effect2]);
        });
    });

    describe('Save/Load Game', () => {
        it('saveGame should be called (mocked)', () => {
            const result = GameStateManager.saveGame(gameState);
            expect(result).toBe(true); // Placeholder returns true
            expect(GameStateManager.saveGame).toHaveBeenCalledWith(gameState);
        });

        it('loadGame should return a new GameState instance if no save exists', () => {
            const loadedState = GameStateManager.loadGame(); // Will use the "no save" path
            expect(loadedState).toBeInstanceOf(GameState);
            expect(loadedState.playerStats.name).toBe("Player (NewGame)"); // Default from loadGame
        });

        // More detailed loadGame tests would require mocking fs or localStorage
        // and providing mock saved JSON data.
    });
});
