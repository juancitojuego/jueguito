import { Component, createSignal } from 'solid-js';
import { setCurrentSaveData, saveData, initializeGamePrng, getGamePrng, getDefaultSaveData } from '../store'; // Added getGamePrng
import { createStone, generateNewStoneSeed, mulberry32 } from '../stone';
import { logMessage, showMessage } from '../utils';

const StartMenu: Component = () => {
  const [seedInput, setSeedInput] = createSignal('');
  const [playerNameInput, setPlayerNameInput] = createSignal('');

  const handleStartGame = () => {
    const name = playerNameInput().trim() || "Player";
    let seedStr = seedInput().trim();
    let gameSeed: number;

    if (seedStr === '') {
      // Use mulberry32 for initial seed generation if none provided, similar to original
      const tempRng = mulberry32(Date.now() + Math.random() * 10000);
      gameSeed = generateNewStoneSeed(tempRng) >>> 0; // Ensure positive integer
      showMessage(`No seed entered. Using random seed: ${gameSeed}`, 4000, 'info');
    } else {
      const parsedSeed = parseInt(seedStr, 10);
      if (isNaN(parsedSeed)) {
        // If not a number, generate a seed from the string characters like original
        let stringHash = 0;
        for (let i = 0; i < seedStr.length; i++) {
          stringHash = (stringHash << 5) - stringHash + seedStr.charCodeAt(i);
          stringHash |= 0; // Convert to 32bit integer
        }
        const tempRng = mulberry32(stringHash + Date.now()); // Add Date.now() for more variability
        gameSeed = generateNewStoneSeed(tempRng) >>> 0;
        showMessage(`Invalid number for seed. Generated one based on text: ${gameSeed}`, 4000, 'info');
      } else {
        gameSeed = parsedSeed >>> 0; // Ensure positive integer
      }
    }

    logMessage(`Starting new game. Player: "${name}", Resolved Game Seed: ${gameSeed}`);

    initializeGamePrng(gameSeed); // Initialize the global PRNG

    const firstStoneSeed = generateNewStoneSeed(getGamePrng()); // Use the now initialized global PRNG
    const firstStone = createStone(firstStoneSeed);
    logMessage(`Generated first stone (Seed: ${firstStone.seed}) for player "${name}".`);

    setCurrentSaveData({
      ...getDefaultSaveData(), // Start with defaults
      playerName: name,
      gameSeed: gameSeed,
      stones: [firstStone],
      equippedStone: firstStone,
      // salt can remain default or be customized if needed
    });

    try {
      saveData();
      logMessage('Initial game data saved.');
      showMessage(`Game started for ${name}! Your first stone is ready.`, 5000, 'success');
    } catch (e: any) {
      logMessage(`Error saving initial game data: ${e.message}`);
      showMessage(`CRITICAL SAVE FAILED: ${e.message}. Progress may not be saved.`, 0, 'error'); // 0 duration = stays until next message
    }
    // The App.tsx will react to gameSeed changing and switch views.
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
