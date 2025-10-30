import { playerApi } from '@games/core/player.api';
import type { RoundResult } from './Dice.logic';

/** Meta odměny (nezávislé na Casino.balance) – sladěné s RPS/Hilo stylem. */
export function calculateDiceRewards(result: RoundResult) {
  switch (result) {
    case 'win':  return { xp: 18, coins: 6 };
    case 'draw': return { xp: 6,  coins: 2 };
    case 'loss': return { xp: 3,  coins: 0 };
  }
}

export function applyDiceRewards(result: RoundResult) {
  const { xp, coins } = calculateDiceRewards(result);
  if (xp > 0) playerApi.addXP(xp, { reason: `Dice:${result}` });
  if (coins > 0) playerApi.addCoins(coins);
}
