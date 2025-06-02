import { consoleLogMessages, setConsoleLogMessages, setCurrentMessage, Message } from './store'; // Assuming setCurrentMessage and Message type will be added to store.ts

const MAX_CONSOLE_MESSAGES = 100;

/**
 * Logs a message to the console log signal.
 * Prepends a timestamp to each message.
 * @param message The string message to log.
 */
export function logMessage(message: string): void {
  const timestamp = new Date().toLocaleTimeString();
  const timedMessage = `[${timestamp}] ${message}`;

  setConsoleLogMessages(prevMessages => {
    const newMessages = [...prevMessages, timedMessage];
    if (newMessages.length > MAX_CONSOLE_MESSAGES) {
      return newMessages.slice(newMessages.length - MAX_CONSOLE_MESSAGES);
    }
    return newMessages;
  });
}

/**
 * Sets a message to be displayed temporarily to the user.
 * @param text The message text.
 * @param duration Duration in milliseconds. If 0, message stays until replaced.
 * @param type Type of message (e.g., 'info', 'error', 'success').
 */
export function showMessage(text: string, duration: number = 3000, type: 'info' | 'error' | 'success' = 'info'): void {
  logMessage(`showMessage: [${type}] ${text}`); // Also log it
  setCurrentMessage({ text, type, duration });

  if (duration > 0) {
    setTimeout(() => {
      // Only clear if the current message is still the one we set
      // This requires checking the current message in the store, which is more complex.
      // For simplicity, we'll assume for now that a new message will overwrite or it's okay if it's cleared by an older timeout.
      // A more robust solution would involve an ID for messages.
      setCurrentMessage(null); // Clear the message
    }, duration);
  }
}

// Placeholder for PRNG and stone creation utilities that will be moved or adapted later
// For now, they are not included here to keep this step focused.
// import seedrandom from 'seedrandom';
// import { StoneQualities, createStone, generateNewStoneSeed, mulberry32 } from './stone'; // Adjust path as needed

/*
Example of how PRNG related functions might be exposed if moved here:

let gamePrng: seedrandom.PRNG;

export function initializeGamePrng(seed: string | number): void {
  gamePrng = seedrandom(seed.toString());
  logMessage(`Game PRNG initialized with seed: ${seed}`);
}

export function getGamePrng(): seedrandom.PRNG {
  if (!gamePrng) {
    // Fallback or error, should be initialized at game start
    logMessage("Warning: Game PRNG accessed before initialization. Initializing with random seed.");
    initializeGamePrng(Date.now().toString());
  }
  return gamePrng;
}

export { createStone, generateNewStoneSeed, mulberry32, StoneQualities };
*/

// The shutdown function from the original index.ts is not directly applicable
// in a browser environment in the same way.
// Game reset/exit logic will be handled by specific UI components.
export function resetGameData(): void {
    // This would typically involve:
    // 1. Clearing localStorage (or parts of it related to the game)
    // 2. Resetting all SolidJS stores to their default states
    // 3. Potentially redirecting the user or re-rendering the App component
    logMessage("Game data reset requested.");
    // Actual implementation will depend on how store reset is handled.
    // For now, just a log. Later, it can call store actions.
    // Example: setCurrentSaveData(getDefaultSaveData()); localStorage.removeItem(LOCAL_STORAGE_KEY); window.location.reload();
    alert("Game data reset functionality not fully implemented yet.");
}
