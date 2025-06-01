import { RNG, StoneProperties, Stone } from '../types';

export function createStoneProperties(rng: RNG): StoneProperties {
  const colors = ["Red", "Green", "Blue", "Yellow", "Purple", "Orange", "Cyan", "Magenta"];
  const shapes = ["Sphere", "Cube", "Pyramid", "Obelisk", "Crystal", "Shard", "Geode", "Rock"];

  const color = colors[Math.floor(rng() * colors.length)];
  const shape = shapes[Math.floor(rng() * shapes.length)];
  const weight = Math.floor(rng() * 100) + 1; // 1-100
  const hardness = Math.floor(rng() * 101); // 0-100
  const rarity = Math.floor(rng() * 11); // 0-10

  return {
    color,
    shape,
    weight,
    hardness,
    rarity,
  };
}

export function openStone(rng: RNG, currentStoneIdCounter: number): { newStones: Stone[], nextStoneIdCounter: number } {
  const newStones: Stone[] = [];
  let stoneIdCounter = currentStoneIdCounter;

  // Determine number of stones
  let numberOfStonesToSpawn = 1;
  if (rng() < 0.10) {
    numberOfStonesToSpawn++;
  }
  if (rng() < 0.01) { // This check is independent for a potential third stone
    numberOfStonesToSpawn++;
  }

  for (let i = 0; i < numberOfStonesToSpawn; i++) {
    stoneIdCounter++;
    const properties = createStoneProperties(rng);
    const newStone: Stone = {
      id: stoneIdCounter,
      properties,
      createdAt: Math.floor(Date.now() / 1000), // Unix timestamp in seconds
    };
    newStones.push(newStone);
  }

  return { newStones, nextStoneIdCounter: stoneIdCounter };
}
