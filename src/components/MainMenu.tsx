import { Component } from 'solid-js';
import {
  currentSaveData,
  setCurrentSaveData,
  currentStoneDetails,
  setCurrentStoneDetails,
  saveData,
  addStoneToInventory,
  getCurrentOpponent,
  // generateOpponentList, // Usually called on load or when queue is empty by getCurrentOpponent
  getGamePrng,
} from '../store';
import { createStone, generateNewStoneSeed, calculateStonePower, StoneQualities } from '../stone';
import { logMessage, showMessage } from '../utils';
import { produce } from 'solid-js/store';

interface MainMenuProps {
  toggleInventory: () => void;
}

const MainMenu: Component<MainMenuProps> = (props) => {

  const handleCrackOpen = () => {
    const equipped = currentStoneDetails();
    if (!equipped) {
      showMessage('No stone equipped to crack open!', 3000, 'error');
      return;
    }

    logMessage(`Attempting to crack open stone: ${equipped.seed}`);

    // Remove from inventory
    setCurrentSaveData(
      produce(s => {
        s.stones = s.stones.filter(stone => stone.seed !== equipped.seed);
      })
    );

    const prng = getGamePrng();
    const newStones: StoneQualities[] = [];
    const stone1Seed = generateNewStoneSeed(prng);
    const stone1 = createStone(stone1Seed);
    newStones.push(stone1);
    addStoneToInventory(stone1); // This updates currentSaveData.stones

    if (prng() < 0.1) { // 10% chance for a second stone
      const stone2Seed = generateNewStoneSeed(prng);
      const stone2 = createStone(stone2Seed);
      newStones.push(stone2);
      addStoneToInventory(stone2);
    }
    if (prng() < 0.01) { // 1% chance for a third stone (compounded)
      const stone3Seed = generateNewStoneSeed(prng);
      const stone3 = createStone(stone3Seed);
      newStones.push(stone3);
      addStoneToInventory(stone3);
    }
    
    // Determine new equipped stone
    let newEquippedStone: StoneQualities | null = null;
    if (newStones.length > 0) {
      newEquippedStone = newStones[0];
    } else if (currentSaveData.stones.length > 0) {
      // This case should ideally not be hit if addStoneToInventory works correctly
      // and newStones always has at least one. But as a fallback:
      newEquippedStone = currentSaveData.stones[0];
    }
    
    setCurrentSaveData('equippedStone', newEquippedStone);
    setCurrentStoneDetails(newEquippedStone);

    saveData();
    logMessage(`Cracked open ${equipped.seed}. Found ${newStones.length} new stones. New equipped: ${newEquippedStone?.seed || 'none'}`);
    showMessage(`Cracked open stone ${equipped.seed}. Obtained ${newStones.length} new stone(s).`, 4000, 'success');
  };

  const handleFight = () => {
    const playerStone = currentStoneDetails();
    if (!playerStone) {
      showMessage('No stone equipped to fight with!', 3000, 'error');
      return;
    }

    const opponent = getCurrentOpponent(); // This might trigger queue regeneration
    if (!opponent || opponent.stones.length === 0) {
      showMessage('No opponents available to fight!', 3000, 'error');
      // getCurrentOpponent should log details if queue is empty or regenerated
      return;
    }
    const opponentStone = opponent.stones[0]; // Assume opponent uses their first stone

    logMessage(`Fight started: Player (${playerStone.seed}) vs Opponent ${opponent.name} (${opponentStone.seed})`);

    const prng = getGamePrng();
    let playerPower = calculateStonePower(playerStone) * (1 + (prng() * 0.3 - 0.15)); // +/- 15% variance
    let opponentPower = calculateStonePower(opponentStone) * (1 + (prng() * 0.3 - 0.15));

    let fightMessage = `Your stone (P: ${playerPower.toFixed(2)}) vs Opponent (P: ${opponentPower.toFixed(2)}). `;
    let outcomeType: 'success' | 'error' | 'info' = 'info';

    if (playerPower > opponentPower) {
      setCurrentSaveData('currency', c => c + 10);
      fightMessage += `You WIN! +10 currency. Current: ${currentSaveData.currency}.`;
      outcomeType = 'success';
      if (prng() < 0.2) { // 20% chance for an extra stone
        const newStoneSeed = generateNewStoneSeed(prng);
        const extraStone = createStone(newStoneSeed);
        addStoneToInventory(extraStone);
        fightMessage += ' You found an extra stone!';
      }
    } else if (playerPower < opponentPower) {
      fightMessage += 'You LOST. ';
      outcomeType = 'error';
      if (prng() < 0.3) { // 30% chance to destroy player's stone
        const lostStoneSeed = playerStone.seed;
        setCurrentSaveData(produce(s => {
          s.stones = s.stones.filter(stone => stone.seed !== lostStoneSeed);
          if (s.equippedStone?.seed === lostStoneSeed) {
            s.equippedStone = s.stones.length > 0 ? s.stones[0] : null;
          }
        }));
        setCurrentStoneDetails(currentSaveData.equippedStone);
        fightMessage += 'Your stone was destroyed!';
      }
    } else {
      fightMessage += "It's a TIE.";
    }

    setCurrentSaveData('opponents_index', i => i + 1);
    saveData();
    logMessage(`Fight result: ${fightMessage}. Next opponent index: ${currentSaveData.opponents_index}`);
    showMessage(fightMessage, 5000, outcomeType);
  };

  const handleSalvage = () => {
    const stoneToSalvage = currentStoneDetails();
    if (!stoneToSalvage) {
      showMessage('No stone equipped to salvage!', 3000, 'error');
      return;
    }

    logMessage(`Attempting to salvage stone: ${stoneToSalvage.seed}`);
    const salvageValue = stoneToSalvage.rarity * 10; // Example calculation

    setCurrentSaveData(produce(s => {
      s.currency += salvageValue;
      s.stones = s.stones.filter(stone => stone.seed !== stoneToSalvage.seed);
      if (s.equippedStone?.seed === stoneToSalvage.seed) {
        s.equippedStone = s.stones.length > 0 ? s.stones[0] : null;
      }
    }));
    setCurrentStoneDetails(currentSaveData.equippedStone);
    
    saveData();
    logMessage(`Salvaged stone ${stoneToSalvage.seed} for ${salvageValue}. New equipped: ${currentSaveData.equippedStone?.seed || 'none'}`);
    showMessage(`Salvaged stone for ${salvageValue} currency. Current: $${currentSaveData.currency}.`, 4000, 'success');
  };

  const buttonStyle = { margin: '5px', padding: '10px', "min-width": '150px' };

  return (
    <div>
      <h3>Main Menu</h3>
      <button style={buttonStyle} onClick={handleCrackOpen} disabled={!currentStoneDetails()}>
        Crack Open Stone
      </button>
      <button style={buttonStyle} onClick={handleFight} disabled={!currentStoneDetails()}>
        Fight Opponent
      </button>
      <button style={buttonStyle} onClick={handleSalvage} disabled={!currentStoneDetails()}>
        Salvage Stone
      </button>
      <button style={buttonStyle} onClick={props.toggleInventory}>
        Inventory
      </button>
    </div>
  );
};

export default MainMenu;
