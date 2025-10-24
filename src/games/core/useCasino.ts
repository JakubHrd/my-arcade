import { useEffect, useState } from 'react';
import { Casino } from './casino';
import { StatsSnapshot } from './casino.types';

export function useCasino() {
  const [balance, setBalance] = useState(() => Casino.getBalance());
  const [stats, setStats] = useState<StatsSnapshot>(() => Casino.stats.get());

  useEffect(() => {
    const unsub = Casino.subscribe((e) => {
      if (!e?.type) return;
      if (['init', 'balance', 'roundStart', 'roundFinish', 'dailyBonus', 'reset'].includes(e.type)) {
        setBalance(Casino.getBalance());
        setStats(Casino.stats.get());
      }
    });
    // init refresh
    setBalance(Casino.getBalance());
    setStats(Casino.stats.get());
    return unsub;
  }, []);

  return {
    balance,
    stats,
    priceTable: Casino.config.priceTable,
    startRound: Casino.startRound.bind(Casino),
    finishRound: Casino.finishRound.bind(Casino),
    maybeDailyBonus: Casino.maybeDailyBonus.bind(Casino),
    defaultPayout: Casino.defaultPayout.bind(Casino),
    canAfford: Casino.canAfford.bind(Casino),
    resetAll: Casino.resetAll.bind(Casino),
  };
}
