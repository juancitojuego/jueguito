// src/services/serviceInstances.ts

import { RandomService } from './randomService';
import { GameStateManager } from './gameStateManager';
import { FightService } from './fightService';

const randomServiceInstance = new RandomService(); // Initialized with a default seed (Date.now())
const gameStateManagerInstance = new GameStateManager(randomServiceInstance);
const fightServiceInstance = new FightService(randomServiceInstance);

export {
  randomServiceInstance,
  gameStateManagerInstance,
  fightServiceInstance,
};
