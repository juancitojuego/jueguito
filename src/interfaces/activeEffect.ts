// src/interfaces/activeEffect.ts
export interface ActiveEffect {
  id: string;
  name: string;
  description: string;
  remainingDuration: number;

  powerBoost?: number;
  defenseBoost?: number;
  healAmount?: number; // Added for instant healing effects
  // damageAmount?: number; // Example for direct damage, if needed later
}
