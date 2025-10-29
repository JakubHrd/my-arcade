// Základní typy pro metaprogressi hráče (profil, XP/level, avatary, odznaky, kosmetika)

export type PlayerId = string & {};
export type BadgeId = string & {};
export type CosmeticId = string & {};
export type AvatarId = string & {};

export interface Progression {
  /** Celkové nasbírané XP (kumulativně). */
  xp: number;
  /** Vypočtená úroveň (0–30). */
  level: number;
}

export interface Inventory {
  /** Odemčené kosmetické položky (např. avatar frame, barvy, efekty…). */
  cosmetics: Record<CosmeticId, true>;
}

export interface Equipped {
  /** Zvolený avatar (povinný po onboardingu). */
  avatarId: AvatarId | null;
  /** Volitelný rám/skin avataru. */
  frameId?: CosmeticId | null;
}

export interface PlayerProfile {
  id: PlayerId;
  nickname: string;
  createdAt: number; // ts
  /** Základní měna pro shop/metu (oddělené od "casino.balance"). */
  coins: number;
  progression: Progression;
  badges: Record<BadgeId, true>;
  inventory: Inventory;
  equipped: Equipped;

  /** Onboarding flag – dokud není hotový, ukážeme OnboardingDialog. */
  onboardingDone: boolean;
}

/** Default nového profilu (bez perzistence). */
export const createDefaultProfile = (): PlayerProfile => ({
  id: `player-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
  nickname: '',
  createdAt: Date.now(),
  coins: 0,
  progression: { xp: 0, level: 0 },
  badges: {},
  inventory: { cosmetics: {} },
  equipped: { avatarId: null, frameId: null },
  onboardingDone: false,
});
