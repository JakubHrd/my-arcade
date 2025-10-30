import {
  Aggregate,
  CasinoConfig,
  CasinoEvent,
  CasinoState,
  GameKey,
  PriceTable,
  RoundResult,
  StatsSnapshot,
} from './casino.types';

type Listener = (evt: CasinoEvent) => void;

const DEFAULTS: CasinoConfig = {
  startBalance: 250,
  storageKey: 'casino_v2_state',
  priceTable: {
    RPS: { entry: 5, win: 10, draw: 3 },
    numberGuesor: { entry: 5, win: 10, draw: 0 },
    hilo: { entry: 6, win: 12, draw: 0 },
    memory: { entry: 6, win: 12, draw: 0 },
    diceDuel: { entry: 7, win: 14, draw: 5 },
    hangman: { entry: 6, win: 18, draw: 0 },
    blackJack: { entry: 0 }, // speciál
    solitaire: { entry: 6, win: 18, draw: 0 },
    reaction: { entry: 4, win: 9, draw: 0 },
  } as PriceTable,
};

const listeners = new Set<Listener>();
let cfg: CasinoConfig = DEFAULTS;
let state: CasinoState;

const ymd = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const i32 = (v: any, min = 0) => Math.max(min, Math.floor(Number(v) || 0));

const LS = {
  load<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  save<T>(key: string, value: T) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
};

const baseAgg = (): Aggregate => ({
  games: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  coinsWon: 0,
  coinsLost: 0,
  bestStreak: 0,
  curStreak: 0,
});

const freshState = (): CasinoState => ({
  balance: cfg.startBalance,
  history: [],
  aggregate: { global: baseAgg(), byGame: {} },
  daily: { lastYMD: null, amount: 0 },
});

const ensureGameAgg = (key: string) => {
  const g = state.aggregate.byGame[key];
  if (g) return g;
  state.aggregate.byGame[key] = baseAgg();
  return state.aggregate.byGame[key];
};

const save = () => LS.save(cfg.storageKey, state);
const emit = (type: CasinoEvent['type'], payload?: any) => {
  listeners.forEach((fn) => {
    try {
      fn({ type, payload });
    } catch {}
  });
};

const setBalance = (v: number) => {
  state.balance = i32(v);
  save();
  emit('balance', { balance: state.balance });
};

