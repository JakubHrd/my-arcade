import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Card, CardContent, Stack, Typography, Chip, Box, Button, Divider,
  Accordion, AccordionSummary, AccordionDetails, Tooltip, IconButton,
} from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import RedeemIcon from '@mui/icons-material/Redeem';
import { motion, AnimatePresence } from 'framer-motion';
import { useCasino } from '@games/core/useCasino';
import { FlyCoins } from '@shared/fx/FlyCoins';
import { Confetti } from '@shared/fx/Confetti';
import { DiceLogic, DiceState } from './Dice.logic';
import { applyDiceRewards } from './Dice.rewards';

const GAME_KEY = 'diceDuel' as const; // navazuje na priceTable v Casino

export default function DiceDuel() {
  const { balance, priceTable, defaultPayout, startRound, finishRound, maybeDailyBonus } = useCasino();
  const entry = priceTable?.diceDuel?.entry ?? 7;

  const [state, setState] = useState<DiceState>(() => DiceLogic.init(2));
  const [busy, setBusy] = useState(false);
  const [overlay, setOverlay] = useState<{ open: boolean; type: 'win' | 'loss' | 'draw'; payout: number }>({ open: false, type: 'draw', payout: 0 });
  const [coinsFx, setCoinsFx] = useState(false);
  const [confettiFx, setConfettiFx] = useState(false);
  const roundRef = useRef<string | null>(null);

  const canPlay = balance >= (entry | 0);
  const costLabel = `Cena: ${entry}`;
  const balLabel = `Zůstatek: ${balance}`;

  // ENTER = Start/Hodit
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key.toLowerCase() === 'enter') handlePlay();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, busy, canPlay]);

  function resetInternals() {
    setBusy(false);
    setState(DiceLogic.init(2));
    roundRef.current = null;
  }

  function handlePlay() {
    if (busy) return;

    // Pokud předchozí kolo skončilo, „smart play“ – reset do čistého stavu a pokračuj
    if (state.status === 'finished') resetInternals();

    if (!canPlay) return;

    const st = startRound(GAME_KEY as any);
    if (!st?.ok) return;
    roundRef.current = st.roundId;

    setBusy(true);
    setState(s => ({ ...s, status: 'rolling' }));

    // malé „napětí“: animace a pak reveal
    setTimeout(() => {
      const player = DiceLogic.rollOnce(state.diceCount);
      const cpu = DiceLogic.rollOnce(state.diceCount);
      const result = DiceLogic.decide(player, cpu);

      const payout = defaultPayout(GAME_KEY as any, result);
      setState({ status: 'reveal', player, cpu, result, diceCount: state.diceCount });

      // dokonči kolo (Casino) + meta odměny
      finishRound(GAME_KEY as any, { roundId: roundRef.current!, result, payout, details: { player, cpu } });
      applyDiceRewards(result);

      // výsledkový overlay + FX
      setOverlay({ open: true, type: result, payout });
      if (result === 'win' && payout > 0) {
        setCoinsFx(true); setConfettiFx(true);
        setTimeout(() => { setCoinsFx(false); setConfettiFx(false); }, 1100);
      }

      // auto zavření + přepnutí do finished
      setTimeout(() => {
        setOverlay(o => ({ ...o, open: false }));
        setState(s => ({ ...s, status: 'finished' }));
        setBusy(false);
      }, 1100);
    }, 500);
  }

  const banner = useMemo(() => {
    if (state.result == null) return null;
    if (state.result === 'win') return { text: 'Vyhrál jsi! 🏆', color: 'success' as const };
    if (state.result === 'loss') return { text: 'Prohra 😕', color: 'error' as const };
    return { text: 'Remíza', color: 'default' as const };
  }, [state.result]);

  return (
    <Card variant="outlined" sx={{ overflow: 'hidden' }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
            <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
              <Chip icon={<CasinoIcon />} label="Dice Duel" />
              <Chip variant="outlined" label={costLabel} />
              <Chip variant="outlined" label={balLabel} />
            </Stack>
            <Typography variant="caption" color="text.secondary">Klávesa: Enter = Start/Hodit</Typography>
          </Stack>

          <Divider />

          {/* Arena */}
          <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
            {/* Player */}
            <Box flex={1}>
              <Typography variant="subtitle2" gutterBottom>Ty</Typography>
              <DicePanel roll={state.player} phase={state.status} />
            </Box>

            {/* VS */}
            <Stack alignItems="center" justifyContent="center" sx={{ minWidth: 64 }}>
              <AnimatePresence initial={false} mode="popLayout">
                {state.status === 'rolling' ? (
                  <motion.div key="roll" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }} style={{ fontSize: 32, fontWeight: 900 }}>
                    …
                  </motion.div>
                ) : (
                  <motion.div key="vs" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <Chip label="VS" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Stack>

            {/* CPU */}
            <Box flex={1}>
              <Typography variant="subtitle2" gutterBottom>Počítač</Typography>
              <DicePanel roll={state.cpu} phase={state.status} />
            </Box>
          </Stack>

          {/* Banner výsledku */}
          <AnimatePresence>
            {banner && (
              <motion.div
                initial={{ y: -8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -8, opacity: 0 }}
                style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}
              >
                <Chip label={banner.text} color={banner.color} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Ovládání */}
          <Stack direction="row" gap={1} alignItems="center">
            <Button variant="contained" disabled={busy || !canPlay} onClick={handlePlay}>
              {state.status === 'finished' ? 'Hrát znovu' : state.status === 'rolling' ? 'Házíš…' : 'Hodit'}
            </Button>
            {!canPlay && state.status !== 'finished' && (
              <Button variant="outlined" startIcon={<RedeemIcon />} onClick={() => maybeDailyBonus(20)}>
                Denní bonus
              </Button>
            )}
            <Box flex={1} />
            {roundRef.current && (
              <Typography variant="caption" color="text.secondary">roundId: {roundRef.current}</Typography>
            )}
          </Stack>

          {/* Nápověda */}
          <Accordion
            sx={{
              bgcolor: 'background.default',
              borderRadius: 2,
              border: '1px solid', borderColor: 'divider',
              boxShadow: 'none', '&:before': { display: 'none' },
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight={600}>Jak hrát (klikni pro rozbalení)</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                  • Stiskni <b>Enter</b> (nebo tlačítko „Hodit“).<br/>
                  • Ty i počítač hodíte {state.diceCount}× kostkou. Vyšší součet <b>vyhrává</b>, stejný je <b>remíza</b>.<br/>
                  • Hraje se za <b>kasino mince</b> (vstup), výhra připisuje mince do banku. Navíc získáváš <b>XP + meta mince</b> jako odměnu za výsledek.
                </Typography>
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Stack>
      </CardContent>

      {/* FX */}
      <Confetti show={confettiFx} />
      <FlyCoins show={coinsFx} toSelector="#bank-anchor" gain={overlay.payout} />

      {/* Výherní overlay (auto zavření je řešeno v handlePlay) */}
      <AnimatePresence>
        {overlay.open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1500 }}
            onClick={() => setOverlay(o => ({ ...o, open: false }))}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.92, y: 8, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: 8, opacity: 0 }}
              style={{ background: 'white', borderRadius: 16, padding: 24, minWidth: 280, boxShadow: '0 28px 60px rgba(0,0,0,.35)' }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="h6" fontWeight={900}>
                  {overlay.type === 'win' ? 'Výhra!' : overlay.type === 'loss' ? 'Prohra' : 'Remíza'}
                </Typography>
                <IconButton size="small" onClick={() => setOverlay(o => ({ ...o, open: false }))}><CloseIcon /></IconButton>
              </Stack>

              {overlay.type === 'win' ? (
                <Stack spacing={1.5} alignItems="center">
                  <Typography variant="h5" fontWeight={900} color="success.main">+{overlay.payout}</Typography>
                  <Typography variant="body2" align="center">Mince připsány na účet.</Typography>
                </Stack>
              ) : overlay.type === 'loss' ? (
                <Typography variant="body2" align="center">Zkus to znovu!</Typography>
              ) : (
                <Typography variant="body2" align="center">Remíza – bez změny zůstatku.</Typography>
              )}

              <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
                <Button variant="contained" onClick={() => setOverlay(o => ({ ...o, open: false }))}>
                  Pokračovat
                </Button>
              </Stack>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

/** Panel s kostkami a součtem (s jemnou animací při „rolling“). */
function DicePanel({ roll, phase }: { roll: { dice: number[]; total: number } | null; phase: DiceState['status'] }) {
  const rolling = phase === 'rolling';
  return (
    <Stack alignItems="center" gap={1}>
      <Stack direction="row" gap={1} alignItems="center" justifyContent="center" sx={{ minHeight: 56 }}>
        {rolling ? (
          <motion.div
            animate={{ rotate: [0, 20, -18, 12, -8, 0] }}
            transition={{ repeat: Infinity, duration: 0.7 }}
            style={{ fontSize: 34 }}
          >
            🎲
          </motion.div>
        ) : roll ? (
          roll.dice.map((d, i) => (
            <Tooltip key={i} title={`Hod: ${d}`}>
              <Box
                component={motion.span}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{ fontSize: 34, lineHeight: 1 }}
              >
                {faceToEmoji(d as any)}
              </Box>
            </Tooltip>
          ))
        ) : (
          <Typography variant="body2" color="text.secondary">—</Typography>
        )}
      </Stack>
      <Chip size="small" label={`Součet: ${roll ? roll.total : '—'}`} />
    </Stack>
  );
}

function faceToEmoji(f: 1|2|3|4|5|6) {
  // standardní unicode kostky 1..6
  const map: Record<number, string> = { 1:'⚀',2:'⚁',3:'⚂',4:'⚃',5:'⚄',6:'⚅' };
  return map[f] ?? '🎲';
}
