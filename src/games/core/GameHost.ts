// Jednotné API pro hry – UI může hostovat libovolnou hru.
export interface GameHost<TState, TAction> {
  init: () => TState;            // inicializace čistého stavu
  update: (state: TState, action: TAction) => TState; // čistá logika (pure)
  isFinished?: (state: TState) => boolean;            // volitelné
  reset?: () => TState;          // pokud se liší od init
}
