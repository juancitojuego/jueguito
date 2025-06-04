// src/services/fightService.ts

import type {
  IFightService,
  FightSession,
  NewRoundInfo,
  CardPlayOutcome,
  RoundResolutionOutcome,
  FightOutcome,
  // FightParticipantSessionState, // Not directly used as type annotation for a var here
} from '../interfaces/fightService';
import type { StoneQualities } from '../interfaces/stone';
import { createStone, generateNewStoneSeed, calculateStonePower } from '../stone'; // Import createStone, generateNewStoneSeed, calculateStonePower
import type { Card } from '../interfaces/card';
import type { ActiveEffect } from '../interfaces/activeEffect';
import type { CombatParticipantState } from '../interfaces/combat';
import { createInitialCombatParticipantState } from '../interfaces/combat';
import type { IGameStateManager } from '../interfaces/gameStateManager';
import type { IRandomService } from '../interfaces/randomService';
import { getPredefinedCards } from '../config/cards'; // For playerSelectsCard placeholder

export class FightService implements IFightService {
  private fightSession: FightSession | null = null;

  constructor(
    private gameStateManager: IGameStateManager,
    private randomService: IRandomService
  ) {}

  // --- Helper Functions ---

// In src/services/fightService.ts, within the FightService class

private applyActiveEffectsToParticipant(
  participantState: CombatParticipantState,
  activeEffects: ActiveEffect[]
): CombatParticipantState {
  let modifiedState = { ...participantState };
  modifiedState.currentPower = modifiedState.basePower;
  modifiedState.currentDefense = modifiedState.baseDefense;

  for (const effect of activeEffects) {
    if (effect.powerBoost) {
      modifiedState.currentPower += effect.powerBoost;
    }
    if (effect.defenseBoost) {
      modifiedState.currentDefense += effect.defenseBoost;
    }
    if (effect.healAmount) {
      modifiedState.currentHealth += effect.healAmount;
    }
    // Add other direct effect processing here if needed, e.g.:
    // if (effect.damageAmount) {
    //   modifiedState.currentHealth -= effect.damageAmount;
    // }
  }

  // Clamp health to maxHealth and ensure it's not negative
  if (modifiedState.currentHealth > modifiedState.maxHealth) {
    modifiedState.currentHealth = modifiedState.maxHealth;
  }
  modifiedState.currentHealth = Math.max(0, modifiedState.currentHealth);

  // Ensure power/defense don't go below 0
  modifiedState.currentPower = Math.max(0, modifiedState.currentPower);
  modifiedState.currentDefense = Math.max(0, modifiedState.currentDefense);

  return modifiedState;
}

  private updateAndCleanupActiveEffects(participantId: 'player'): void {
    let currentEffects: ActiveEffect[];
    if (participantId === 'player') {
      currentEffects = this.gameStateManager.getCurrentState().playerActiveCombatEffects;
    } else {
      return;
    }

    const updatedEffects = currentEffects
      .map(effect => ({ ...effect, remainingDuration: effect.remainingDuration - 1 }))
      .filter(effect => effect.remainingDuration > 0);

    if (participantId === 'player') {
      this.gameStateManager.updatePlayerActiveCombatEffects(updatedEffects);
    }
  }


  // --- IFightService Implementation ---

  public async startFight(playerStoneId: number, opponentStoneQualities: StoneQualities): Promise<FightSession> {
    const playerStone = this.gameStateManager.getStoneById(playerStoneId);
    if (!playerStone) {
      throw new Error(`Player stone with ID ${playerStoneId} not found.`);
    }

    const playerInitialCombatState = createInitialCombatParticipantState(playerStone);
    const opponentInitialCombatState = createInitialCombatParticipantState(opponentStoneQualities);

    this.fightSession = {
      sessionId: this.randomService.generateSeed().toString(),
      player: {
        stoneId: playerStoneId,
        combatState: playerInitialCombatState,
      },
      opponent: {
        stoneId: opponentStoneQualities.seed,
        combatState: opponentInitialCombatState,
      },
      currentRound: 0,
      isFightOver: false,
      log: [`Fight started: Player (Stone ${playerStone.seed}) vs Opponent (Stone ${opponentStoneQualities.seed})`],
    };

    this.gameStateManager.updatePlayerActiveCombatEffects([]);

    return JSON.parse(JSON.stringify(this.fightSession)); // Return a deep copy
  }

