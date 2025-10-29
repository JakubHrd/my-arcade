import { playerApi } from '@games/core/player.api';
import type { RPSResult } from './RPS.logic';

/** Jednoduchá tabulka odměn pro RPS (meta, ne kasino balance). */
export function calculateRPSRewards(result: RPSResult): { xp: number; coins: number } {
  switch (result) {
    case 'win':
      return { xp: 20, coins: 8 };
    case 'draw':
      return { xp: 8, coins: 2 };
    case 'loss':
    default:
      return { xp: 4, coins: 0 };
  }
}

/** Aplikuje meta odměny hráči (bez vlivu na Casino.bank). */
export function applyRPSRewards(result: RPSResult) {
  const { xp, coins } = calculateRPSRewards(result);
  if (xp > 0) playerApi.addXP(xp, { reason: `RPS:${result}` });
  if (coins > 0) playerApi.addCoins(coins);
  console.log(`Player rewards`,{ xp, coins });
}
