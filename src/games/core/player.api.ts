// Tenká API vrstva pro metaprogressi – volá se z UI a z her.
// Cílem je udržet herní logiku čistou (GameHost) a mít jednotné volání.

import { usePlayerStore,selectLevel,selectXP,selectCoins } from '@shared/store/playerStore';
import { AvatarId, BadgeId, CosmeticId } from '@shared/types/profile';
import { levelProgressPct } from '@shared/types/economy';

export const playerApi = {
  // --- Čtení/selektory ---
  getProfile() {
    const s = usePlayerStore.getState();
    return s.profile;
  },
  getLevel() {
    return usePlayerStore(selectLevel);
  },
  getXP() {
    return usePlayerStore(selectXP);
  },
  getXPProgressPct() {
    return levelProgressPct(usePlayerStore.getState().profile.progression.xp);
  },
  getCoins() {
    return usePlayerStore(selectCoins);
  },
  hasBadge(id: BadgeId) {
    return usePlayerStore.getState().hasBadge(id);
  },
  hasCosmetic(id: CosmeticId) {
    return usePlayerStore.getState().hasCosmetic(id);
  },

  // --- Mutace ---
  addXP(amount: number, meta?: { reason?: string }) {
    return usePlayerStore.getState().addXP(amount, meta);
  },
  addCoins(amount: number) {
    return usePlayerStore.getState().addCoins(amount);
  },
  spendCoins(amount: number) {
    return usePlayerStore.getState().spendCoins(amount);
  },
  setNickname(nick: string) {
    return usePlayerStore.getState().setNickname(nick);
  },
  setAvatar(avatarId: AvatarId) {
    return usePlayerStore.getState().setAvatar(avatarId);
  },
  grantBadge(id: BadgeId) {
    return usePlayerStore.getState().grantBadge(id);
  },
  grantCosmetic(id: CosmeticId) {
    return usePlayerStore.getState().grantCosmetic(id);
  },

  // --- Onboarding ---
  completeOnboarding(payload: { nickname: string; avatarId: AvatarId }) {
    return usePlayerStore.getState().completeOnboarding(payload);
  },
};
