import { LinearProgress, Stack, Typography } from '@mui/material';
import { usePlayerStore, selectLevel, selectXP } from '@shared/store/playerStore';
import { levelProgressPct } from '@shared/types/economy';

/** Komponenta: horizontální progress bar pro XP/level */
export function XPBar() {
  const xp = usePlayerStore(selectXP);
  const level = usePlayerStore(selectLevel);
  const pct = levelProgressPct(xp);

  return (
    <Stack spacing={0.5} sx={{ width: '100%' }}>
      <Typography variant="caption" sx={{ fontWeight: 600 }}>
        Level {level} ({pct}%)
      </Typography>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{ height: 8, borderRadius: 999, backgroundColor: 'action.hover' }}
      />
    </Stack>
  );
}
