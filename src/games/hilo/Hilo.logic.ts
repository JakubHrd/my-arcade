import type { GameHost } from '@games/core/GameHost';

export type Rank = '2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'J'|'Q'|'K'|'A';
export type Suit = '♠'|'♥'|'♦'|'♣';
export type Card = { id: string; rank: Rank; suit: Suit };

export type Guess = 'higher'|'lower';
export type Phase = 'idle'|'playing'|'reveal'|'finished';

export interface State {
  phase: Phase;
  deck: Card[];
  current: Card | null;
  next: Card | null;
  streak: number;          // počet správných
  lives: number;           // zbývající životy
  target: number;          // cíl pro výhru
  lastGuess: Guess | null; // poslední tip
  lastCompare: number | null; // -1/0/1 (next vs current)
}

export type Action =
  | { type: 'start' }
  | { type: 'guess'; value: Guess }
  | { type: 'reveal' }
  | { type: 'reset' };

const SUITS: Suit[] = ['♠','♥','♦','♣'];
const RANKS: Rank[] = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const vRank = (r: Rank) =>
  r === 'A' ? 14 : r === 'K' ? 13 : r === 'Q' ? 12 : r === 'J' ? 11 : parseInt(r, 10);

function makeDeck(): Card[] {
  const d: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) {
    d.push({ id: `${r}${s}-${Math.random().toString(36).slice(2,8)}`, rank: r, suit: s });
  }
  for (let i = d.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}
function draw(deck: Card[]) {
  if (deck.length === 0) return { deck, card: null as Card | null };
  return { deck: deck.slice(0, -1), card: deck[deck.length - 1] as Card };
}

export const HiloHost: GameHost<State, Action> = {
  init() {
    return {
      phase: 'idle',
      deck: [],
      current: null,
      next: null,
      streak: 0,
      lives: 3,
      target: 5,
      lastGuess: null,
      lastCompare: null,
    };
  },
  reset() { return this.init(); },

  update(state, action) {
    const st = { ...state };

    if (action.type === 'start') {
      const deck = makeDeck();
      const d1 = draw(deck);
      const d2 = draw(d1.deck);
      return {
        ...this.init(),
        phase: 'playing',
        deck: d2.deck,
        current: d1.card,
        next: d2.card,
        lives: 3,
        target: 5,
      };
    }

    if (action.type === 'guess' && st.phase === 'playing' && st.current && st.next) {
      st.lastGuess = action.value;
      st.lastCompare = Math.sign(vRank(st.next.rank) - vRank(st.current.rank)); // -1/0/1
      st.phase = 'reveal';
      return st;
    }

    if (action.type === 'reveal' && st.phase === 'reveal' && st.current && st.next) {
      const diff = st.lastCompare ?? 0;
      const equal = diff === 0;
      const guessRight =
        (diff > 0 && st.lastGuess === 'higher') || (diff < 0 && st.lastGuess === 'lower');

      if (equal) {
        // Remíza — jen posuneme a pokračujeme
        const d = draw(st.deck);
        return {
          ...st,
          current: st.next,
          next: d.card,
          deck: d.deck,
          phase: d.card ? 'playing' : 'finished',
        };
      }

      if (guessRight) {
        const streak = st.streak + 1;
        if (streak >= st.target) {
          return { ...st, streak, phase: 'finished' }; // výhra kola
        }
        const d = draw(st.deck);
        return {
          ...st,
          streak,
          current: st.next,
          next: d.card,
          deck: d.deck,
          phase: d.card ? 'playing' : 'finished',
        };
      } else {
        const lives = Math.max(0, st.lives - 1);
        if (lives === 0) {
          return { ...st, lives, phase: 'finished' }; // prohra kola
        }
        const d = draw(st.deck);
        return {
          ...st,
          lives,
          current: st.next,
          next: d.card,
          deck: d.deck,
          phase: d.card ? 'playing' : 'finished',
        };
      }
    }

    if (action.type === 'reset') return this.reset!();
    return st;
  },

  isFinished(st) { return st.phase === 'finished'; },
};
