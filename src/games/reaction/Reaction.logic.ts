// Čistá logika Reaction Tap (GameHost styl)
import type { GameHost } from '@games/core/GameHost';

export type Phase = 'idle' | 'wait' | 'go' | 'finished';
export type Action =
  | { type: 'arm' }                   // start kola – přepne na 'wait'
  | { type: 'go' }                    // signal "TEĎ!"
  | { type: 'tap'; at: number }       // hráč stiskl (space/click)
  | { type: 'foul' }                  // předčasný klik/tap ve 'wait'
  | { type: 'reset' };

export type State = {
  phase: Phase;
  armedAt: number | null;   // ts když začal 'wait'
  startAt: number | null;   // ts kdy přišlo 'go'
  resultMs: number | null;  // reakční čas
  foul: boolean;            // předčasný klik
};

export const initialState: State = {
  phase: 'idle',
  armedAt: null,
  startAt: null,
  resultMs: null,
  foul: false,
};

// hranice pro výsledek (adjustovatelné)
export const THRESHOLDS = {
  win: 320,   // <= 320 ms = win
  draw: 420,  // <= 420 ms = draw
};

export function resultFromMs(ms: number): 'win' | 'draw' | 'loss' {
  if (ms <= THRESHOLDS.win) return 'win';
  if (ms <= THRESHOLDS.draw) return 'draw';
  return 'loss';
}

export const ReactionHost: GameHost<State, Action> = {
  init: () => ({ ...initialState }),
  reset: () => ({ ...initialState }),
  update: (s, a) => {
    switch (a.type) {
      case 'arm':
        if (s.phase !== 'idle' && s.phase !== 'finished') return s;
        return { phase: 'wait', armedAt: Date.now(), startAt: null, resultMs: null, foul: false };

      case 'go':
        if (s.phase !== 'wait') return s;
        return { ...s, phase: 'go', startAt: Date.now() };

      case 'tap':
        if (s.phase !== 'go' || !s.startAt) return s; // jen po signalizaci
        return { ...s, phase: 'finished', resultMs: Math.max(0, a.at - s.startAt), foul: false };

      case 'foul':
        if (s.phase !== 'wait') return s;
        return { ...s, phase: 'finished', resultMs: null, foul: true };

      case 'reset':
        return { ...initialState };
      default:
        return s;
    }
  },
  isFinished: (s) => s.phase === 'finished',
};
