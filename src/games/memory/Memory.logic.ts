// Čistá logika Pexesa (bez UI, bez side-effectů)

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface MemoryCard {
  id: number;       // stabilní index v poli
  symbol: string;   // emoji/symbol páru
  flipped: boolean; // aktuálně otočená (viditelná)
  matched: boolean; // již spárovaná (hotovo)
}

export type GameStatus = 'idle' | 'preview' | 'playing' | 'won';

export interface MemoryState {
  cards: MemoryCard[];
  flippedIdx: number[]; // indexy právě otočených (max 2)
  locked: boolean;      // blokace vstupu při vyhodnocení dvojice
  matches: number;      // počet nalezených párů
  moves: number;        // počet tahů (každé otočení druhé karty => +1)
  startedAt: number | null; // ts začátku (po preview)
  endedAt: number | null;   // ts konce (při výhře)
  difficulty: Difficulty;
  status: GameStatus;
  preview: { enabled: boolean; showing: boolean; ms: number };
}

/** Bezpečné shuffle (Fisher–Yates) in-place nad kopii pole. */
function shuffle<T>(arr: T[]): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// symbolů je víc než potřebujeme – pro hard je 10 párů (20 karet)
const SYMBOLS = [
  '🍒','🍋','🍀','⭐','💎','🎲','🧩','🔥','⚡','🎁',
  '🍉','🥝','🥑','🌙','☀️','🌈','🎈','🎯'
];

function pairsByDifficulty(diff: Difficulty): number {
  if (diff === 'easy') return 6;    // 12 karet
  if (diff === 'medium') return 8;  // 16 karet
  return 10;                        // 20 karet
}

export const MemoryLogic = {
  /** Inicializace hry. Pokud previewEnabled=true, začínáme ve stavu 'preview' a všechny karty jsou dočasně odkryté. */
  init(difficulty: Difficulty, previewEnabled = false, previewMs = 1500): MemoryState {
    const pairs = pairsByDifficulty(difficulty);
    const pool = SYMBOLS.slice(0, pairs);
    const deckSymbols = shuffle([...pool, ...pool]);

    const cards: MemoryCard[] = deckSymbols.map((symbol, i) => ({
      id: i,
      symbol,
      flipped: previewEnabled, // v preview jsou odkryté
      matched: false,
    }));

    return {
      cards,
      flippedIdx: [],
      locked: false,
      matches: 0,
      moves: 0,
      startedAt: null,
      endedAt: null,
      difficulty,
      status: previewEnabled ? 'preview' : 'idle',
      preview: { enabled: previewEnabled, showing: previewEnabled, ms: Math.max(300, previewMs | 0) },
    };
  },

  /** Ukončí preview: zakryje všechny ne-matched, nastaví status na 'playing' a nastartuje čas. */
  endPreview(state: MemoryState): MemoryState {
    if (state.status !== 'preview') return state;
    const cards = state.cards.map(c => ({ ...c, flipped: c.matched })); // vše krom matched zakrýt
    return {
      ...state,
      cards,
      status: 'playing',
      preview: { ...state.preview, showing: false },
      startedAt: Date.now(),
    };
  },

  /** Začne hru (bez preview): status -> playing, start času. */
  start(state: MemoryState): MemoryState {
    if (state.status === 'idle') {
      return { ...state, status: 'playing', startedAt: Date.now() };
    }
    return state;
  },

  /** Elapsed sekundy (během hry „teď“, po výhře endedAt). */
  elapsedSec(state: MemoryState, now = Date.now()): number {
    if (!state.startedAt) return 0;
    const end = state.endedAt ?? now;
    return Math.max(0, Math.floor((end - state.startedAt) / 1000));
  },

  /** Je vše spárované? */
  isWin(state: MemoryState): boolean {
    return state.cards.every(c => c.matched);
  },

  /** Otočení karty – čistá logika (bez timeoutu). */
  flip(state: MemoryState, index: number): MemoryState {
    // Ne-vstupní stavy
    if (state.status === 'preview' || state.status === 'won') return state;
    if (state.locked) return state;

    const card = state.cards[index];
    if (!card || card.matched || card.flipped) return state;

    // pokud jsme v 'idle' a není preview, flip startem přepne do playing a nastartuje čas
    let next = state.status === 'idle' ? this.start(state) : state;

    const cards = next.cards.slice();
    cards[index] = { ...card, flipped: true };

    const flippedIdx = next.flippedIdx.concat(index);
    let moves = next.moves;
    let locked = next.locked;
    let matches = next.matches;

    if (flippedIdx.length === 2) {
      moves += 1;
      locked = true;
      const [a, b] = flippedIdx;
      if (cards[a].symbol === cards[b].symbol) {
        // match – ponech flipped, označ matched
        cards[a] = { ...cards[a], matched: true };
        cards[b] = { ...cards[b], matched: true };
        matches += 1;
      }
    }

    // výhra?
    let status: GameStatus = next.status;
    let endedAt: number | null = next.endedAt;
    const allMatchedSoon =
      flippedIdx.length === 2 &&
      cards.every(c => c.matched || c.flipped === true); // indikace těsně po matchi
    if (allMatchedSoon) {
      // vyhodnotí se v resolve, tam nastaveno definitivně
    }

    return {
      ...next,
      cards,
      flippedIdx,
      locked,
      moves,
      matches,
      status,
      endedAt,
    };
  },

  /** Vyhodnocení dvojice po animační prodlevě – buď necháme otočené (match), nebo zavřeme obě. */
  resolve(state: MemoryState): MemoryState {
    if (state.flippedIdx.length < 2) return state;
    const [a, b] = state.flippedIdx;
    const cards = state.cards.slice();

    const isMatch = cards[a].symbol === cards[b].symbol;

    if (!isMatch) {
      // zavřít oba
      cards[a] = { ...cards[a], flipped: false };
      cards[b] = { ...cards[b], flipped: false };
    }
    // odemknout vstup a vyčistit výběr
    let status: GameStatus = state.status;
    let endedAt: number | null = state.endedAt;

    // pokud tímto tahem je vše matched → výhra
    if (cards.every(c => c.matched)) {
      status = 'won';
      endedAt = Date.now();
    }

    return {
      ...state,
      cards,
      flippedIdx: [],
      locked: false,
      status,
      endedAt,
    };
  },
};
