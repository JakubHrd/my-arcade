import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Card, CardContent, Stack, Typography, TextField, Button, Chip, Box, Divider, ToggleButton, ToggleButtonGroup, IconButton,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied';
import SportsMmaIcon from '@mui/icons-material/SportsMma';
import RedeemIcon from '@mui/icons-material/Redeem';
import CloseIcon from '@mui/icons-material/Close';
import { useCasino } from '@games/core/useCasino';
import { decide, icon, options, toChoice, randomChoice, RPSChoice, RPSResult } from './RPS.logic';
import { motion, AnimatePresence } from 'framer-motion';
import { FlyCoins } from '@shared/fx/FlyCoins';
import { Confetti } from '@shared/fx/Confetti';
import { applyRPSRewards } from './RPS.rewards';

export default function RPSGame() {
  const { balance, priceTable, defaultPayout, startRound, finishRound, maybeDailyBonus } = useCasino();
  const roundRef = useRef<string | null>(null);

  const cost = priceTable.RPS?.entry ?? 5;
  const [input, setInput] = useState<RPSChoice | null>(null);
  const [phase, setPhase] = useState<'idle' | 'countdown' | 'reveal' | 'finished'>('idle');
  const [count, setCount] = useState(3);
  const [cpu, setCpu] = useState<RPSChoice | null>(null);
  const [result, setResult] = useState<RPSResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const [overlay, setOverlay] = useState<{ open: boolean; type: 'win' | 'loss' | 'draw'; payout: number }>({
    open: false,
    type: 'draw',
    payout: 0,
  });
  const [coinsFx, setCoinsFx] = useState(false);
  const [confettiFx, setConfettiFx] = useState(false);

  // klávesové zkratky
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'k') setInput('kamen');
      if (k === 'n') setInput('nuzky');
      if (k === 'p') setInput('papir');
      if (k === 'enter') handlePlay();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, input, balance]);

  const canPlay = Number.isFinite(cost) && balance >= (cost | 0);

  function resetInternals(keepChoice = true) {
    setPhase('idle');
    if (!keepChoice) setInput(null);
    setCpu(null);
    setResult(null);
    setCount(3);
    setBusy(false);
    roundRef.current = null;
    setHint(null);
  }

  function smartPrepare() {
    // pokud bylo dohráno předchozí kolo, tady ho vnitřně „uklidíme“ bez nutnosti kliknout na „Nová hra“
    if (phase === 'finished') resetInternals(true);
  }

  function handlePlay() {
    if (busy) return;

    // „Smart Play“ – pokud jsem po dohraném kole, vnitřně resetni a pokračuj
    smartPrepare();

    const choice = input;
    if (!choice) { setHint('Vyber kámen / nůžky / papír.'); return; }
    if (!canPlay) { setHint('Nedostatek mincí. Zkus Denní bonus.'); return; }

    const st = startRound('RPS');
    if (!st?.ok) { setHint('Nedostatek mincí.'); return; }
    roundRef.current = st.roundId;

    setBusy(true); setHint(null); setPhase('countdown'); setCount(3);

    let t = 3;
    const id = setInterval(() => {
      t -= 1;
      if (t <= 0) {
        clearInterval(id);

        const c = randomChoice();
        setCpu(c);

        const res = decide(choice, c);
        setResult(res);
        setPhase('reveal');

        const payout = defaultPayout('RPS', res);
        finishRound('RPS', { roundId: roundRef.current!, result: res, payout, details: { user: choice, cpu: c } });

        // 🔹 META ODMĚNY (XP + meta coins)
        applyRPSRewards(res);
        console.log('RPS rewards:', res);
        // overlay + efekty
        setOverlay({ open: true, type: res, payout });

        if (res === 'win' && payout > 0) {
          setCoinsFx(true);
          setConfettiFx(true);
          setTimeout(() => { setCoinsFx(false); setConfettiFx(false); }, 1100);
        }

        // po krátké chvíli overlay zavřeme a přepneme do finished (jede Smart Play)
        setTimeout(() => {
          setOverlay((o) => ({ ...o, open: false }));
          setPhase('finished');
          setBusy(false);
        }, 1100);
      } else {
        setCount(t);
      }
    }, 500);
  }

  const banner = useMemo(() => {
    if (!result) return null;
    if (result === 'win') return { text: 'Vyhrál jsi! 🏆', color: 'success' as const };
    if (result === 'loss') return { text: 'Prohrál jsi. 😥', color: 'error' as const };
    return { text: 'Remíza!', color: 'default' as const };
  }, [result]);

  return (
    <Card variant="outlined" sx={{ overflow: 'hidden' }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
            <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
              <Chip icon={<SportsMmaIcon />} label="Kámen–Nůžky–Papír" />
              <Chip variant="outlined" label={`Cena: ${cost}`} />
              <Chip variant="outlined" label={`Zůstatek: ${balance}`} />
            </Stack>
            <Typography variant="caption" color="text.secondary">Zkratky: K / N / P, Enter = Hrát</Typography>
          </Stack>

          <Divider />

          <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
            {/* Vstup */}
            <Box flex={1}>
              <Typography variant="subtitle2" gutterBottom>Tvoje volba</Typography>
              <ToggleButtonGroup exclusive value={input} onChange={(_, v: RPSChoice | null) => setInput(v)} size="small">
                {options.map((o) => (
                  <ToggleButton key={o} value={o}>
                    <motion.span initial={false} animate={{ scale: input === o ? 1.2 : 1 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }} style={{ fontSize: 22, marginRight: 6 }}>
                      {icon(o)}
                    </motion.span>
                    {o}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              <TextField
                label="nebo napiš (kámen / nůžky / papír)" size="small" fullWidth sx={{ mt: 1 }}
                value={input ?? ''} onChange={(e) => setInput(toChoice(e.target.value))}
              />
            </Box>

            {/* Aréna */}
            <Box flex={1}>
              <Typography variant="subtitle2" gutterBottom>Aréna</Typography>
              <Stack direction="row" gap={2} alignItems="stretch">
                {/* Player */}
                <Card variant="outlined" sx={{ flex: 1, p: 2, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">Ty</Typography>
                  <motion.div
                    animate={phase === 'countdown' ? { rotate: [-4, 4, -4] } : { rotate: 0 }}
                    transition={phase === 'countdown' ? { repeat: Infinity, duration: 0.6 } : { duration: 0.2 }}
                    style={{ fontSize: 48, margin: '8px 0' }}
                  >
                    {icon(input)}
                  </motion.div>
                  <Typography variant="body2" color="text.secondary">{input ?? '—'}</Typography>
                </Card>

                {/* VS / Countdown */}
                <Stack alignItems="center" justifyContent="center" sx={{ minWidth: 64 }}>
                  <AnimatePresence initial={false} mode="popLayout">
                    {phase === 'countdown' ? (
                      <motion.div key="count" initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.3, opacity: 0 }} style={{ fontSize: 34, fontWeight: 900 }}>
                        {count}
                      </motion.div>
                    ) : (
                      <motion.div key="vs" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                        <Chip label="VS" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Stack>

                {/* CPU */}
                <Card variant="outlined" sx={{ flex: 1, p: 2, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">Počítač</Typography>
                  <motion.div
                    key={phase === 'reveal' || phase === 'finished' ? 'cpu-reveal' : 'cpu-idle'}
                    initial={{ scale: 0.9, y: -6, opacity: 0.0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                    style={{ fontSize: 48, margin: '8px 0' }}
                  >
                    {phase === 'idle' ? '…' : icon(cpu)}
                  </motion.div>
                  <Typography variant="body2" color="text.secondary">{cpu ?? '—'}</Typography>
                </Card>
              </Stack>

              {/* Výsledkový banner */}
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
            </Box>
          </Stack>

          {hint && <Typography variant="body2" color="text.secondary">{hint}</Typography>}

          <Stack direction="row" gap={1}>
            {/* Jediné tlačítko: vždy spustí hru (Smart Play) */}
            <Button variant="contained" onClick={handlePlay} disabled={busy || (!canPlay && phase !== 'finished')}>
              Hrát
            </Button>
            {!canPlay && phase !== 'finished' && (
              <Button variant="outlined" startIcon={<RedeemIcon />} onClick={() => maybeDailyBonus(20)}>
                Denní bonus
              </Button>
            )}
            <Box flex={1} />
            {roundRef.current && (
              <Typography variant="caption" color="text.secondary">roundId: {roundRef.current}</Typography>
            )}
          </Stack>
        </Stack>
      </CardContent>

      {/* Efekty a výherní overlay */}
      <Confetti show={confettiFx} />
      <FlyCoins show={coinsFx} toSelector="#bank-anchor" gain={overlay.payout} />

      <AnimatePresence>
        {overlay.open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1500 }}
            onClick={() => setOverlay((o) => ({ ...o, open: false }))}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: .9, y: 8, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: .9, y: 8, opacity: 0 }}
              style={{ background: 'white', borderRadius: 16, padding: 24, minWidth: 280, boxShadow: '0 28px 60px rgba(0,0,0,.35)' }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="h6" fontWeight={900}>
                  {overlay.type === 'win' ? 'Výhra!' : overlay.type === 'loss' ? 'Prohra' : 'Remíza'}
                </Typography>
                <IconButton size="small" onClick={() => setOverlay((o) => ({ ...o, open: false }))}><CloseIcon /></IconButton>
              </Stack>

              {overlay.type === 'win' ? (
                <Stack spacing={1.5} alignItems="center">
                  <EmojiEventsIcon color="warning" sx={{ fontSize: 48 }} />
                  <Typography variant="h5" fontWeight={900} color="success.main">+{overlay.payout}</Typography>
                  <Typography variant="body2" align="center">Mince připsány na účet. 💰</Typography>
                </Stack>
              ) : overlay.type === 'loss' ? (
                <Stack spacing={1.5} alignItems="center">
                  <SentimentDissatisfiedIcon color="error" sx={{ fontSize: 48 }} />
                  <Typography variant="body2" align="center">Zkus to znovu!</Typography>
                </Stack>
              ) : (
                <Typography variant="body2" align="center">Remíza – bez změny zůstatku.</Typography>
              )}

              <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
                <Button variant="contained" onClick={() => setOverlay((o) => ({ ...o, open: false }))}>
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
