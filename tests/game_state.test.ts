// tests/game_state.test.ts
import { GameState } from '../src/game_state';
import { Card } from '../src/combat_interfaces';
// GameState.createInitial uses stone_mechanics, but we don't need to directly import them here
// unless we are creating stones manually for these specific tests.

describe('GameState Card Management', () => {
    let gameState: GameState;
    const sampleCard1: Card = { id: 'c1', name: 'Card 1', description: 'Desc 1', type: 'Test' };
    const sampleCard2: Card = { id: 'c2', name: 'Card 2', description: 'Desc 2', type: 'Test' };
    const sampleCard3: Card = { id: 'c3', name: 'Card 3', description: 'Desc 3', type: 'Test' };

    beforeEach(() => {
        // GameState.createInitial also calls generateDeck, which initializes hand and discardPile to []
        gameState = GameState.createInitial('TestPlayer', Date.now());
    });

    describe('addCardsToHand', () => {
        it('should add a single card to an empty hand', () => {
            gameState.addCardsToHand([sampleCard1]);
            expect(gameState.hand).toEqual([sampleCard1]);
        });

        it('should add multiple cards to an empty hand', () => {
            gameState.addCardsToHand([sampleCard1, sampleCard2]);
            expect(gameState.hand).toEqual([sampleCard1, sampleCard2]);
        });

        it('should add cards to an existing hand', () => {
            gameState.addCardsToHand([sampleCard1]); // Initial card
            gameState.addCardsToHand([sampleCard2, sampleCard3]); // Add more
            expect(gameState.hand).toEqual([sampleCard1, sampleCard2, sampleCard3]);
        });

        it('should handle adding an empty array of cards to hand', () => {
            gameState.addCardsToHand([]);
            expect(gameState.hand).toEqual([]);
            gameState.addCardsToHand([sampleCard1]); // Add one
            gameState.addCardsToHand([]); // Add empty again
            expect(gameState.hand).toEqual([sampleCard1]);
        });
    });

    describe('addCardsToDiscardPile', () => {
        it('should add a single card to an empty discard pile', () => {
            gameState.addCardsToDiscardPile([sampleCard1]);
            expect(gameState.discardPile).toEqual([sampleCard1]);
        });

        it('should add multiple cards to an empty discard pile', () => {
            gameState.addCardsToDiscardPile([sampleCard1, sampleCard2]);
            expect(gameState.discardPile).toEqual([sampleCard1, sampleCard2]);
        });

        it('should add cards to an existing discard pile', () => {
            gameState.addCardsToDiscardPile([sampleCard1]); // Initial card
            gameState.addCardsToDiscardPile([sampleCard2, sampleCard3]); // Add more
            expect(gameState.discardPile).toEqual([sampleCard1, sampleCard2, sampleCard3]);
        });

        it('should handle adding an empty array of cards to discard pile', () => {
            gameState.addCardsToDiscardPile([]);
            expect(gameState.discardPile).toEqual([]);
            gameState.addCardsToDiscardPile([sampleCard1]); // Add one
            gameState.addCardsToDiscardPile([]); // Add empty again
            expect(gameState.discardPile).toEqual([sampleCard1]);
        });
    });
});
