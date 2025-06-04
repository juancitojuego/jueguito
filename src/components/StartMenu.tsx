import { Component, createSignal } from 'solid-js';
import { resetGameDefaults } from '../store'; // Import new action
// mulberry32 and generateNewStoneSeed are for client-side seed generation if needed
// but GameStateManager will handle actual game setup.
import { mulberry32, generateNewStoneSeed } from '../stone'; 
import { logMessage, showMessage } from '../messageStore';

const StartMenu: Component = () => {
  const [seedInput, setSeedInput] = createSignal('');
  const [playerNameInput, setPlayerNameInput] = createSignal('');

  const handleStartGame = () => {
    const name = playerNameInput().trim() || "Player";
    let seedStr = seedInput().trim();
    let resolvedSeed: number;

    if (seedStr === '') {
      // Client-side generation of a random seed if none provided
      // mulberry32 is a simple PRNG, generateNewStoneSeed makes it an int
      const tempRng = mulberry32(Date.now() + Math.random() * 10000);
      resolvedSeed = generateNewStoneSeed(tempRng) >>> 0;
      showMessage(`No seed entered. Using random seed: ${resolvedSeed}`, 4000, 'info');
    } else {
      const parsedSeed = parseInt(seedStr, 10);
      if (isNaN(parsedSeed)) {
        let stringHash = 0;
        for (let i = 0; i < seedStr.length; i++) {
          stringHash = (stringHash << 5) - stringHash + seedStr.charCodeAt(i);
          stringHash |= 0; 
        }
        const tempRng = mulberry32(stringHash + Date.now());
        resolvedSeed = generateNewStoneSeed(tempRng) >>> 0;
        showMessage(`Invalid number for seed. Generated one based on text: ${resolvedSeed}`, 4000, 'info');
      } else {
        resolvedSeed = parsedSeed >>> 0;
      }
    }

    logMessage(`Requesting new game. Player: "${name}", Resolved Game Seed: ${resolvedSeed}`);
    
    // Call the action from the refactored store, which calls GameStateManager
    resetGameDefaults({ newGameSeed: resolvedSeed, playerName: name });
    
    // GameStateManager will handle initializing PRNG, creating first stone, saving, etc.
    // It will also notify listeners, causing the gameState in store.ts to update.
    // App.tsx will react to gameState.gameSeed changing and switch views.
    // No direct saveData() or setCurrentSaveData() calls here anymore.
    showMessage(`New game started for ${name} with seed ${resolvedSeed}.`, 5000, 'success');
  };

  return (
    <div style={{ border: '1px solid green', padding: '20px', margin: '10px' }}>
      <h2>New Player Setup</h2>
      <div>
        <label for="playerName">Player Name: </label>
        <input
          type="text"
          id="playerName"
          value={playerNameInput()}
          onInput={(e) => setPlayerNameInput(e.currentTarget.value)}
          placeholder="Enter your name (optional)"
          style={{ margin: '5px', padding: '8px', width: '200px' }}
        />
      </div>
      <div>
        <label for="seedInput">Game Seed: </label>
        <input
          type="text"
          id="seedInput"
          value={seedInput()}
          onInput={(e) => setSeedInput(e.currentTarget.value)}
          placeholder="Leave blank for random"
          style={{ margin: '5px', padding: '8px', width: '200px' }}
        />
      </div>
      <button 
        onClick={handleStartGame}
        style={{ margin: '10px 5px', padding: '10px 20px', "background-color": 'lightgreen', "border-radius": '5px' }} // Changed to string literal keys
      >
        Start Game
      </button>
    </div>
  );
};

export default StartMenu;
