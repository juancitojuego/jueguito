// src/blessed/ui/fightUI.ts
import blessed from 'blessed';
import { screen } from '../index';
import { gameState, equippedStoneDetails, currentOpponentStore } from '../../store';
import { fightServiceInstance, gameStateManagerInstance } from '../../services/serviceInstances';
import type { StoneQualities, FightSession, Card, NewRoundInfo, CardPlayOutcome, RoundResolutionOutcome, ActiveEffect } from '../../interfaces';
import { calculateStonePower } from '../../stone';
import { showMessage, logMessage } from '../../messageStore';

let playerHealthBox: blessed.Widgets.Box;
let opponentHealthBox: blessed.Widgets.Box;
let playerEffectsBox: blessed.Widgets.Box;
let fightLog: blessed.Widgets.Log;
let cardDisplayArea: blessed.Widgets.Box;
let actionsArea: blessed.Widgets.Box;
let fightContainer: blessed.Widgets.Box;

let currentFightSession: FightSession | null = null;
let currentNewRoundInfo: NewRoundInfo | null = null;
let onFightEndCallback: (() => void) | null = null;

function formatStoneForFight(stone: StoneQualities | null): string {
  if (!stone) return 'N/A';
  return `${blessed.helpers.escape(stone.name || `Stone ${stone.seed}`)} (P: ${calculateStonePower(stone)})`;
}

function updateUIDisplays() {
    if (!currentFightSession || fightContainer.detached) return;
    const playerStone = gameState.stones.find(s => s.seed === currentFightSession?.player.stoneId);

    playerHealthBox.setLabel(`Your Stone: ${formatStoneForFight(playerStone)}`);
    playerHealthBox.setContent(`Health: ${currentFightSession.player.combatState.currentHealth}/${currentFightSession.player.combatState.maxHealth}`);

    const opponentStoneFromStore = currentOpponentStore();
    opponentHealthBox.setLabel(`Opponent: ${formatStoneForFight(opponentStoneFromStore)}`);
    opponentHealthBox.setContent(`Health: ${currentFightSession.opponent.combatState.currentHealth}/${currentFightSession.opponent.combatState.maxHealth}`);

    const playerEffects = gameState.playerActiveCombatEffects;
    const effectsString = playerEffects.length > 0 ? playerEffects.map(e => `${blessed.helpers.escape(e.name)} (${e.remainingDuration}r)`).join(', ') : 'No active effects';
    playerEffectsBox.setContent(effectsString);

    screen.render();
}

