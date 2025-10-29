// Ekonomika a levelování: křivka XP pro levely 0–30 + pomocné výpočty

/** Maximální dosažitelný level. */
export const LEVEL_CAP = 30 as const;

/**
 * Kumulativní XP potřebné pro dosažení daného levelu.
 * Index = level (0..30), hodnota = celkové XP k dosažení levelu.
 * Příklad: k dosažení levelu 5 je potřeba >= 520 XP.
 */
export const LEVEL_XP: number[] = [
  // lvl : cumulative XP
  /*  0 */ 0,
  /*  1 */ 0,
  /*  2 */ 100,
  /*  3 */ 220,
  /*  4 */ 360,
  /*  5 */ 520,
  /*  6 */ 700,
  /*  7 */ 900,
  /*  8 */ 1120,
  /*  9 */ 1360,
  /* 10 */ 1620,
  /* 11 */ 1900,
  /* 12 */ 2200,
  /* 13 */ 2520,
  /* 14 */ 2860,
  /* 15 */ 3220,
  /* 16 */ 3600,
  /* 17 */ 4000,
  /* 18 */ 4420,
  /* 19 */ 4860,
  /* 20 */ 5320,
  /* 21 */ 5800,
  /* 22 */ 6300,
  /* 23 */ 6820,
  /* 24 */ 7360,
  /* 25 */ 7920,
  /* 26 */ 8500,
  /* 27 */ 9100,
  /* 28 */ 9720,
  /* 29 */ 10360,
  /* 30 */ 11020,
];

/** Bezpečné ořezání čísla. */
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, Math.floor(n)));

/** Zjištění levelu z celkových XP (0..LEVEL_CAP). */
export function levelFromXP(totalXP: number): number {
  const xp = Math.max(0, Math.floor(totalXP || 0));
  // najdeme nejvyšší level, jehož práh nepřevyšuje xp
  let lvl = 0;
  for (let i = 0; i <= LEVEL_CAP; i++) {
    if (LEVEL_XP[i] <= xp) lvl = i;
    else break;
  }
  return clamp(lvl, 0, LEVEL_CAP);
}

/** Kumulativní XP práh pro další level (nebo null, pokud jsme v capu). */
export function nextLevelThreshold(level: number): number | null {
  const l = clamp(level, 0, LEVEL_CAP);
  if (l >= LEVEL_CAP) return null;
  return LEVEL_XP[l + 1];
}

/** Procento postupu v rámci aktuálního levelu (0–100). */
export function levelProgressPct(totalXP: number): number {
  const lvl = levelFromXP(totalXP);
  const curBase = LEVEL_XP[lvl];
  const next = nextLevelThreshold(lvl);
  if (next == null) return 100;
  const span = Math.max(1, next - curBase);
  return Math.round(((totalXP - curBase) / span) * 100);
}

/** Startovní odměny/konstanty pro hráče (meta). */
export const ECONOMY_CONSTANTS = {
  startCoins: 50, // pro onboarding grant (metaměna, ne kasino)
  minXPGrant: 5,  // ochrana proti 0
};
