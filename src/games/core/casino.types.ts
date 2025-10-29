export type GameKey =
  | 'RPS'
  | 'numberGuesor'
  | 'hilo'
  | 'diceDuel'
  | 'hangman'
  | 'blackJack'
  | 'solitaire'
  | (string & {}); // rozšiřitelné

export type RoundResult = 'win' | 'loss' | 'draw';

export interface PriceEntry {
  entry: number;
  win?: number;
  draw?: number;
}

export type PriceTable = Record<GameKey, PriceEntry>;

export interface CasinoConfig {
  startBalance: number;
  storageKey: string;
  priceTable: PriceTable;
}

export interface RoundHistory {
  gameKey: GameKey;
  roundId: string;
  ts: number;
  entry: number;
  result: RoundResult | null;
  payout: number;
  meta?: any;
  details?: any;
}

export interface Aggregate {
  games: number;
  wins: number;
  losses: number;
  draws: number;
  coinsWon: number;
  coinsLost: number;
  bestStreak: number;
  curStreak: number;
}

export interface StatsSnapshot {
  global: EnrichedAgg;
  byGame: Record<string, EnrichedAgg>;
}

export interface EnrichedAgg extends Aggregate {
  winRate: number;
  net: number;
}

export interface CasinoState {
  balance: number;
  history: RoundHistory[];
  aggregate: {
    global: Aggregate;
    byGame: Record<string, Aggregate>;
  };
  daily: {
    lastYMD: string | null;
    amount: number;
  };
}

export type CasinoEventType =
  | 'init'
  | 'balance'
  | 'roundStart'
  | 'roundFinish'
  | 'dailyBonus'
  | 'reset';

export interface CasinoEvent<T = any> {
  type: CasinoEventType;
  payload?: T;
}
