import { Component } from 'solid-js';
import {
  // Import from the new store
  equippedStoneDetails,
  currentOpponentStore, // Use this instead of old getCurrentOpponent
  updateCurrency,
  addStoneToInventory,
  removeStoneFromInventory,
  equipStone,
  advanceOpponent,
  saveGame,
  // gameState, // Not directly needed if using specific actions/selectors
} from '../store';
import { 
  fightServiceInstance, 
  randomServiceInstance 
} from '../services/serviceInstances';
import { 
  createStone, 
  generateNewStoneSeed, 
  // calculateStonePower is now part of FightService
} from '../stone';
import type { StoneQualities } from '../interfaces'; // Import type directly
import { logMessage, showMessage } from '../utils';
// No need for produce from solid-js/store directly in component if actions handle updates

interface MainMenuProps {
  toggleInventory: () => void;
}

const MainMenu: Component<MainMenuProps> = (props) => {

  const handleCrackOpen = async () => {
    const equipped = equippedStoneDetails(); // Use new derived memo
    if (!equipped) {
      showMessage('No stone equipped to crack open!', 3000, 'error');
      return;
    }

    logMessage(`Attempting to crack open stone: ${equipped.seed}`);
    
    removeStoneFromInventory(equipped.seed);

    const newStones: StoneQualities[] = [];
    // Use randomServiceInstance for probabilities and seed generation
    const stone1Seed = generateNewStoneSeed(() => randomServiceInstance.getRandom());
    const stone1 = createStone(stone1Seed);
    newStones.push(stone1);
    addStoneToInventory(stone1);

    if (randomServiceInstance.getRandom() < 0.1) { // 10% chance
      const stone2Seed = generateNewStoneSeed(() => randomServiceInstance.getRandom());
      const stone2 = createStone(stone2Seed);
      newStones.push(stone2);
      addStoneToInventory(stone2);
    }
    if (randomServiceInstance.getRandom() < 0.01) { // 1% chance
      const stone3Seed = generateNewStoneSeed(() => randomServiceInstance.getRandom());
      const stone3 = createStone(stone3Seed);
      newStones.push(stone3);
      addStoneToInventory(stone3);
    }
    
    // Determine new equipped stone. equipStone action will update equippedStoneDetails memo.
    const newEquipTarget = newStones.length > 0 ? newStones[0] : null;
    // If no new stones, and old one removed, need to check inventory for next available.
    // GameStateManager's removeStoneFromInventory already handles equipping next available if current is removed.
    // So, if newStones exist, equip the first one. Otherwise, GSM already handled it.
    if (newEquipTarget) {
        equipStone(newEquipTarget.seed);
    } else {
        // If no new stones were found, and the old one was removed,
        // GameStateManager's removeStoneFromInventory should have set a new default or null.
        // We might not need to explicitly call equipStone(null) here if removeStoneFromInventory handles it.
        // For clarity, if newStones is empty, we ensure nothing is equipped if inventory becomes empty.
        // This logic is now better handled in GameStateManager.removeStoneFromInventory.
        // The equipStone call after adding new stones is the main path.
    }

    await saveGame();
    logMessage(`Cracked open ${equipped.seed}. Found ${newStones.length} new stones. New equipped: ${newEquipTarget?.seed || 'check store'}`);
    showMessage(`Cracked open stone ${equipped.seed}. Obtained ${newStones.length} new stone(s).`, 4000, 'success');
  };

  const handleFight = async () => {
    const playerStone = equippedStoneDetails();
    const opponentStone = currentOpponentStore(); // Use new derived memo

    if (!playerStone) {
      showMessage('No stone equipped to fight with!', 3000, 'error');
      return;
    }
    if (!opponentStone) {
      showMessage('No opponents available to fight!', 3000, 'error');
      return;
    }

    // FightService now takes randomService instance in constructor, no need to pass prng if methods use it
    const outcome = fightServiceInstance.executeFight(playerStone, opponentStone);

    logMessage(outcome.logMessage); // Use log message from fight outcome
    showMessage(outcome.logMessage.substring(outcome.logMessage.indexOf("Player wins!") !== -1 || outcome.logMessage.indexOf("Opponent wins.") !== -1 || outcome.logMessage.indexOf("It's a tie.") !== -1 ? outcome.logMessage.indexOf("Player wins!") : outcome.logMessage.indexOf("Opponent wins.") !== -1 ? outcome.logMessage.indexOf("Opponent wins.") : outcome.logMessage.indexOf("It's a tie.") : 0), 5000, 
                outcome.winner === 'player' ? 'success' : outcome.winner === 'opponent' ? 'error' : 'info');


    if (outcome.currencyChange && outcome.currencyChange !== 0) {
      updateCurrency(outcome.currencyChange);
    }
    if (outcome.stoneLostByPlayer && playerStone) { // Ensure playerStone is not null
      removeStoneFromInventory(playerStone.seed);
      // equipStone(null) or next available is handled by removeStoneFromInventory
    }
    if (outcome.newStoneGainedByPlayer) {
      addStoneToInventory(outcome.newStoneGainedByPlayer);
    }
    
    advanceOpponent();
    await saveGame();
  };

  const handleSalvage = async () => {
    const stoneToSalvage = equippedStoneDetails();
    if (!stoneToSalvage) {
      showMessage('No stone equipped to salvage!', 3000, 'error');
      return;
    }

    logMessage(`Attempting to salvage stone: ${stoneToSalvage.seed}`);
    const salvageValue = stoneToSalvage.rarity * 10;

    updateCurrency(salvageValue);
    removeStoneFromInventory(stoneToSalvage.seed); // This will also handle unequipping if needed
    
    await saveGame();
    // equippedStoneDetails() will update reactively after removeStoneFromInventory action.
    logMessage(`Salvaged stone ${stoneToSalvage.seed} for ${salvageValue}.`);
    showMessage(`Salvaged stone for ${salvageValue} currency.`, 4000, 'success');
  };

  const buttonStyle = { margin: '5px', padding: '10px', "min-width": '150px' };

  return (
    <div>
      <h3>Main Menu</h3>
      <button style={buttonStyle} onClick={handleCrackOpen} disabled={!equippedStoneDetails()}>
        Crack Open Stone
      </button>
      <button style={buttonStyle} onClick={handleFight} disabled={!equippedStoneDetails() || !currentOpponentStore()}>
        Fight Opponent
      </button>
      <button style={buttonStyle} onClick={handleSalvage} disabled={!equippedStoneDetails()}>
        Salvage Stone
      </button>
      <button style={buttonStyle} onClick={props.toggleInventory}>
        Inventory
      </button>
    </div>
  );
};

export default MainMenu;