export const Casino = {
  init(options?: Partial<CasinoConfig>) {
    const prevKey = options?.storageKey ?? DEFAULTS.storageKey;
    cfg = {
      startBalance: i32(options?.startBalance ?? DEFAULTS.startBalance),
      storageKey: prevKey,
      priceTable: { ...DEFAULTS.priceTable, ...(options?.priceTable ?? {}) },
    };
    const legacy = LS.load<CasinoState | null>('casino_v1_state', null);
    const loaded = LS.load<CasinoState | null>(cfg.storageKey, legacy);
    state = loaded && typeof loaded === 'object' ? { ...freshState(), ...loaded } : freshState();
    save();
    emit('init', { balance: state.balance, cfg });
    return { balance: state.balance, cfg };
  },

  get config() {
    // deep copy kvůli imutabilitě venku
    return JSON.parse(JSON.stringify(cfg)) as CasinoConfig;
  },

  getBalance() {
    return state?.balance ?? 0;
  },

  canAfford(cost: number) {
    return state.balance >= i32(cost);
  },

  spend(cost: number) {
    cost = i32(cost);
    if (cost === 0) return true;
    if (state.balance < cost) return false;
    setBalance(state.balance - cost);
    return true;
  },

  payout(amount: number) {
    amount = i32(amount);
    if (amount > 0) setBalance(state.balance + amount);
  },

  startRound(gameKey: GameKey, meta?: any) {
    const entry = i32(cfg.priceTable[gameKey]?.entry ?? 0);
    if (entry > 0 && !this.spend(entry)) {
      return { ok: false as const, reason: 'INSUFFICIENT_FUNDS' as const };
    }
    const roundId = `${gameKey}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    state.history.push({ gameKey, roundId, ts: Date.now(), entry, result: null, payout: 0, meta: meta ?? null });
    state.aggregate.global.games++;
    ensureGameAgg(gameKey).games++;
    save();
    emit('roundStart', { gameKey, roundId, entry });
    return { ok: true as const, roundId };
  },

  finishRound(
    gameKey: GameKey,
    opts: { roundId: string; result: RoundResult; payout: number; details?: any },
  ) {
    const { roundId, result } = opts;
    if (!['win', 'loss', 'draw'].includes(result)) return;

    const hist = state.history.find((h) => h.roundId === roundId && h.gameKey === gameKey);
    if (hist) Object.assign(hist, { result, payout: i32(opts.payout), details: opts.details });

    if (opts.payout > 0) this.payout(opts.payout);

    const g = state.aggregate.global;
    const per = ensureGameAgg(gameKey);
    const entry = i32(cfg.priceTable[gameKey]?.entry ?? 0);

    const apply = (agg: Aggregate, r: RoundResult) => {
      if (r === 'win') agg.wins++;
      if (r === 'loss') agg.losses++;
      if (r === 'draw') agg.draws++;
    };
    apply(g, result);
    apply(per, result);

    if (result === 'win') {
      g.curStreak++;
      if (g.curStreak > g.bestStreak) g.bestStreak = g.curStreak;
    } else if (result === 'loss') {
      g.curStreak = 0;
    }

    if (opts.payout > 0) {
      g.coinsWon += i32(opts.payout);
      per.coinsWon += i32(opts.payout);
    }
    if (entry > 0) {
      g.coinsLost += entry;
      per.coinsLost += entry;
    }

    save();
    emit('roundFinish', { gameKey, roundId, result, payout: opts.payout, balance: state.balance, details: opts.details ?? null });
  },

  defaultPayout(gameKey: GameKey, result: RoundResult) {
    const pt = cfg.priceTable[gameKey] || {};
    return i32(result === 'win' ? pt.win : result === 'draw' ? pt.draw : 0);
  },

  stats: {
    get(gameKey?: GameKey): StatsSnapshot | any {
      const enrich = (s: Aggregate) => {
        const { games, wins, losses, draws, coinsWon, coinsLost } = s;
        const total = games || 0;
        const winRate = total ? Math.round(((wins || 0) / total) * 100) : 0;
        const net = (coinsWon || 0) - (coinsLost || 0);
        return { ...s, games: total, wins: wins || 0, losses: losses || 0, draws: draws || 0, coinsWon: coinsWon || 0, coinsLost: coinsLost || 0, winRate, net };
      };
      if (!gameKey) {
        const byGame: Record<string, any> = {};
        for (const k in state.aggregate.byGame) byGame[k] = enrich(state.aggregate.byGame[k]);
        return { global: enrich(state.aggregate.global), byGame };
      }
      return enrich(ensureGameAgg(gameKey));
    },
  },

  maybeDailyBonus(amount = 20) {
    const today = ymd();
    if (state.daily.lastYMD === today) {
      return { granted: false, balance: state.balance, nextAt: new Date(new Date().setDate(new Date().getDate() + 1)) };
    }
    state.daily.lastYMD = today;
    state.daily.amount = i32(amount);
    this.payout(state.daily.amount);
    save();
    emit('dailyBonus', { amount: state.daily.amount, balance: state.balance, date: today });
    return { granted: true, balance: state.balance, nextAt: new Date(new Date().setDate(new Date().getDate() + 1)) };
  },

  resetAll() {
    state = freshState();
    save();
    emit('reset', { balance: state.balance });
  },

  subscribe(fn: Listener) {
    if (typeof fn !== 'function') return () => {};
    listeners.add(fn);
    try {
      fn({ type: 'init', payload: { balance: state.balance, cfg } });
    } catch {}
    return () => listeners.delete(fn);
  },
};

// auto-init při importu (stejně jako původní core)
(() => {
  Casino.init({});
})();
