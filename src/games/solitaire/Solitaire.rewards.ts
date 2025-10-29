import { playerApi } from '@games/core/player.api';

export type SolitaireOutcome = 'win' | 'loss';

/** Odměny pro Solitaire (můžeš kdykoli upravit) */
export function calculateSolitaireRewards(outcome: SolitaireOutcome, context?: { moves?: number; timeSec?: number }) {
  if (outcome === 'win') {
    // Můžeš později navázat na moves/timeSec pro bonusy
    return { xp: 40, coins: 12 };
  }
  return { xp: 6, coins: 0 };
}

export function applySolitaireRewards(outcome: SolitaireOutcome, context?: { moves?: number; timeSec?: number }) {
  const { xp, coins } = calculateSolitaireRewards(outcome, context);
  if (xp > 0) playerApi.addXP(xp, { reason: `Solitaire:${outcome}` });
  if (coins > 0) playerApi.addCoins(coins);
}
