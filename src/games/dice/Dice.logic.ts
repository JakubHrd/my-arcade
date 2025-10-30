export type DiceFace = 1 | 2 | 3 | 4 | 5 | 6;
export type RoundResult = 'win' | 'loss' | 'draw';

export interface Roll {
  dice: DiceFace[];
  total: number;
}

export interface DiceState {
  status: 'idle' | 'rolling' | 'reveal' | 'finished';
  player: Roll | null;
  cpu: Roll | null;
  result: RoundResult | null;
  diceCount: number; // 2;            // lze rozšířit (2–3 kostky)
}

export const DiceLogic = {
  init(diceCount: number = 2): DiceState {
    return { status: 'idle', player: null, cpu: null, result: null, diceCount };
  },

  rollOnce(n: number): Roll {
    const dice: DiceFace[] = Array.from({ length: n }, () => (1 + (Math.random() * 6 | 0)) as DiceFace);
    const total = dice.reduce((a, b) => a + b, 0);
    return { dice, total };
  },

  decide(player: Roll, cpu: Roll): RoundResult {
    if (player.total === cpu.total) return 'draw';
    return player.total > cpu.total ? 'win' : 'loss';
  },
};