  public async getCurrentFightSession(): Promise<FightSession | null> {
    return this.fightSession ? JSON.parse(JSON.stringify(this.fightSession)) : null; // Return a deep copy
  }

  public async startNewRound(): Promise<NewRoundInfo> {
    if (!this.fightSession || this.fightSession.isFightOver) {
      throw new Error('Fight is not active or already over.');
    }

    this.fightSession.currentRound += 1;
    this.fightSession.log.push(`Round ${this.fightSession.currentRound} begins.`);

    let playerEffects = this.gameStateManager.getCurrentState().playerActiveCombatEffects;
    const playerBaseStone = this.gameStateManager.getStoneById(this.fightSession.player.stoneId);
    if (!playerBaseStone) throw new Error("Player base stone not found during startNewRound");
    // Ensure player's combatState in fightSession is based on the latest from GameStateManager effects
    this.fightSession.player.combatState = this.applyActiveEffectsToParticipant(
        createInitialCombatParticipantState(playerBaseStone, this.fightSession.player.combatState.maxHealth), // Get fresh base state, but preserve maxHealth if it can change
        playerEffects
    );
    // Opponent state (assuming no effects managed by GSM for opponent for now)
    // Opponent's activeEffects are part of its CombatParticipantState, managed locally within FightService per fight
    this.fightSession.opponent.combatState = this.applyActiveEffectsToParticipant(
      this.fightSession.opponent.combatState, // Use current opponent state (base values will be reset by applyActiveEffectsToParticipant)
      this.fightSession.opponent.combatState.activeEffects // Apply its own effects
    );

    const cardsForChoice = this.gameStateManager.drawCardsFromDeck(3);
    if (cardsForChoice.length === 0) {
        this.fightSession.log.push('No cards left to draw for player choice.');
    }

    // Set currentRoundChoices to the drawn cards
    this.fightSession.currentRoundChoices = cardsForChoice;

    return {
      roundNumber: this.fightSession.currentRound,
      cardsForChoice,
      playerHealth: this.fightSession.player.combatState.currentHealth,
      opponentHealth: this.fightSession.opponent.combatState.currentHealth,
    };
  }

  public async playerSelectsCard(chosenCardId: string, discardedCardIds: string[]): Promise<FightSession> {
    if (!this.fightSession || this.fightSession.isFightOver) {
      throw new Error('Fight is not active or already over.');
    }

    const chosen = this.fightSession.currentRoundChoices.find(c => c.id === chosenCardId);
    if (!chosen) {
      throw new Error('Invalid card choice');
    }

    // Add the chosen card to the hand
    await this.gameStateManager.addCardsToHand([chosen]);

    // Remove the chosen card from the hand
    await this.gameStateManager.removeCardFromHand(chosenCardId);

    // Add discarded cards to the discard pile
    if (discardedCardIds.length > 0) {
      const discarded = this.fightSession.currentRoundChoices.filter(c => discardedCardIds.includes(c.id));
      await this.gameStateManager.addCardsToDiscardPile(discarded);
    }

    return JSON.parse(JSON.stringify(this.fightSession));
  }

