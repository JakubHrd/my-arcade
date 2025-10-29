// Zustand store s persistencí pro profil hráče (meta–progrese).

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createDefaultProfile, PlayerProfile, BadgeId, CosmeticId, AvatarId } from '@shared/types/profile';
import { ECONOMY_CONSTANTS, levelFromXP } from '@shared/types/economy';

type PlayerStoreVersion = 1;

export interface PlayerState {
  version: PlayerStoreVersion;
  profile: PlayerProfile;

  // --- Akce
  setNickname(nick: string): void;
  setAvatar(avatarId: AvatarId): void;

  addXP(amount: number, meta?: { reason?: string }): { newXP: number; newLevel: number; leveledUp: boolean };
  addCoins(amount: number): number;
  spendCoins(amount: number): boolean;

  grantBadge(id: BadgeId): void;
  hasBadge(id: BadgeId): boolean;

  grantCosmetic(id: CosmeticId): void;
  hasCosmetic(id: CosmeticId): boolean;

  completeOnboarding(payload: { nickname: string; avatarId: AvatarId }): void;

  // Údržba
  resetProfile(): void;
}

const STORAGE_KEY = 'player_v1';

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      version: 1 as PlayerStoreVersion,
      profile: createDefaultProfile(),

      setNickname(nickname) {
        set((s) => ({ profile: { ...s.profile, nickname } }));
      },

      setAvatar(avatarId) {
        set((s) => ({ profile: { ...s.profile, equipped: { ...s.profile.equipped, avatarId } } }));
      },

      addXP(amount, _meta) {
        const safe = Math.max(0, Math.floor(amount || 0));
        if (safe <= 0) {
          const xp = get().profile.progression.xp;
          const level = get().profile.progression.level;
          return { newXP: xp, newLevel: level, leveledUp: false };
        }

        let leveledUp = false;
        set((s) => {
          const total = s.profile.progression.xp + safe;
          const level = levelFromXP(total);
          if (level > s.profile.progression.level) leveledUp = true;
          return {
            profile: {
              ...s.profile,
              progression: { xp: total, level },
            },
          };
        });
        const xp = get().profile.progression.xp;
        const level = get().profile.progression.level;
        return { newXP: xp, newLevel: level, leveledUp };
      },

      addCoins(amount) {
        const safe = Math.max(0, Math.floor(amount || 0));
        if (safe <= 0) return get().profile.coins;
        set((s) => ({ profile: { ...s.profile, coins: s.profile.coins + safe } }));
        return get().profile.coins;
      },

      spendCoins(amount) {
        const safe = Math.max(0, Math.floor(amount || 0));
        const coins = get().profile.coins;
        if (safe <= 0) return true;
        if (coins < safe) return false;
        set((s) => ({ profile: { ...s.profile, coins: s.profile.coins - safe } }));
        return true;
      },

      grantBadge(id) {
        set((s) => ({ profile: { ...s.profile, badges: { ...s.profile.badges, [id]: true } } }));
      },
      hasBadge(id) {
        return !!get().profile.badges[id];
      },

      grantCosmetic(id) {
        set((s) => ({
          profile: {
            ...s.profile,
            inventory: { cosmetics: { ...s.profile.inventory.cosmetics, [id]: true } },
          },
        }));
      },
      hasCosmetic(id) {
        return !!get().profile.inventory.cosmetics[id];
      },

      completeOnboarding({ nickname, avatarId }) {
        set((s) => ({
          profile: {
            ...s.profile,
            nickname,
            equipped: { ...s.profile.equipped, avatarId },
            onboardingDone: true,
            coins: s.profile.coins + ECONOMY_CONSTANTS.startCoins,
          },
        }));
      },

      resetProfile() {
        set(() => ({ profile: createDefaultProfile() }));
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted: any) => persisted, // V1 -> V1
      partialize: (state) => ({
        version: state.version,
        profile: state.profile,
      }),
    },
  ),
);

/** 🔎 Doporučené selektory pro čtení (bez getterů) */
export const selectProfile = (s: PlayerState) => s.profile;
export const selectXP = (s: PlayerState) => s.profile.progression.xp;
export const selectLevel = (s: PlayerState) => s.profile.progression.level;
export const selectCoins = (s: PlayerState) => s.profile.coins;
