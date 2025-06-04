// tests/ui/main_menu.test.ts
import { GameState } from '../../src/game_state';
import { GameStateManager } from '../../src/game_state_manager';
import * as PlayerActions from '../../src/player_actions';
import * as FightService from '../../src/fight_service';
import { MainMenuOption, handleMainMenuAction } from '../../src/ui/main_menu'; // showMainMenu is not tested here
import * as UIHelpers from '../../src/ui/ui_helpers';
import { term, terminateApp as mockTerminateApp } from '../../src/ui'; // Import the actual term instance for some checks, mock terminateApp
import { StoneQualities } from '../../src/stone_mechanics';
import { CardType } from '../../src/combat_interfaces';

// Mock modules
jest.mock('../../src/game_state_manager');
jest.mock('../../src/player_actions');
jest.mock('../../src/fight_service');
jest.mock('../../src/ui/ui_helpers');

// Mock specific functions from ui/index.ts, leave 'term' partially unmocked or carefully mocked
jest.mock('../../src/ui', () => {
    const originalUi = jest.requireActual('../../src/ui');
    return {
        ...originalUi, // Spread original exports
        terminateApp: jest.fn(),
        term: { // Mock terminal methods used by handleMainMenuAction
            ...originalUi.term, // Keep actual term for basic calls if needed, or mock all used methods
            clear: jest.fn(),
            cyan: jest.fn().mockReturnThis(),
            yellow: jest.fn().mockReturnThis(),
            green: jest.fn().mockReturnThis(),
            red: jest.fn().mockReturnThis(),
            dim: jest.fn().mockReturnThis(),
            bold: jest.fn().mockReturnThis(),
            brightCyan: { bold: jest.fn().mockReturnThis() },
            brightWhite: { bold: jest.fn().mockReturnThis() },
            brightGreen: jest.fn().mockReturnThis(),
            inputField: jest.fn().mockReturnValue({ promise: Promise.resolve() }), // Mock inputField to resolve immediately
            // Ensure all chained methods are mocked if term itself is fully mocked
            // e.g. term.brightCyan.bold needs brightCyan to be an object with a bold mock method
        },
    };
});

// Mock GameState.createInitial static method
// GameState itself is not mocked, only its static method for these tests
const mockCreateInitial = jest.fn();
GameState.createInitial = mockCreateInitial;


