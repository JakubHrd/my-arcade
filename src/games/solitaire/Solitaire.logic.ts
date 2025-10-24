export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = 'A'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'J'|'Q'|'K';

export type Card = {
  id: string;
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
};

export type State = {
  tableau: Card[][];
  stock: Card[];
  waste: Card[];
  found: Record<Suit, Card[]>;
  drawMode: 1 | 3;
};

export type Move =
  | { type: 'flip'; col: number }
  | { type: 'waste_to_found'; suit: Suit }
  | { type: 'tab_to_found'; from: number; suit: Suit }
  | { type: 'tab_to_tab'; from: number; index: number; to: number }
  | { type: 'waste_to_tab'; to: number }
  | { type: 'waste_to_tab_empty'; to: number }
  | { type: 'recycle' }
  | { type: 'draw'; n: number };

export const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
export const RANKS: Rank[] = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

export const isRed = (s: Suit) => s === '♥' || s === '♦';
export const vRank = (r: Rank) =>
  r === 'A' ? 1 : r === 'J' ? 11 : r === 'Q' ? 12 : r === 'K' ? 13 : parseInt(r, 10);

export const deep = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

export function makeDeck(): Card[] {
  const d: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) {
    d.push({ id: `${r}${s}-${Math.random().toString(36).slice(2, 8)}`, suit: s, rank: r, faceUp: false });
  }
  for (let i = d.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

export function canOnTableau(movingTop: Card | null, targetTop: Card | null): boolean {
  if (!movingTop) return false;
  if (!targetTop) return movingTop.rank === 'K';
  return isRed(movingTop.suit) !== isRed(targetTop.suit) && vRank(movingTop.rank) === vRank(targetTop.rank) - 1;
}

export function canOnFound(card: Card | null, pile: Card[]): boolean {
  if (!card) return false;
  if (!pile.length) return card.rank === 'A';
  const top = pile[pile.length - 1];
  return card.suit === top.suit && vRank(card.rank) === vRank(top.rank) + 1;
}

export function isValidStack(arr: Card[]): boolean {
  if (!arr.length || !arr[0].faceUp) return false;
  for (let i = 0; i < arr.length - 1; i++) {
    const a = arr[i], b = arr[i + 1];
    if (!b.faceUp) return false;
    if (isRed(a.suit) === isRed(b.suit)) return false;
    if (vRank(a.rank) !== vRank(b.rank) + 1) return false;
  }
  return true;
}

export function deal(drawMode: 1 | 3 = 1): State {
  const deck = makeDeck();
  const tableau: Card[][] = Array.from({ length: 7 }, () => []);
  let idx = 0;
  for (let c = 0; c < 7; c++) {
    for (let r = 0; r <= c; r++) {
      const card = deck[idx++];
      card.faceUp = r === c;
      tableau[c].push(card);
    }
  }
  return {
    tableau,
    stock: deck.slice(idx),
    waste: [],
    found: { '♠': [], '♥': [], '♦': [], '♣': [] },
    drawMode,
  };
}

/** Greedy solver – pro Auto-win / Extreme enforcement */
export function trySolve(initial: State) {
  const MAX_ITERS = 1200;
  const seen = new Set<string>();
  const path: Move[] = [];

  const key = (st: State) =>
    JSON.stringify({
      t: st.tableau.map((c) => c.map((k) => [k.rank, k.suit, k.faceUp])),
      w: st.waste.map((k) => [k.rank, k.suit]),
      s: st.stock.length,
      f: SUITS.map((s) => st.found[s].length),
      d: st.drawMode,
    });

  const flipIfPossible = (st: State, colIdx: number) => {
    const col = st.tableau[colIdx];
    if (col.length && !col[col.length - 1].faceUp) {
      col[col.length - 1].faceUp = true;
      path.push({ type: 'flip', col: colIdx });
      return true;
    }
    return false;
  };

  const moveToFoundation = (st: State) => {
    const topW = st.waste[st.waste.length - 1];
    if (topW) {
      const dest = st.found[topW.suit];
      if (canOnFound(topW, dest)) {
        st.waste.pop();
        dest.push(topW);
        path.push({ type: 'waste_to_found', suit: topW.suit });
        return true;
      }
    }
    for (let c = 0; c < 7; c++) {
      const col = st.tableau[c];
      if (!col.length) continue;
      const top = col[col.length - 1];
      if (!top.faceUp) continue;
      const dest = st.found[top.suit];
      if (canOnFound(top, dest)) {
        col.pop();
        dest.push(top);
        path.push({ type: 'tab_to_found', from: c, suit: top.suit });
        flipIfPossible(st, c);
        return true;
      }
    }
    return false;
  };

  const moveToTableau = (st: State) => {
    for (let c = 0; c < 7; c++) {
      const col = st.tableau[c];
      for (let i = 0; i < col.length; i++) {
        const card = col[i];
        if (!card.faceUp) continue;
        const stack = col.slice(i);
        if (!isValidStack(stack)) continue;
        for (let d = 0; d < 7; d++) {
          if (d === c) continue;
          const tgtTop = st.tableau[d][st.tableau[d].length - 1] || null;
          if (canOnTableau(stack[0], tgtTop)) {
            if (!st.tableau[d].length && stack[0].rank !== 'K') continue;
            st.tableau[d] = st.tableau[d].concat(stack);
            st.tableau[c] = st.tableau[c].slice(0, i);
            path.push({ type: 'tab_to_tab', from: c, index: i, to: d });
            flipIfPossible(st, c);
            return true;
          }
        }
      }
    }
    const topW = st.waste[st.waste.length - 1];
    if (topW) {
      for (let d = 0; d < 7; d++) {
        const tgtTop = st.tableau[d][st.tableau[d].length - 1] || null;
        if (canOnTableau(topW, tgtTop)) {
          st.tableau[d].push(topW);
          st.waste.pop();
          path.push({ type: 'waste_to_tab', to: d });
          return true;
        }
        if (!st.tableau[d].length && topW.rank === 'K') {
          st.tableau[d].push(topW);
          st.waste.pop();
          path.push({ type: 'waste_to_tab_empty', to: d });
          return true;
        }
      }
    }
    return false;
  };

  const draw = (st: State) => {
    if (st.stock.length === 0) {
      if (!st.waste.length) return false;
      st.stock = st.waste.slice().reverse().map((c) => ({ ...c, faceUp: false }));
      st.waste = [];
      path.push({ type: 'recycle' });
      return true;
    }
    const n = Math.min(st.drawMode, st.stock.length);
    const take = st.stock.slice(-n).map((c) => ({ ...c, faceUp: true }));
    st.stock = st.stock.slice(0, st.stock.length - n);
    st.waste = st.waste.concat(take);
    path.push({ type: 'draw', n });
    return true;
  };

  const isWin = (st: State) => SUITS.every((s) => st.found[s].length === 13);

  let it = 0;
  let st = deep(initial);
  while (it++ < MAX_ITERS) {
    if (isWin(st)) return { ok: true as const, path };
    const snap = key(st);
    if (seen.has(snap)) {
      if (!draw(st)) break;
      continue;
    }
    seen.add(snap);

    if (moveToFoundation(st)) continue;
    if (moveToTableau(st)) continue;
    if (draw(st)) continue;
    break;
  }
  return { ok: false as const, path: [] as Move[] };
}

export function easeScore(initial: State, solutionPath: Move[]) {
  const total = solutionPath.length;
  const firstN = solutionPath.slice(0, 30);
  const earlyFound = firstN.filter((m) => m.type === 'tab_to_found' || m.type === 'waste_to_found').length;
  const flips = solutionPath.filter((m) => m.type === 'flip').length;
  const recycles = solutionPath.filter((m) => m.type === 'recycle').length;
  const initialAcesVisible = initial.tableau.reduce((acc, col) => {
    const top = col[col.length - 1];
    return acc + (top && top.rank === 'A' ? 1 : 0);
  }, 0);
  return 300 - total + 6 * earlyFound + 2 * flips + 8 * initialAcesVisible - 12 * recycles;
}

export function pickByDifficulty<T extends { score: number }>(candidates: T[], difficulty: 'easy'|'medium'|'hard'|'extreme') {
  candidates.sort((a, b) => a.score - b.score); // low=hard, high=easy
  const pickIndex = (() => {
    if (difficulty === 'easy') return candidates.length - 1;
    if (difficulty === 'medium') return Math.floor(0.8 * (candidates.length - 1));
    if (difficulty === 'hard') return Math.floor(0.3 * (candidates.length - 1));
    return 0; // extreme
  })();
  return candidates[Math.max(0, Math.min(candidates.length - 1, pickIndex))];
}

export function generateDealForDifficulty(drawMode: 1|3, difficulty: 'easy'|'medium'|'hard'|'extreme') {
  const tries = difficulty === 'easy' ? 60 : difficulty === 'medium' ? 45 : difficulty === 'hard' ? 45 : 60;
  const candidates: { deal: State; solution: { ok: true; path: Move[] }; score: number }[] = [];
  for (let i = 0; i < tries; i++) {
    const d = deal(drawMode);
    const solved = trySolve(deep(d));
    if (!solved.ok) continue;
    const score = easeScore(d, solved.path);
    candidates.push({ deal: d, solution: solved as any, score });
  }
  if (!candidates.length) {
    for (let i = 0; i < 50; i++) {
      const d = deal(drawMode);
      const solved = trySolve(deep(d));
      if (solved.ok) return { deal: d, solution: solved as any };
    }
    return null;
  }
  return pickByDifficulty(candidates, difficulty);
}
