import type { GameKey } from '@games/core/casino.types';

export type GameId = 'rps' | 'solitaire' | 'reaction' | 'pexeso' | (string & {});

export type GameMeta = {
  id: GameId;
  key: GameKey;
  path: `/games/${string}`;
  title: string;
  minLevel: number; // gating
  phase: 1 | 2 | 3;
  tag?: string;
  disabled?: boolean; // zobrazení „Brzy“
};

export const GAMES: GameMeta[] = [
  {
    id: 'rps',
    key: 'RPS',
    path: '/games/rps',
    title: 'Kámen–Nůžky–Papír',
    minLevel: 0,
    phase: 1,
    tag: 'mini',
  },
  {
    id: 'solitaire',
    key: 'solitaire',
    path: '/games/solitaire',
    title: 'Solitér (1-card)',
    minLevel: 5, // dle plánu je v Fázi 2 (L5+)
    phase: 2,
    tag: 'karetní',
  },
  // připravené placeholdery (nezobrazujeme tlačítko „Hrát“)
  {
    id: 'reaction',
    key: 'reaction' as GameKey,
    path: '/games/reaction',
    title: 'Reaction Tap',
    minLevel: 0,
    phase: 1,
    tag: 'reflex',
    disabled: true,
  },
  {
    id: 'pexeso',
    key: 'pexeso' as GameKey,
    path: '/games/pexeso',
    title: 'Pexeso 3×4',
    minLevel: 2,
    phase: 1,
    tag: 'logická',
    disabled: true,
  },
];

export function getGameByPath(path: string) {
  return GAMES.find((g) => g.path === path) ?? null;
}

export function isUnlocked(playerLevel: number, game: GameMeta): boolean {
  return playerLevel >= (game?.minLevel ?? 0);
}