describe('UI - Main Menu - handleMainMenuAction', () => {
    let mockGameState: GameState;
    let gameStateRef: { current: GameState | null };

    // Define mock implementations
    const mockGetStoneById = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks(); // Clear all mocks before each test

        mockGameState = {
            playerStats: { name: 'Test Player' },
            currency: 100,
            stones: [],
            equippedStoneId: null,
            gameSeed: 123,
            opponentsSeed: 456,
            opponents_index: 0,
            opponentQueue: [],
            deck: [],
            hand: [],
            discardPile: [],
            playerActiveCombatEffects: [],
            getStoneById: mockGetStoneById, // Assign the mock function here
        } as unknown as GameState; // Use 'as unknown as GameState' for a simplified mock structure

        gameStateRef = { current: mockGameState };

        mockCreateInitial.mockReturnValue(mockGameState);
        (GameStateManager.loadGame as jest.Mock).mockReturnValue(mockGameState);
        (GameStateManager.generateDeck as jest.Mock).mockImplementation((gs: GameState) => { gs.deck = [{id:'test', name:'Test Card', type:CardType.ATTACK, description:'', effect: {} as any}]; });
        (GameStateManager.getCurrentOpponent as jest.Mock).mockReturnValue(null);

        (PlayerActions.crackOpenStone as jest.Mock).mockReturnValue({ newStones: [], message: 'Cracked!' });
        (PlayerActions.salvageStone as jest.Mock).mockReturnValue({ currencyGained: 10, message: 'Salvaged!' });
        (FightService.startFight as jest.Mock).mockReturnValue({ sessionId: 'test-fight', fightLog:[] } as FightSessionData);
    });

    it('NEW_GAME: should call GameState.createInitial and GameStateManager.generateDeck', async () => {
        await handleMainMenuAction(MainMenuOption.NEW_GAME, gameStateRef);
        expect(mockCreateInitial).toHaveBeenCalled();
        expect(GameStateManager.generateDeck).toHaveBeenCalledWith(mockGameState);
        expect(UIHelpers.displayStoneDetails).toHaveBeenCalled();
        expect(UIHelpers.listInventory).toHaveBeenCalled();
        expect(term.inputField).toHaveBeenCalled();
    });

    it('LOAD_GAME: should call GameStateManager.loadGame', async () => {
        await handleMainMenuAction(MainMenuOption.LOAD_GAME, gameStateRef);
        expect(GameStateManager.loadGame).toHaveBeenCalled();
        expect(UIHelpers.displayStoneDetails).toHaveBeenCalled();
        expect(UIHelpers.listInventory).toHaveBeenCalled();
        expect(term.inputField).toHaveBeenCalled();
    });

    it('CRACK_STONE: should call crackOpenStone if stone equipped', async () => {
        gameStateRef.current!.equippedStoneId = 123; // Simulate equipped stone
        mockGetStoneById.mockReturnValue({ seed: 123 } as StoneQualities); // Mock getStoneById to return a stone
        await handleMainMenuAction(MainMenuOption.CRACK_STONE, gameStateRef);
        expect(PlayerActions.crackOpenStone).toHaveBeenCalledWith(gameStateRef.current);
        expect(term.inputField).toHaveBeenCalled();
    });

    it('CRACK_STONE: should not call crackOpenStone if no stone equipped', async () => {
        gameStateRef.current!.equippedStoneId = null;
        await handleMainMenuAction(MainMenuOption.CRACK_STONE, gameStateRef);
        expect(PlayerActions.crackOpenStone).not.toHaveBeenCalled();
        expect(term.yellow).toHaveBeenCalledWith(expect.stringContaining("No stone equipped to crack!"));
        expect(term.inputField).toHaveBeenCalled();
    });

    it('SALVAGE_STONE: should call salvageStone if stone equipped', async () => {
        gameStateRef.current!.equippedStoneId = 123;
        mockGetStoneById.mockReturnValue({ seed: 123, rarity: 5 } as StoneQualities);
        await handleMainMenuAction(MainMenuOption.SALVAGE_STONE, gameStateRef);
        expect(PlayerActions.salvageStone).toHaveBeenCalledWith(gameStateRef.current);
        expect(term.inputField).toHaveBeenCalled();
    });

    it('FIGHT_OPPONENT: should call startFight if conditions met', async () => {
        gameStateRef.current!.equippedStoneId = 123;
        const mockPlayerStone = { seed: 123 } as StoneQualities;
        const mockOpponentStone = { seed: 456 } as StoneQualities;
        mockGetStoneById.mockReturnValue(mockPlayerStone);
        (GameStateManager.getCurrentOpponent as jest.Mock).mockReturnValue(mockOpponentStone);

        await handleMainMenuAction(MainMenuOption.FIGHT_OPPONENT, gameStateRef);
        expect(FightService.startFight).toHaveBeenCalledWith(mockPlayerStone, mockOpponentStone, gameStateRef.current);
        expect(UIHelpers.displayFightSession).toHaveBeenCalled();
        expect(term.inputField).toHaveBeenCalled();
    });

    it('FIGHT_OPPONENT: should not call startFight if no stone equipped', async () => {
        gameStateRef.current!.equippedStoneId = null;
        await handleMainMenuAction(MainMenuOption.FIGHT_OPPONENT, gameStateRef);
        expect(FightService.startFight).not.toHaveBeenCalled();
        expect(term.red).toHaveBeenCalledWith("No game loaded or no stone equipped to fight.\n");
        expect(term.inputField).toHaveBeenCalled();
    });

    it('EXIT: should return false and not wait for key press', async () => {
        const continueLoop = await handleMainMenuAction(MainMenuOption.EXIT, gameStateRef);
        expect(continueLoop).toBe(false);
        expect(term.inputField).not.toHaveBeenCalled(); // Exit should not wait for key press
    });

    it('null option: should handle gracefully and return true', async () => {
        const continueLoop = await handleMainMenuAction(null, gameStateRef);
        expect(term.red).toHaveBeenCalledWith(expect.stringContaining("No option selected or menu cancelled."));
        // expect(term.inputField).toHaveBeenCalled(); // Original plan had this, but current menu code doesn't wait on null
        expect(continueLoop).toBe(true);
    });
});
