import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Button, Stack, Typography, Accordion, AccordionSummary, AccordionDetails,
  Select, MenuItem, FormControlLabel, Switch, Dialog, DialogTitle, DialogContent, DialogActions,
  Chip, Divider, Grid,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { motion, AnimatePresence } from 'framer-motion';
import { playerApi } from '@games/core/player.api';
import { CoinBurst } from '@shared/fx/CoinBurst';
import { Confetti } from '@shared/fx/Confetti';
import { MemoryLogic, MemoryState, Difficulty } from './Memory.logic';
import { totalReward } from './Memory.rewards';

const CARD_SIZE = 84;

export default function MemoryGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [withPreview, setWithPreview] = useState<boolean>(false);
  const [state, setState] = useState<MemoryState>(() => MemoryLogic.init(difficulty, withPreview, 1500));
  const [winOpen, setWinOpen] = useState(false);
  const [fxCoins, setFxCoins] = useState(false);
  const [fxConfetti, setFxConfetti] = useState(false);

  // živé tikání času (HUD jede plynule)
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick(t => t + 1), 250);
    return () => clearInterval(id);
  }, []);
  const elapsed = useMemo(() => MemoryLogic.elapsedSec(state), [state]);

  // auto-ukončení win dialogu
  useEffect(() => {
    if (!winOpen) return;
    const t = setTimeout(() => setWinOpen(false), 2200);
    return () => clearTimeout(t);
  }, [winOpen]);

  // po resetu – pokud je preview, ukážeme na chvilku a pak start
  useEffect(() => {
    if (state.status !== 'preview' || !state.preview.showing) return;
    const t = setTimeout(() => setState(s => MemoryLogic.endPreview(s)), state.preview.ms);
    return () => clearTimeout(t);
  }, [state.status, state.preview.showing, state.preview.ms]);

  const gridCols = useMemo(() => {
    if (difficulty === 'easy') return 6;   // 6 párů → 12 karet → 4×3
    if (difficulty === 'medium') return 8; // 8 párů → 16 karet → 4×4
    return 10;                              // 10 párů → 20 karet → 5×4
  }, [difficulty]);

  const handleReset = (opt?: { diff?: Difficulty; preview?: boolean }) => {
    const diff = opt?.diff ?? difficulty;
    const prv = opt?.preview ?? withPreview;
    setDifficulty(diff);
    setWithPreview(prv);
    setState(MemoryLogic.init(diff, prv, 1500));
    setWinOpen(false);
  };

  const onCardClick = (idx: number) => {
    const flipped = MemoryLogic.flip(state, idx);
    if (flipped === state) return;

    setState(flipped);
    if (flipped.flippedIdx.length === 2) {
      // po krátké chvíli vyhodnotit
      setTimeout(() => {
        setState(prev => {
          const resolved = MemoryLogic.resolve(prev);
          if (resolved.status === 'won' && prev.status !== 'won') onWin(resolved);
          return resolved;
        });
      }, 650);
    }
  };

  const onWin = (s: MemoryState) => {
    const time = MemoryLogic.elapsedSec(s);
    const reward = totalReward(s.difficulty, time);
    if (reward.coins > 0) playerApi.addCoins(reward.coins);
    if (reward.xp > 0) playerApi.addXP(reward.xp, { reason: `Memory:${s.difficulty}` });

    setFxCoins(true);
    setFxConfetti(true);
    setWinOpen(true);

    setTimeout(() => {
      setFxCoins(false);
      setFxConfetti(false);
    }, 1400);
  };

  const inProgress = state.status === 'playing' || state.status === 'preview';
  const primaryBtnLabel = inProgress ? 'Resetovat' : 'Nová hra';

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight={800}>Memory Match (Pexeso)</Typography>

      {/* HUD */}
      <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
        <Chip label={`Čas: ${elapsed}s`} size="small" />
        <Chip label={`Tahy: ${state.moves}`} size="small" variant="outlined" />
        <Chip label={`Obtížnost: ${difficulty}`} size="small" />
        {state.status === 'preview' && <Chip color="warning" label="Ukázka…" size="small" />}
        {state.status === 'playing' && <Chip color="success" label="Hraješ…" size="small" />}
        {state.status === 'won' && <Chip color="primary" label="Hotovo!" size="small" />}
      </Stack>

      {/* Ovládání */}
      <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
        <Select
          size="small"
          value={difficulty}
          onChange={(e) => handleReset({ diff: e.target.value as Difficulty, preview: withPreview })}
          disabled={inProgress} // měnit obtížnost jen mimo průběh
        >
          <MenuItem value="easy">Lehká (6 párů)</MenuItem>
          <MenuItem value="medium">Střední (8 párů)</MenuItem>
          <MenuItem value="hard">Těžká (10 párů)</MenuItem>
        </Select>
        <FormControlLabel
          control={
            <Switch
              checked={withPreview}
              onChange={(e) => handleReset({ diff: difficulty, preview: e.target.checked })}
              disabled={inProgress}
            />
          }
          label="Ukázat na začátku"
        />
        <Button variant="contained" onClick={() => handleReset()}>
          {primaryBtnLabel}
        </Button>
      </Stack>

      {/* Nápověda – defaultně sbalená */}
      <Accordion
        sx={{
          bgcolor: 'background.default',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 'none',
          '&:before': { display: 'none' },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={600}>Jak hrát (klikni pro rozbalení)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" sx={{ lineHeight: 1.7, color: 'text.secondary' }}>
            • Kliknutím otoč dvě karty. Pokud jsou stejné, zůstanou odhalené.<br />
            • Cílem je odhalit všechny páry na co nejméně tahů a v co nejkratším čase.<br />
            • „Ukázka“ (volitelně): po zamíchání se na chvilku zobrazí všechny karty, pak se skryjí a hra začne.<br />
            • HUD nahoře ukazuje běžící čas a počet tahů. Během hry tlačítko „Nová hra“ změní stav na „Resetovat“.
          </Typography>
        </AccordionDetails>
      </Accordion>

      <Divider />

      {/* Hrací mřížka */}
      <Grid container spacing={1.25} columns={gridCols}>
        {state.cards.map((c, i) => {
          const faceUp = c.flipped || c.matched;
          return (
            <Grid key={c.id} size={{ xs: 2, sm: 2, md: 1}}>
              <Box
                component={motion.button}
                onClick={() => onCardClick(i)}
                disabled={state.locked || faceUp || state.status === 'preview'}
                whileTap={{ scale: 0.97 }}
                sx={{
                  width: CARD_SIZE,
                  height: CARD_SIZE,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: faceUp ? 'primary.main' : 'divider',
                  background: faceUp ? 'primary.main' : 'background.paper',
                  color: faceUp ? 'primary.contrastText' : 'transparent',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 32,
                  fontWeight: 700,
                  cursor: state.locked || state.status === 'preview' ? 'default' : 'pointer',
                  transition: 'all .22s ease',
                }}
              >
                {c.symbol}
              </Box>
            </Grid>
          );
        })}
      </Grid>

      {/* Dialog výhry (auto-zavírání po ~2.2s) */}
      <Dialog open={winOpen} onClose={() => setWinOpen(false)}>
        <DialogTitle>🎉 Výhra!</DialogTitle>
        <DialogContent>
          <Typography>
            Dokončeno za <b>{elapsed}s</b> • Tahy: <b>{state.moves}</b>
          </Typography>
          <Typography variant="body2" sx={{ mt: .5, color: 'text.secondary' }}>
            Odměna se liší dle obtížnosti a rychlosti.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWinOpen(false)} variant="contained">OK</Button>
        </DialogActions>
      </Dialog>

      {/* FX */}
      <CoinBurst show={fxCoins} />
      <Confetti show={fxConfetti} />
    </Stack>
  );
}
