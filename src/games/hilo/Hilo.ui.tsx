import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Card as MUICard, CardContent, Stack, Typography, Chip,
  Button, Box, Divider, IconButton, Tooltip, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import RedeemIcon from '@mui/icons-material/Redeem';
import { motion, AnimatePresence } from 'framer-motion';

import { useCasino } from '@games/core/useCasino';
import { HiloHost, type Guess } from './Hilo.logic';
import { FlyCoins } from '@shared/fx/FlyCoins';
import { Confetti } from '@shared/fx/Confetti';
import { applyHiloRewards } from './Hilo.rewards';

type RoundOutcome = 'win'|'loss';

function cardBox(c?: { rank: string; suit: string } | null) {
  const red = c?.suit === '♥' || c?.suit === '♦';
  return (
    <Box
      sx={{
        width: 88, height: 120, borderRadius: 1.5, border: '1px solid',
        borderColor: 'divider', bgcolor: 'background.paper', boxShadow: 1,
        display: 'grid', placeItems: 'center', fontSize: 20,
        color: red ? 'error.main' : 'text.primary', userSelect: 'none',
      }}
    >
      {c ? `${c.rank} ${c.suit}` : '…'}
    </Box>
  );
}

export default function HiloGame() {
  const GAME_KEY = 'hilo' as const;

  const { balance, priceTable, defaultPayout, startRound, finishRound, maybeDailyBonus } = useCasino();
  const entry = priceTable?.hilo?.entry ?? 6;
  const winPayout = priceTable?.hilo?.win ?? 12;

  const [st, setSt] = useState(() => HiloHost.init());
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>('Hádej, zda další karta bude vyšší nebo nižší.');
  const [overlay, setOverlay] = useState<{ open: boolean; type: RoundOutcome; payout: number }>({
    open: false, type: 'win', payout: 0,
  });
  const [coinsFx, setCoinsFx] = useState(false);
  const [confettiFx, setConfettiFx] = useState(false);

  const roundRef = useRef<string | null>(null);
  const canStart = st.phase === 'idle' && balance >= (entry | 0);
  const canGuess = st.phase === 'playing' && !busy && st.current && st.next;

  // Auto-close overlay; po zavření vrátíme do idle
  useEffect(() => {
    if (!overlay.open) return;
    const t = window.setTimeout(() => {
      setOverlay((o) => ({ ...o, open: false }));
      setSt(HiloHost.reset!());
    }, 2400);
    return () => window.clearTimeout(t);
  }, [overlay.open]);

  function conclude(type: RoundOutcome) {
    const payout = defaultPayout(GAME_KEY as any, type === 'win' ? 'win' : 'loss') ?? (type === 'win' ? winPayout : 0);
    finishRound(GAME_KEY as any, {
      roundId: roundRef.current!, result: type === 'win' ? 'win' : 'loss',
      payout, details: { correct: st.streak, livesLeft: st.lives },
    });
    roundRef.current = null;

    applyHiloRewards(type, { correct: st.streak, livesLeft: st.lives });

    if (type === 'win' && payout > 0) {
      setCoinsFx(true); setConfettiFx(true);
      setTimeout(() => { setCoinsFx(false); setConfettiFx(false); }, 1100);
    }
    setOverlay({ open: true, type, payout });
  }

  function handleStart() {
    if (busy || !canStart) {
      if (st.phase === 'idle' && !canStart) setHint('Nedostatek mincí. Zkus Denní bonus.');
      return;
    }
    const ok = startRound(GAME_KEY as any);
    if (!ok?.ok) { setHint('Nedostatek mincí.'); return; }
    roundRef.current = ok.roundId;
    setHint('Hádej: Vyšší (↑/W) nebo Nižší (↓/S).');
    setSt(HiloHost.update(HiloHost.init(), { type: 'start' }));
  }

  function handleGuess(value: Guess) {
    if (!canGuess) return;
    setBusy(true);
    const s1 = HiloHost.update(st, { type: 'guess', value });
    const s2 = HiloHost.update(s1, { type: 'reveal' });
    setSt(s2);

    // Banner + případný konec kola
    if (s2.phase === 'finished') {
      const type: RoundOutcome = s2.streak >= s2.target ? 'win' : 'loss';
      conclude(type);
    } else {
      // mezikolo — jen hint
      const diff = s1.lastCompare ?? 0;
      if (diff === 0) setHint('Remíza – stejné hodnosti. Pokračuj.');
      else {
        const correct =
          (s1.lastGuess === 'higher' && diff > 0) || (s1.lastGuess === 'lower' && diff < 0);
        setHint(correct ? 'Správně!' : 'Špatně.');
      }
    }
    setBusy(false);
  }

  function handleDaily() {
    const before = balance;
    const r = maybeDailyBonus(20);
    const gain = (r.balance ?? 0) - before;
    setHint(r.granted ? `Bonus +${gain} připsán.` : 'Bonus už dnes vyčerpán.');
  }

  // Klávesové zkratky (overlay blokuje vstup)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (overlay.open || e.repeat) return;
      const k = e.key;
      if (k === 'Enter') { e.preventDefault(); if (st.phase === 'idle') handleStart(); }
      else if (k === 'w' || k === 'W' || k === 'ArrowUp') { e.preventDefault(); handleGuess('higher'); }
      else if (k === 's' || k === 'S' || k === 'ArrowDown') { e.preventDefault(); handleGuess('lower'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [st.phase, canGuess, overlay.open]);

  const banner = useMemo(() => {
    if (st.phase !== 'reveal') return null;
    const diff = st.lastCompare ?? 0;
    if (diff === 0) return { txt: 'Remíza', color: 'default' as const };
    const ok =
      (st.lastGuess === 'higher' && diff > 0) || (st.lastGuess === 'lower' && diff < 0);
    return { txt: ok ? 'Správně!' : 'Špatně', color: ok ? ('success' as const) : ('error' as const) };
  }, [st.phase, st.lastCompare, st.lastGuess]);

  return (
    <MUICard variant="outlined" sx={{ overflow: 'hidden' }}>
      <CardContent>
        <Stack spacing={2}>
          {/* HUD */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
            <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
              <Chip icon={<SportsEsportsIcon />} label="Hi-Lo (karty)" />
              <Chip variant="outlined" label={`Vstup: ${entry}`} />
              <Chip variant="outlined" label={`Výhra: ${winPayout}`} />
              <Chip variant="outlined" label={`Zůstatek: ${balance}`} />
              <Chip variant="outlined" label={`Cíl: ${st.target} správně`} />
              <Chip variant="outlined" label={`Životy: ${st.lives}`} />
              <Chip variant="outlined" label={`Správně: ${st.streak}/${st.target}`} />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Zkratky: Enter = Start • ↑/W = Vyšší • ↓/S = Nižší
            </Typography>
          </Stack>

          <Divider />
          {st.phase === 'idle' && (
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
    <AccordionSummary
      expandIcon={<ExpandMoreIcon />}
      aria-controls="hilo-help-content"
      id="hilo-help-header"
    >
      <Typography fontWeight={600}>Jak hrát</Typography>
    </AccordionSummary>
    <AccordionDetails>
      <Box sx={{ fontSize: 14, color: 'text.secondary', lineHeight: 1.7 }}>
        <Typography variant="body2" component="div">
          • Tvým cílem je hádat, zda <b>další karta</b> bude
          {' '}<b>vyšší</b> nebo <b>nižší</b> než ta <b>aktuální</b>.<br/>
          • Po každém kole se karta, kterou jsi hádal, stane <b>novou aktuální</b>.<br/>
          • Stejné hodnoty (např. <b>9</b> a <b>9</b>) znamenají <b>remízu</b> — pokračuješ dál.<br/>
          • Máš <b>3 životy</b> – za špatný tip jeden ztratíš.<br/>
          • Za <b>5 správných</b> tahů v řadě vyhráváš a získáváš mince.<br/>
          • Ovládání: <b>Enter = Start</b>, <b>↑/W = Vyšší</b>, <b>↓/S = Nižší</b>.
        </Typography>
      </Box>
    </AccordionDetails>
  </Accordion>
)}

          {/* Board */}
          <Stack direction={{ xs: 'column', md: 'row' }} gap={2} alignItems="center" justifyContent="center">
            <Box textAlign="center">
              <Typography variant="subtitle2" gutterBottom>Aktuální karta</Typography>
              <motion.div initial={false} animate={{ scale: st.phase === 'reveal' ? 1.02 : 1 }} transition={{ duration: 0.2 }}>
                {cardBox(st.current)}
              </motion.div>
            </Box>
            <Box textAlign="center">
              <Typography variant="subtitle2" gutterBottom>Další karta</Typography>
              <AnimatePresence initial={false} mode="popLayout">
                {st.phase !== 'idle' ? (
                  <motion.div
                    key={st.next?.id ?? 'next'}
                    initial={{ scale: 0.9, y: -6, opacity: 0.0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.9, y: -6, opacity: 0 }}
                  >
                    {st.phase === 'reveal' || st.phase === 'finished' ? cardBox(st.next) : cardBox(null)}
                  </motion.div>
                ) : (
                  <Box>{cardBox(null)}</Box>
                )}
              </AnimatePresence>

              {/* Výsledkový banner mezi tahy */}
              <AnimatePresence>
                {banner && (
                  <motion.div
                    initial={{ y: -8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -8, opacity: 0 }}
                    style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}
                  >
                    <Chip label={banner.txt} color={banner.color} />
                  </motion.div>
                )}
              </AnimatePresence>
            </Box>
          </Stack>

          {/* Hint */}
          {hint && <Typography variant="body2" color="text.secondary">{hint}</Typography>}

          {/* Ovládání */}
          <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
            {st.phase === 'idle' ? (
              <>
                <Button variant="contained" onClick={handleStart} disabled={!canStart}>Start</Button>
                {!canStart && <Button variant="outlined" startIcon={<RedeemIcon />} onClick={handleDaily}>Denní bonus</Button>}
              </>
            ) : (
              <>
                <Button variant="contained" startIcon={<ArrowUpwardIcon />} disabled={!canGuess} onClick={() => handleGuess('higher')}>Vyšší</Button>
                <Button variant="contained" startIcon={<ArrowDownwardIcon />} disabled={!canGuess} onClick={() => handleGuess('lower')}>Nižší</Button>
              </>
            )}
            <Box flex={1} />
            {roundRef.current && <Typography variant="caption" color="text.secondary">roundId: {roundRef.current}</Typography>}
          </Stack>
        </Stack>
      </CardContent>

      {/* Efekty */}
      <Confetti show={confettiFx} />
      <FlyCoins show={coinsFx} toSelector="#bank-anchor" gain={overlay.payout} />

      {/* Overlay pouze na KONEC kola (win/loss) */}
      <AnimatePresence>
        {overlay.open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1500 }}
            onClick={() => setOverlay((o) => ({ ...o, open: false }))}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: .96, y: 8, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: .96, y: 8, opacity: 0 }}
              style={{ background: 'white', borderRadius: 16, padding: 24, minWidth: 280, boxShadow: '0 28px 60px rgba(0,0,0,.35)' }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="h6" fontWeight={900}>
                  {overlay.type === 'win' ? 'Výhra!' : 'Prohra'}
                </Typography>
                <IconButton size="small" onClick={() => setOverlay((o) => ({ ...o, open: false }))}><CloseIcon /></IconButton>
              </Stack>

              <Typography variant="h5" fontWeight={900} color={overlay.type === 'win' ? 'success.main' : 'error.main'} align="center">
                {overlay.type === 'win' ? `+${overlay.payout}` : `0`}
              </Typography>
              <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                {overlay.type === 'win' ? 'Mince připsány na účet.' : 'Zkus to znovu.'}
              </Typography>
              <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
                <Tooltip title="Okno se zavře samo za ~2.4 s">
                  <span><Button variant="contained" onClick={() => setOverlay((o) => ({ ...o, open: false }))}>Pokračovat</Button></span>
                </Tooltip>
              </Stack>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MUICard>
  );
}
