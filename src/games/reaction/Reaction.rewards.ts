import { playerApi } from '@games/core/player.api';

// XP + meta-coins dle výsledku/času (mírné, aby nerušilo casino výplaty)
export function applyReactionRewards(payload: { ms: number | null; foul: boolean }) {
  if (payload.foul) {
    // drobná "útěcha"
    playerApi.addXP(2, { reason: 'Reaction:foul' });
    return;
  }
  const ms = payload.ms ?? 9999;
  if (ms <= 280) {
    playerApi.addXP(22, { reason: 'Reaction:pro' });
    playerApi.addCoins(6);
  } else if (ms <= 320) {
    playerApi.addXP(18, { reason: 'Reaction:win' });
    playerApi.addCoins(5);
  } else if (ms <= 420) {
    playerApi.addXP(10, { reason: 'Reaction:draw' });
    playerApi.addCoins(3);
  } else {
    playerApi.addXP(4, { reason: 'Reaction:loss' });
  }
}
