// src/main.ts
import { GameState } from './game_state';
import { GameStateManager } from './game_state_manager';
import { initializeTerminal, terminateApp, term } from './ui'; // Assuming ui/index.ts exports these
import { showMainMenu, handleMainMenuAction, MainMenuOption } from './ui/main_menu';
import { Card, CombatParticipantState, ActiveEffect } from './combat_interfaces'; // For placeholder effect assignment
import { assignPlaceholderEffectsToCardsIfNecessary } from './ui/ui_helpers'; // Centralized effect assignment

// Display helper functions are now in ui_helpers.ts and called from main_menu.ts actions.

async function main() {
    initializeTerminal();
    term.brightWhite.bold('Stone Crafter - Terminal Edition\n\n');

    const gameStateRef: { current: GameState | null } = { current: null };

    term.dim('Attempting to load saved game...\n');
    gameStateRef.current = GameStateManager.loadGame();

    if (gameStateRef.current) {
        if (gameStateRef.current.playerStats.name.includes("(New") || gameStateRef.current.playerStats.name.includes("(LoadFail")) {
            term.green(`No valid saved game found. Started a new game for player: ${gameStateRef.current.playerStats.name}\n`);
        } else {
            term.green(`Game loaded for player: ${gameStateRef.current.playerStats.name}\n`);
        }
        // Ensure deck is ready and cards have effects after initial load/creation
        assignPlaceholderEffectsToCardsIfNecessary(gameStateRef.current);
    } else {
        // This case should ideally not be reached if loadGame always returns a GameState
        term.red("Critical error: GameState is null after load/new game attempt. Exiting.\n");
        terminateApp(1);
        return; // Ensure function exits if terminateApp doesn't stop it immediately
    }

    term.dim('Press any key to continue to main menu...\n');
    // Wait for a key press, but without an input field that might capture the key
    await term.waitForKey().promise;


    let keepRunning = true;
    while (keepRunning) {
        term.clear(); // Clear screen before showing menu
        const selectedOption = await showMainMenu();

        if (selectedOption === null) {
            term.clear();
            term.yellow('Menu selection cancelled. Press any key to show menu again, or CTRL+C to exit.\n');
            await term.waitForKey().promise;
            continue;
        }

        keepRunning = await handleMainMenuAction(selectedOption, gameStateRef);

        if (!keepRunning) { // If handleMainMenuAction returned false (Exit option)
            break;
        }
    }

    terminateApp();
}

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
    term.hideCursor(false); // Ensure cursor is visible
    term.styleReset();
    term.red(`\n\nUnhandled Rejection at: ${promise}\nReason: ${reason}\n\n`);
    console.error(reason); // Also log the full error to stderr
    terminateApp(1); // Terminate after showing error
});

process.on('uncaughtException', (err, origin) => {
    term.hideCursor(false); // Ensure cursor is visible
    term.styleReset();
    term.red(`\n\nUncaught Exception:\nOrigin: ${origin}\nError: ${err.message}\n\n`);
    console.error(err.stack);
    terminateApp(1); // Terminate after showing error
});

main().catch(error => {
    term.hideCursor(false); // Ensure cursor is visible in case of error during main()
    term.styleReset();
    term.red.bold(`\n\nAn unexpected error occurred in main execution: ${error}\n`);
    if (error instanceof Error && error.stack) {
        console.error(error.stack);
    }
    terminateApp(1);
});
