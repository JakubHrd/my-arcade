export type RPSChoice = 'kamen' | 'nuzky' | 'papir';
export type RPSResult = 'win' | 'loss' | 'draw';

export const options: RPSChoice[] = ['kamen', 'nuzky', 'papir'];

export const icon = (v?: RPSChoice | null) =>
  v === 'kamen' ? '✊' : v === 'nuzky' ? '✌️' : v === 'papir' ? '✋' : '❓';

const beats: Record<RPSChoice, RPSChoice> = {
  kamen: 'nuzky',
  nuzky: 'papir',
  papir: 'kamen',
};

export const normalize = (s: string): string =>
  (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

export const toChoice = (s: string): RPSChoice | null => {
  const n = normalize(s);
  if (n === 'kamen' || n === 'nuzky' || n === 'papir') return n;
  return null;
};

export const decide = (player: RPSChoice, cpu: RPSChoice): RPSResult => {
  if (player === cpu) return 'draw';
  return beats[player] === cpu ? 'win' : 'loss';
};

export const randomChoice = (): RPSChoice => options[Math.floor(Math.random() * options.length)];
