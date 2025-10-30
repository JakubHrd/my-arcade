import { playerApi } from '@games/core/player.api';

export function applyHiloRewards(result: 'win'|'loss', ctx: { correct: number; livesLeft: number }) {
  // jednoduchá tabulka (můžeš vyladit):
  const xp = result === 'win' ? 24 + ctx.correct * 2 : 6;
  const coins = result === 'win' ? 6 : 0;
  if (xp > 0) playerApi.addXP(xp, { reason: `HiLo:${result}` });
  if (coins > 0) playerApi.addCoins(coins);
}