async function handleRoundResolutionPhase() {
    if (!currentFightSession || !onFightEndCallback || fightContainer.detached) return;
    fightLog.add('Resolving round...');

    // Clear cardDisplayArea
    while (cardDisplayArea.children.length > 0) cardDisplayArea.children[0].destroy();
    cardDisplayArea.setContent('');
    cardDisplayArea.setLabel('Cards'); // Reset label

    // Clear actionsArea
    while (actionsArea.children.length > 0) actionsArea.children[0].destroy();
    actionsArea.setLabel('Round Resolution');
    actionsArea.setContent('Resolving combat, please wait...');
    screen.render();

    try {
        const resolution: RoundResolutionOutcome = await fightServiceInstance.resolveCurrentRound();
        fightLog.add(resolution.logEntry);
        currentFightSession = await fightServiceInstance.getCurrentFightSession();
        updateUIDisplays();

        if (currentFightSession?.isFightOver) {
            fightLog.add(`Fight is over! Winner: ${currentFightSession.winner}`);
            const outcome = await fightServiceInstance.endFight();
            if (outcome) {
                fightLog.add(`Final Outcome: ${outcome.log[outcome.log.length -1]}`);
                showMessage(`Fight Over! Winner: ${outcome.winner}`, 5000);
            }
            onFightEndCallback();
        } else {
            await beginNewRoundCycle();
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logMessage(`Error resolving round: ${errorMessage}`);
        showMessage(`Error: ${errorMessage}`, 3000, 'error');
        onFightEndCallback();
    }
}

async function handleCardPlayPhase() {
    if (!currentFightSession || !onFightEndCallback || fightContainer.detached) return;

    // Clear cardDisplayArea
    while (cardDisplayArea.children.length > 0) cardDisplayArea.children[0].destroy();
    cardDisplayArea.setLabel('Your Hand - Select a card to play (Enter)');

    // Clear actionsArea
    while (actionsArea.children.length > 0) actionsArea.children[0].destroy();
    actionsArea.setLabel('Player Action');
    actionsArea.setContent('Loading your hand...'); // Initial message
    screen.render();

    const hand = gameState.hand;
    if (hand.length === 0) {
        fightLog.add("No cards in hand to play. Proceeding to round resolution.");
        actionsArea.setContent("No cards to play. Auto-resolving...");
        // Ensure cardDisplayArea is clear and shows hand is empty
        while (cardDisplayArea.children.length > 0) cardDisplayArea.children[0].destroy();
        cardDisplayArea.setContent('{center}Hand is Empty{/center}');
        screen.render();
        setTimeout(handleRoundResolutionPhase, 1500);
        return;
    }
    actionsArea.setContent('Select a card from your hand to play.'); // Update after hand check

    const handList = blessed.list({
        parent: cardDisplayArea,
        items: hand.map(c => `${blessed.helpers.escape(c.name)} - ${blessed.helpers.escape(c.effect.description)}`),
        top: 0, left: 0, width: '100%-2', height: '100%-2',
        keys: true, mouse: true, vi: true, tags: true, border: 'line',
        style: { selected: { bg: 'blue' } }
    });
    handList.focus();
    screen.render();

    handList.on('select', async (item, index) => {
        handList.destroy();
        const selectedCard = hand[index];
        fightLog.add(`Selected card: ${blessed.helpers.escape(selectedCard.name)}`);

        // Clear actionsArea before target list
        while (actionsArea.children.length > 0) actionsArea.children[0].destroy();
        actionsArea.setLabel('Select Target (Enter)');
        actionsArea.setContent(`Selected: ${blessed.helpers.escape(selectedCard.name)}. Choose target.`);
        screen.render(); // Show selection before target list appears

        const targetList = blessed.list({
            parent: actionsArea,
            items: ['Player (Self)', 'Opponent'],
            top: 0, left: 0, width: '100%-2', height: '100%-2', // Fit within actionsArea
            keys: true, mouse: true, vi: true, style: { selected: { bg: 'green' } }, border: 'line'
        });
        targetList.focus();
        screen.render();

        targetList.on('select', async (targetItem, targetIndex) => {
            targetList.destroy(); // Remove targetList itself
            const targetId = targetIndex === 0 ? 'player' : 'opponent';
            fightLog.add(`Targeting: ${targetId} with ${blessed.helpers.escape(selectedCard.name)}`);
            actionsArea.setContent(`Playing ${blessed.helpers.escape(selectedCard.name)} on ${targetId}...`);
            screen.render();

            try {
                const playOutcome: CardPlayOutcome = await fightServiceInstance.playerPlaysCard(selectedCard.id, targetId);
                fightLog.add(playOutcome.message);
                if (playOutcome.success && currentFightSession) {
                    if(playOutcome.updatedPlayerState) currentFightSession.player.combatState = playOutcome.updatedPlayerState;
                    if(playOutcome.updatedOpponentState) currentFightSession.opponent.combatState = playOutcome.updatedOpponentState;
                }
                updateUIDisplays();
                await handleRoundResolutionPhase();
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                logMessage(`Error playing card: ${errorMessage}`);
                showMessage(`Error: ${errorMessage}`, 3000, 'error');
                if (onFightEndCallback) onFightEndCallback();
            }
        });
    });
}

async function handleCardChoicePhase() {
    if (!currentFightSession || !currentNewRoundInfo || !onFightEndCallback || fightContainer.detached) return;

    // Clear cardDisplayArea
    while (cardDisplayArea.children.length > 0) cardDisplayArea.children[0].destroy();
    cardDisplayArea.setLabel('Card Choice - Select 1 card to KEEP (Enter)');

    // Clear actionsArea
    while (actionsArea.children.length > 0) actionsArea.children[0].destroy();
    actionsArea.setLabel('Player Action');
    actionsArea.setContent('Loading card choices...'); // Initial message
    screen.render();

    const choices = currentNewRoundInfo.cardsForChoice;
    if (choices.length === 0) {
        fightLog.add("No cards drawn for choice. Proceeding to play phase.");
        actionsArea.setContent("No cards to choose. Auto-playing...");
        // Ensure cardDisplayArea is clear and shows no cards message
        while (cardDisplayArea.children.length > 0) cardDisplayArea.children[0].destroy();
        cardDisplayArea.setContent('{center}No cards to choose.{/center}');
        screen.render();
        setTimeout(handleCardPlayPhase, 1500);
        return;
    }
    actionsArea.setContent('Select one card from the choices to add to your hand.'); // Update after choices check

    const choiceList = blessed.list({
        parent: cardDisplayArea,
        items: choices.map(c => `${blessed.helpers.escape(c.name)} - ${blessed.helpers.escape(c.effect.description)}`),
        top: 0, left: 0, width: '100%-2', height: '100%-2',
        keys: true, mouse: true, vi: true, tags: true, border: 'line',
        style: { selected: { bg: 'blue' } }
    });
    choiceList.focus();
    screen.render();

    choiceList.on('select', async (item, index) => {
        choiceList.destroy();
        const chosenCard = choices[index];
        const discardedCardIds = choices.filter(c => c.id !== chosenCard.id).map(c => c.id);

        fightLog.add(`Chose card: ${blessed.helpers.escape(chosenCard.name)}. Discarded ${discardedCardIds.length} card(s).`);
        actionsArea.setContent(`Adding ${blessed.helpers.escape(chosenCard.name)} to hand...`);
        screen.render();

        try {
            await fightServiceInstance.playerSelectsCard(chosenCard.id, discardedCardIds);
            await handleCardPlayPhase();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logMessage(`Error selecting card: ${errorMessage}`);
            showMessage(`Error: ${errorMessage}`, 3000, 'error');
            if (onFightEndCallback) onFightEndCallback();
        }
    });
}

async function beginNewRoundCycle() {
    if (!currentFightSession || fightContainer.detached) return;

    if (currentFightSession.isFightOver) {
        fightLog.add("Fight is already over. Finalizing...");
        if (onFightEndCallback) {
            // Ensure endFight is called if not already handled by resolution phase
            const outcome = await fightServiceInstance.endFight();
            if (outcome) showMessage(`Fight Over! Winner: ${outcome.winner}`, 5000);
            else showMessage('Fight concluded.', 3000); // Fallback message
            onFightEndCallback();
        }
        return;
    }

    try {
        fightLog.add(`--- Starting Round ${currentFightSession.currentRound + 1} ---`);
        currentNewRoundInfo = await fightServiceInstance.startNewRound();
        const updatedSession = await fightServiceInstance.getCurrentFightSession();
        if(updatedSession) currentFightSession = updatedSession;
        else { // Should not happen if startNewRound succeeded
            logMessage("Critical: Could not get updated session after starting new round.");
            if(onFightEndCallback) onFightEndCallback();
            return;
        }

        updateUIDisplays();
        await handleCardChoicePhase();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logMessage(`Error starting new round cycle: ${errorMessage}`);
        showMessage(`Error: ${errorMessage}`, 3000, 'error');
        if (onFightEndCallback) onFightEndCallback();
    }
}

export async function showFightUI(
  parent: blessed.Widgets.Box,
  _onFightEnd: () => void
) {
  onFightEndCallback = _onFightEnd;

  if (parent.children.length) {
    parent.children.forEach(child => child.destroy());
  }

  fightContainer = blessed.box({
    parent: parent, top: 0, left: 0, width: '100%', height: '100%',
  });

  playerHealthBox = blessed.box({
    parent: fightContainer, label: 'Your Stone',
    top: 0, left: 0, width: '40%', height: 3, border: 'line', tags: true,
  });
  playerEffectsBox = blessed.box({
    parent: fightContainer, label: 'Your Effects',
    top: 0, left: '40%', width: '20%', height: 3, border: 'line', tags: true, content: 'No active effects'
  });
  opponentHealthBox = blessed.box({
    parent: fightContainer, label: 'Opponent Stone',
    top: 0, left: '60%', width: '40%', height: 3, border: 'line', tags: true,
  });

  fightLog = blessed.log({
    parent: fightContainer, label: 'Fight Log',
    top: 3, left: 0, width: '100%', height: 'calc(100% - 3 - 10 - 5)', // Total height - top bars - card area - actions area
    border: 'line', tags: true, scrollable: true, scrollbar: { ch: ' ', inverse: true }
  });

  cardDisplayArea = blessed.box({
    parent: fightContainer, label: 'Cards', // Will be updated: Card Choice / Your Hand
    bottom: 5, left: 0, width: '100%', height: 10,
    border: 'line', tags: true,
  });

  actionsArea = blessed.box({
      parent: fightContainer, label: 'Player Action', // Will be updated: Select Card / Select Target
      bottom: 0, left: 0, width: '100%', height: 5,
      border: 'line', tags: true,
  });

  const playerStone = equippedStoneDetails();
  const opponentStoneValue = currentOpponentStore();

  if (!playerStone || !opponentStoneValue) {
    showMessage('Cannot start fight: Missing player stone or opponent.', 3000, 'error');
    if (onFightEndCallback) onFightEndCallback();
    return;
  }

  try {
    currentFightSession = await fightServiceInstance.startFight(playerStone.seed, opponentStoneValue);
    fightLog.add(`Fight started: ${blessed.helpers.escape(playerStone.name || `Stone ${playerStone.seed}`)} vs ${blessed.helpers.escape(opponentStoneValue.name || `Stone ${opponentStoneValue.seed}`)}`);
    updateUIDisplays();
    await beginNewRoundCycle();

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logMessage(`Error starting fight: ${errorMessage}`);
    showMessage(`Error: ${errorMessage}`, 3000, 'error');
    if (onFightEndCallback) onFightEndCallback();
  }

  // Escape handling should be contextual, e.g. allow cancelling a card choice/play if implemented
  // For now, a general escape from the fight screen:
  fightContainer.key('escape', () => {
      fightLog.add("Player pressed Escape. Attempting to end fight...");
      if (onFightEndCallback) { // Ensure callback exists
        if(currentFightSession && !currentFightSession.isFightOver) {
            fightServiceInstance.endFight().then(outcome => {
                if (outcome) logMessage(`DEV ESCAPE: Fight Outcome: Winner ${outcome.winner}`);
                else logMessage("DEV ESCAPE: endFight called, no specific outcome or fight already ended.");
            }).catch(err => {
                logMessage(`DEV ESCAPE: Error during endFight: ${err}`);
            }).finally(() => {
                currentFightSession = null;
                onFightEndCallback(); // Call after attempt
            });
        } else { // Fight already over or no session
            currentFightSession = null;
            onFightEndCallback();
        }
      } else { // Fallback if no callback somehow
          screen.destroy();
          process.exit(1);
      }
  });

  fightContainer.focus();
  parent.append(fightContainer);
  screen.render();
}