  public async playerPlaysCard(cardId: string, targetId: 'player' | 'opponent'): Promise<CardPlayOutcome> {
    if (!this.fightSession || this.fightSession.isFightOver) {
      throw new Error('Fight is not active or already over.');
    }

    const cardFromHand = this.gameStateManager.removeCardFromHand(cardId);
    if (!cardFromHand) {
      return {
        success: false,
        message: 'Card not found in hand.',
        activeEffectsPlayer: this.gameStateManager.getCurrentState().playerActiveCombatEffects
      };
    }
    this.gameStateManager.addCardsToDiscardPile([cardFromHand]); // Add the actual played card instance

    this.fightSession.log.push(`Player plays ${cardFromHand.name} targeting ${targetId}. Effect: ${cardFromHand.effect.description}`);

    let targetSessionParticipantState: CombatParticipantState;
    let currentTargetActiveEffects: ActiveEffect[];

    if (targetId === 'player') {
      targetSessionParticipantState = this.fightSession.player.combatState;
      currentTargetActiveEffects = this.gameStateManager.getCurrentState().playerActiveCombatEffects;
    } else {
      targetSessionParticipantState = this.fightSession.opponent.combatState;
      currentTargetActiveEffects = this.fightSession.opponent.combatState.activeEffects;
    }

    const newEffectsListForTarget = cardFromHand.effect.apply(targetSessionParticipantState, currentTargetActiveEffects);

    if (targetId === 'player') {
      this.gameStateManager.updatePlayerActiveCombatEffects(newEffectsListForTarget);
      // Update the fight session's view of player state immediately
      this.fightSession.player.combatState = this.applyActiveEffectsToParticipant(
        targetSessionParticipantState, // Pass the existing state from fight session
        newEffectsListForTarget
      );
    } else {
      this.fightSession.opponent.combatState.activeEffects = newEffectsListForTarget;
      this.fightSession.opponent.combatState = this.applyActiveEffectsToParticipant(
        targetSessionParticipantState, // Pass the existing state from fight session
        newEffectsListForTarget
      );
    }

    this.fightSession.log.push(`${cardFromHand.name} effect applied.`);

    return {
      success: true,
      message: `${cardFromHand.name} played successfully.`,
      updatedPlayerState: this.fightSession.player.combatState,
      updatedOpponentState: this.fightSession.opponent.combatState,
      activeEffectsPlayer: this.gameStateManager.getCurrentState().playerActiveCombatEffects,
    };
  }

  public async resolveCurrentRound(): Promise<RoundResolutionOutcome> {
    if (!this.fightSession || this.fightSession.isFightOver) {
      throw new Error('Fight is not active or already over.');
    }

    const player = this.fightSession.player;
    const opponent = this.fightSession.opponent;

    // Log initial states
    console.log('Initial Player Health:', player.combatState.currentHealth);
    console.log('Initial Opponent Health:', opponent.combatState.currentHealth);
    console.log('Initial Player Effects:', this.gameStateManager.getCurrentState().playerActiveCombatEffects);

    // Ensure combat states are up-to-date with latest effects before resolution
    player.combatState = this.applyActiveEffectsToParticipant(player.combatState, this.gameStateManager.getCurrentState().playerActiveCombatEffects);
    opponent.combatState = this.applyActiveEffectsToParticipant(opponent.combatState, opponent.combatState.activeEffects);

    let playerDamage = Math.max(0, player.combatState.currentPower - opponent.combatState.currentDefense);
    let opponentDamage = Math.max(0, opponent.combatState.currentPower - player.combatState.currentDefense);

    opponent.combatState.currentHealth -= playerDamage;
    player.combatState.currentHealth -= opponentDamage;

    opponent.combatState.currentHealth = Math.max(0, opponent.combatState.currentHealth);
    player.combatState.currentHealth = Math.max(0, player.combatState.currentHealth);

    // Log states after damage calculation
    console.log('Player Health After Damage:', player.combatState.currentHealth);
    console.log('Opponent Health After Damage:', opponent.combatState.currentHealth);

    let roundLog = `Round ${this.fightSession.currentRound} resolved: Player (H:${player.combatState.currentHealth}) dealt ${playerDamage}. Opponent (H:${opponent.combatState.currentHealth}) dealt ${opponentDamage}.`;
    this.fightSession.log.push(roundLog);

    this.updateAndCleanupActiveEffects('player');

    // Log player effects after cleanup
    console.log('Player Effects After Cleanup:', this.gameStateManager.getCurrentState().playerActiveCombatEffects);

    // Opponent effect cleanup (if they have effects in their own list)
    if (this.fightSession.opponent.combatState.activeEffects) {
        const remainingOpponentEffects = this.fightSession.opponent.combatState.activeEffects
            .map(effect => ({ ...effect, remainingDuration: effect.remainingDuration - 1 }))
            .filter(effect => effect.remainingDuration > 0);
        this.fightSession.opponent.combatState.activeEffects = remainingOpponentEffects;
        // Re-apply opponent effects after duration update and potential removal
        this.fightSession.opponent.combatState = this.applyActiveEffectsToParticipant(this.fightSession.opponent.combatState, remainingOpponentEffects);
    }

    if (player.combatState.currentHealth <= 0 || opponent.combatState.currentHealth <= 0) {
      this.fightSession.isFightOver = true;
      if (player.combatState.currentHealth <= 0 && opponent.combatState.currentHealth <= 0) {
        this.fightSession.winner = 'tie';
      } else if (player.combatState.currentHealth <= 0) {
        this.fightSession.winner = 'opponent';
      } else {
        this.fightSession.winner = 'player';
      }
      this.fightSession.log.push(`Fight Over! Winner: ${this.fightSession.winner}`);
    }

    return {
      roundNumber: this.fightSession.currentRound,
      playerDamageDealt: playerDamage,
      opponentDamageDealt: opponentDamage,
      playerHealth: player.combatState.currentHealth,
      opponentHealth: opponent.combatState.currentHealth,
      roundWinner: this.fightSession.isFightOver ? this.fightSession.winner : 'ongoing',
      logEntry: roundLog,
      activeEffectsPlayer: this.gameStateManager.getCurrentState().playerActiveCombatEffects,
    };
  }

