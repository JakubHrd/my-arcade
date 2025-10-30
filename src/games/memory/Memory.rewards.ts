import type { Difficulty } from './Memory.logic';

export const MemoryRewards = {
  easy:   { coins: 20, xp: 30 },
  medium: { coins: 35, xp: 50 },
  hard:   { coins: 50, xp: 70 },
} as const;

export function speedBonusXP(timeSec: number): number {
  if (timeSec < 45) return 15;
  if (timeSec < 70) return 10;
  if (timeSec < 120) return 5;
  return 0;
}

export function totalReward(difficulty: Difficulty, timeSec: number) {
  const base = MemoryRewards[difficulty];
  const bonus = speedBonusXP(timeSec);
  return { coins: base.coins, xp: base.xp + bonus };
}
