import { Card, CardContent, Stack, Chip, Button, LinearProgress, Typography, Divider, Box } from '@mui/material';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import RedeemIcon from '@mui/icons-material/Redeem';
import InsightsIcon from '@mui/icons-material/Insights';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { useCasino } from '@games/core/useCasino';
import { useEffect, useMemo, useState } from 'react';
import { motion, useAnimate, animate } from 'framer-motion';
import { CoinBurst } from '@shared/fx/CoinBurst';
import { Confetti } from '@shared/fx/Confetti';
import { usePrev } from '@shared/fx/usePrev';

export function CasinoHUD() {
  const { balance, stats, maybeDailyBonus, resetAll } = useCasino();
  const g = stats.global;
  const wr = Math.max(0, Math.min(100, g.winRate || 0));

  const prevBalance = usePrev(balance);
  const delta = useMemo(() => (prevBalance != null ? balance - (prevBalance as number) : 0), [balance, prevBalance]);

  const [scope, animateScope] = useAnimate();
  const [coinFx, setCoinFx] = useState(false);
  const [confettiFx, setConfettiFx] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const el = document.getElementById('balance-number');
    if (!el || prevBalance == null) return;
    const controls = animate(prevBalance as number, balance, {
      duration: 0.6,
      ease: 'easeOut',
      onUpdate: (v) => { el.textContent = String(Math.round(v)); },
    });
    return () => { controls.stop(); };
  }, [balance, prevBalance]);

  useEffect(() => {
    if (delta === 0) return;
    animateScope(scope.current, { scale: [1, 1.08, 1] }, { duration: 0.35 });
    if (delta > 0) {
      setCoinFx(true); setConfettiFx(true);
      const t = setTimeout(() => { setCoinFx(false); setConfettiFx(false); }, 1200);
      return () => clearTimeout(t);
    }
  }, [delta, animateScope, scope]);

  const handleBonus = () => {
    const before = balance;
    const r = maybeDailyBonus(20);
    const gain = (r.balance ?? 0) - before;
    setInfo(r.granted ? `🎁 Bonus +${gain} připsán.` : 'Bonus už dnes vyčerpán.');
  };

  return (
    <>
      <CoinBurst show={coinFx} />
      <Confetti show={confettiFx} />
      <Card variant="outlined" ref={scope}>
        <CardContent>
          <Stack direction="row" gap={1.25} alignItems="center" flexWrap="wrap">
            <Chip
              icon={<MonetizationOnIcon />}
              label={
                <Box component={motion.span} layout="position" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                  <span id="balance-number">{balance}</span>
                  {delta !== 0 && (
                    <Chip
                      size="small"
                      color={delta > 0 ? 'success' : 'error'}
                      variant="filled"
                      icon={delta > 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                      label={(delta > 0 ? '+' : '') + delta}
                      sx={{ ml: 0.5 }}
                    />
                  )}
                </Box>
              }
            />
            <Chip icon={<InsightsIcon />} variant="outlined" label={`Win rate: ${wr}%`} />
            <Chip variant="outlined" label={`Hry: ${g.games} • Výhry: ${g.wins} • Prohry: ${g.losses} • Remízy: ${g.draws}`} />
            <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
              <Button size="small" variant="outlined" startIcon={<RedeemIcon />} onClick={handleBonus}>
                Denní bonus
              </Button>
              <Button size="small" color="error" variant="outlined" startIcon={<RestartAltIcon />} onClick={resetAll}>
                Reset
              </Button>
            </Box>
          </Stack>

          <Divider sx={{ my: 1.25 }} />

          <Typography variant="caption">Win rate</Typography>
          <LinearProgress variant="determinate" value={wr} sx={{ mt: 0.5, height: 8, borderRadius: 999 }} />

          {info && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              {info}
            </Typography>
          )}
        </CardContent>
      </Card>
    </>
  );
}