  public async endFight(): Promise<FightOutcome | null> {
    if (!this.fightSession) {
      return null;
    }
    if (!this.fightSession.isFightOver) {
      this.fightSession.log.push("Fight ended by other means (e.g. flee - not implemented).");
      this.fightSession.winner = this.fightSession.winner || 'tie';
    }

    const outcome: FightOutcome = {
      playerStoneId: this.fightSession.player.stoneId,
      opponentStoneId: this.fightSession.opponent.stoneId,
      winner: this.fightSession.winner || 'tie',
      log: [...this.fightSession.log],
      currencyChange: 0,
      stoneLostByPlayer: false,
      newStoneGainedByPlayer: undefined,
    };

    if (outcome.winner === 'player') {
      outcome.currencyChange = 10;
      if (this.randomService.getRandom() < 0.1) {
        const newStoneSeed = generateNewStoneSeed(() => this.randomService.getRandom());
        const newStone = createStone(newStoneSeed);
        outcome.newStoneGainedByPlayer = newStone;
        //this.fightSession.log.push(`Player found a new stone (Seed: ${newStone.seed})!`); // Log is part of outcome.log now
        if (newStone) {
            this.gameStateManager.addStoneToInventory(newStone);
        }
      }
    } else if (outcome.winner === 'opponent') {
      if (this.randomService.getRandom() < 0.15) {
        outcome.stoneLostByPlayer = true;
        //this.fightSession.log.push(`Player's stone (ID: ${outcome.playerStoneId}) was lost!`);
        this.gameStateManager.removeStoneFromInventory(outcome.playerStoneId);
      }
    }

    if (outcome.currencyChange) {
        this.gameStateManager.updateCurrency(outcome.currencyChange);
    }

    const finalOutcomeLog = `Final outcome: Winner ${outcome.winner}. Currency: ${outcome.currencyChange}. Stone Lost: ${outcome.stoneLostByPlayer}. New Stone: ${outcome.newStoneGainedByPlayer?.seed || 'N/A'}`;
    outcome.log.push(finalOutcomeLog);

    this.fightSession = null; // Clear the session
    return outcome;
  }
}
