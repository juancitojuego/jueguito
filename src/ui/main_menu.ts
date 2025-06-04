// src/ui/main_menu.ts
import { term, terminateApp } from './index';
import { GameState } from '../game_state';
import { GameStateManager } from '../game_state_manager';
import { crackOpenStone, salvageStone } from '../player_actions';
import { startFight, getCurrentFightSession, clearCurrentFightSession } from '../fight_service';
import { displayStoneDetails, listInventory, displayFightSession } from './ui_helpers';
import { StoneQualities } from '../stone_mechanics'; // For type checking

export enum MainMenuOption {
    NEW_GAME = "New Game",
    LOAD_GAME = "Load Game",
    // VIEW_INVENTORY = "View Inventory (Coming Soon)", // Kept commented as per plan
    CRACK_STONE = "Crack Open Stone",
    SALVAGE_STONE = "Salvage Stone",
    FIGHT_OPPONENT = "Fight Opponent",
    EXIT = "Exit"
}

export function showMainMenu(): Promise<MainMenuOption | null> { // gameStateRef removed, actions handle null gameState
    term.clear();
    term.cyan.bold('Welcome to Stone Crafter!\n\n');
    term.yellow('Select an option:\n');

    const menuItems = [
        MainMenuOption.NEW_GAME,
        MainMenuOption.LOAD_GAME,
        // MainMenuOption.VIEW_INVENTORY,
        MainMenuOption.CRACK_STONE,
        MainMenuOption.SALVAGE_STONE,
        MainMenuOption.FIGHT_OPPONENT,
        MainMenuOption.EXIT,
    ];

    return new Promise((resolve) => {
        term.singleColumnMenu(menuItems, { y: 5, style: term.inverse, selectedStyle: term.bgColor('blue').white.bold }, (error, response) => {
            if (error) {
                term.red(`Menu error: ${error}\n`);
                resolve(null);
                return;
            }
            if (response) {
                resolve(response.selectedText as MainMenuOption);
            } else {
                resolve(null); // No selection (e.g., Esc pressed)
            }
        });
    });
}

export async function handleMainMenuAction(option: MainMenuOption | null, gameStateRef: { current: GameState | null }): Promise<boolean> {
    term.clear(); // Clear menu before showing action result
    if (option === null) {
        term.red("No option selected or menu cancelled.\n");
        // Optionally wait for key press before returning to main menu
        // await term.inputField({echo: false}).promise;
        return true; // Continue main loop
    }

    term.brightCyan.bold(`Selected: ${option}\n\n`);

    switch (option) {
        case MainMenuOption.NEW_GAME:
            term("Starting new game...\n");
            gameStateRef.current = GameState.createInitial("Player", Date.now() | 0);
            GameStateManager.generateDeck(gameStateRef.current);
            term(`New game started for `).green(`${gameStateRef.current.playerStats.name}\n`);
            displayStoneDetails(gameStateRef.current.getStoneById(gameStateRef.current.equippedStoneId), "Equipped Stone");
            listInventory(gameStateRef.current);
            break;

        case MainMenuOption.LOAD_GAME:
            term("Loading game...\n");
            gameStateRef.current = GameStateManager.loadGame();
             // Ensure deck and effects are ready after load
            if (gameStateRef.current.deck.length === 0 && gameStateRef.current.hand.length === 0 && gameStateRef.current.discardPile.length === 0) {
                GameStateManager.generateDeck(gameStateRef.current);
            }
            // Card effects assignment would happen here if cards were just IDs;
            // but PREDEFINED_CARDS already have effects, and loadGame re-links them.
            term(`Game loaded for `).green(`${gameStateRef.current.playerStats.name}\n`).gray(`Currency: ${gameStateRef.current.currency}\n`);
            displayStoneDetails(gameStateRef.current.getStoneById(gameStateRef.current.equippedStoneId), "Equipped Stone");
            listInventory(gameStateRef.current);
            break;

        // case MainMenuOption.VIEW_INVENTORY:
        //     term("View Inventory selected - UI not yet implemented.\n");
        //     if (gameStateRef.current) {
        //         listInventory(gameStateRef.current);
        //     } else {
        //         term.red("No game loaded to view inventory.\n");
        //     }
        //     break;

        case MainMenuOption.CRACK_STONE:
            term("Crack Open Stone selected...\n");
            if (gameStateRef.current) {
                if (gameStateRef.current.equippedStoneId) {
                    const result = crackOpenStone(gameStateRef.current);
                    term(`${result.message}\n`);
                    result.newStones.forEach(s => displayStoneDetails(s, "Found Stone"));
                    listInventory(gameStateRef.current);
                } else {
                    term.yellow("No stone equipped to crack!\n");
                }
            } else {
                term.red("No game loaded to crack a stone.\n");
            }
            break;

        case MainMenuOption.SALVAGE_STONE:
            term("Salvage Stone selected...\n");
            if (gameStateRef.current) {
                if (gameStateRef.current.equippedStoneId) {
                    const stoneToSalvage = gameStateRef.current.getStoneById(gameStateRef.current.equippedStoneId);
                    if (stoneToSalvage) term.dim(`Attempting to salvage: ${stoneToSalvage.name} (Rarity: ${stoneToSalvage.rarity})\n`);

                    const result = salvageStone(gameStateRef.current);
                    term(`${result.message}\n`);
                    term.green(`Currency gained: ${result.currencyGained}. `).gray(`Total currency: ${gameStateRef.current.currency}\n`);
                    listInventory(gameStateRef.current);
                } else {
                    term.yellow("No stone equipped to salvage!\n");
                }
            } else {
                term.red("No game loaded to salvage a stone.\n");
            }
            break;

        case MainMenuOption.FIGHT_OPPONENT:
            term("Fight Opponent selected...\n");
            if (gameStateRef.current && gameStateRef.current.equippedStoneId) {
                const playerStone = gameStateRef.current.getStoneById(gameStateRef.current.equippedStoneId);
                const opponentStone = GameStateManager.getCurrentOpponent(gameStateRef.current);
                if (playerStone && opponentStone) {
                    const session = startFight(playerStone, opponentStone, gameStateRef.current);
                    if (session) {
                        term.brightGreen("Fight initiated!\n");
                        displayFightSession(session, gameStateRef.current);
                        term.dim("\n(Combat loop not yet implemented in menu. Fight session started.)\n");
                        // For now, just clear it for demo purposes of returning to menu
                        // clearCurrentFightSession();
                    } else {
                        term.red("Failed to start fight.\n");
                    }
                } else {
                    term.yellow("Player stone or opponent not available for fight.\n");
                }
            } else {
                term.red("No game loaded or no stone equipped to fight.\n");
            }
            break;

        case MainMenuOption.EXIT:
            term("Exiting game...\n");
            return false; // Signal to exit main loop
    }
    term.dim("\nPress any key to return to the main menu...");
    await term.inputField({echo: false}).promise; // Wait for any key press
    return true; // Continue main loop
}
