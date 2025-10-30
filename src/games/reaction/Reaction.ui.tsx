import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Card, CardContent, Stack, Typography, Button, Chip, Box, Divider, Tooltip, IconButton, Alert,
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import RedeemIcon from '@mui/icons-material/Redeem';
import CloseIcon from '@mui/icons-material/Close';
import { motion, AnimatePresence } from 'framer-motion';
import { useCasino } from '@games/core/useCasino';
import { ReactionHost, initialState, resultFromMs, THRESHOLDS, State } from './Reaction.logic';
import { applyReactionRewards } from './Reaction.rewards';
import { FlyCoins } from '@shared/fx/FlyCoins';
import { Confetti } from '@shared/fx/Confetti';

export default function ReactionTap() {
  const { balance, priceTable, defaultPayout, startRound, finishRound, maybeDailyBonus, canAfford } = useCasino();
  const cost = priceTable?.reaction?.entry ?? 4;

  const [st, setSt] = useState<State>(() => ReactionHost.init());
  const [hint, setHint] = useState<string | null>('Po startu čekej na „TEĎ!“ a co nejrychleji stiskni mezerník.');
  const [busy, setBusy] = useState(false);
  const [overlay, setOverlay] = useState<{ open: boolean; type: 'win'|'draw'|'loss'; payout: number; ms?: number }>(
    { open: false, type: 'loss', payout: 0 },
  );
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [coinsFx, setCoinsFx] = useState(false);
  const [confettiFx, setConfettiFx] = useState(false);

  const roundRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const canStart = useMemo(() => canAfford(cost), [cost, canAfford]);

  const banner = useMemo(() => {
    if (st.phase !== 'finished') return null;
    if (st.foul) return { text: 'Předčasný stisk – prohra', color: 'error' as const };
    if (st.resultMs == null) return { text: 'Prohra', color: 'error' as const };
    const res = resultFromMs(st.resultMs);
    if (res === 'win') return { text: `Vyhrál jsi! ${st.resultMs} ms`, color: 'success' as const };
    if (res === 'draw') return { text: `Remíza: ${st.resultMs} ms`, color: 'default' as const };
    return { text: `Prohra: ${st.resultMs} ms`, color: 'error' as const };
  }, [st]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
        if (overlayOpen) return; 
        if (e.repeat) return;
        const k = e.key.toLowerCase();
        if (k === 'enter') {
            e.preventDefault();
            handleStart();
        }
        if (k === ' ') {
            e.preventDefault();
            handleTap();
        }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayOpen , canStart, st.phase]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  function resetLocal() {
    setSt(ReactionHost.reset!());
    setBusy(false);
    setHint('Po startu čekej na „TEĎ!“ a co nejrychleji stiskni mezerník.');
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function armWithRandomWait() {
    setSt((s) => ReactionHost.update(s, { type: 'arm' }));
    const wait = 800 + Math.random() * 1700; // 0.8–2.5 s
    timerRef.current = window.setTimeout(() => {
      setSt((s) => ReactionHost.update(s, { type: 'go' }));
    }, wait) as unknown as number;
  }

  function handleStart() {
    if (busy) return;
    // "Smart start" – po dohraném kole znovu připravíme
    if (st.phase === 'finished') resetLocal();

    if (!canStart) {
      setHint('Nedostatek mincí. Využij Denní bonus.');
      return;
    }

    const stRound = startRound('reaction' as any);
    if (!stRound?.ok) {
      setHint('Nedostatek mincí.');
      return;
    }
    roundRef.current = stRound.roundId;
    setBusy(true);
    setHint('Připrav se… (neklikej, jinak je to foul)');
    armWithRandomWait();
  }

  function conclude(p: { result: 'win'|'draw'|'loss'; ms: number | null; foul?: boolean }) {
    const payout = defaultPayout('reaction' as any, p.result);
    finishRound('reaction' as any, {
      roundId: roundRef.current!,
      result: p.result as any,
      payout,
      details: { ms: p.ms, foul: !!p.foul },
    });
    roundRef.current = null;

    applyReactionRewards({ ms: p.ms, foul: !!p.foul });

    setOverlay({ open: true, type: p.result, payout, ms: p.ms ?? undefined });
    if (p.result === 'win' && payout > 0) {
      setCoinsFx(true);
      setConfettiFx(true);
      setTimeout(() => { setCoinsFx(false); setConfettiFx(false); }, 1100);
    }
    setOverlayOpen(true);
    window.setTimeout(() => {
        setOverlayOpen(false);
        // volitelně: připrav rovnou nový start (reset UI do 'idle')
        setSt((s) => ({ ...s, phase: 'idle', hint: null }));
    }, 1500);
  }

  function handleTap() {
    if (!busy) return; // mimo kolo ignoruj
    // foul při 'wait' (tap/klik před GO)
    if (st.phase === 'wait') {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      setSt((s) => ReactionHost.update(s, { type: 'foul' }));
      setBusy(false);
      setHint('Předčasně! Zkus to znovu.');
      conclude({ result: 'loss', ms: null, foul: true });
      return;
    }
    // validní tap až po 'go'
    if (st.phase === 'go') {
        const now = Date.now();

        const updated = ReactionHost.update(st, { type: 'tap', at: now });

        setSt(updated);
        setBusy(false);
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }

        const ms = updated.resultMs ?? 9999;
        const res = resultFromMs(ms);
        setHint(res === 'win' ? 'Paráda!' : res === 'draw' ? 'Solidní!' : 'Příště rychleji.');
        conclude({ result: res, ms });
    }
  }

  return (
    <Card variant="outlined" sx={{ overflow: 'hidden' }}>
      <CardContent>
        <Stack spacing={2}>
          {/* Top info řádek */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
            <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
              <Chip icon={<SportsEsportsIcon />} label="Reaction Tap" />
              <Chip variant="outlined" label={`Cena: ${cost}`} />
              <Chip variant="outlined" label={`Zůstatek: ${balance}`} />
              <Chip icon={<AccessTimeIcon />} variant="outlined" label={`Win ≤ ${THRESHOLDS.win} ms • Draw ≤ ${THRESHOLDS.draw} ms`} />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Zkratky: Enter = Start • Space = Tap
            </Typography>
          </Stack>

          <Divider />

          {/* Arena */}
          <Stack direction={{ xs: 'column', md: 'row' }} gap={2} alignItems="stretch">
            {/* Nápověda */}
            <Box flex={1}>
              <Typography variant="subtitle2" gutterBottom>Nápověda</Typography>
              <Alert severity="info" variant="outlined" sx={{ '& .MuiAlert-message': { width: '100%' } }}>
                <Stack spacing={0.5}>
                  <Typography variant="body2">
                    1) Stiskni <b>Enter</b> (zaplatíš vstup). Objeví se fáze „Připrav se“.
                  </Typography>
                  <Typography variant="body2">
                    2) Až uvidíš <b>„TEĎ!“</b>, okamžitě stiskni <b>mezerník</b> (nebo klikni).
                  </Typography>
                  <Typography variant="body2">
                    3) <b>Předčasný stisk</b> ve „Připrav se“ znamená <b>prohru</b>.
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Výplaty určuje ceník Casina (win/draw) – vidíš je výše.
                  </Typography>
                </Stack>
              </Alert>
            </Box>

            {/* Panel hry */}
            <Box flex={1}>
              <Typography variant="subtitle2" gutterBottom>Aréna</Typography>
              <Box
                component={motion.div}
                initial={false}
                animate={{
                  backgroundColor:
                    st.phase === 'go'
                      ? 'rgba(76,175,80,0.08)'
                      : st.phase === 'wait'
                      ? 'rgba(255,193,7,0.10)'
                      : st.phase === 'finished' && (st.foul || (st.resultMs ?? 9999) > THRESHOLDS.draw)
                      ? 'rgba(244,67,54,0.06)'
                      : 'transparent',
                }}
                transition={{ duration: 0.25 }}
                sx={{
                  border: '1px dashed',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 3,
                  minHeight: 160,
                  display: 'grid',
                  placeItems: 'center',
                  userSelect: 'none',
                  cursor: st.phase === 'go' || st.phase === 'wait' ? 'pointer' : 'default',
                }}
                onClick={() => handleTap()}
              >
                <AnimatePresence initial={false} mode="popLayout">
                  {st.phase === 'idle' && (
                    <motion.div key="idle" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                      <Typography variant="h5" fontWeight={900} align="center">Připrav se</Typography>
                      <Typography variant="body2" align="center" color="text.secondary">Stiskni Enter</Typography>
                    </motion.div>
                  )}
                  {st.phase === 'wait' && (
                    <motion.div key="wait" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}>
                      <Typography variant="h4" fontWeight={900} align="center">PŘIPRAV SE…</Typography>
                      <Typography variant="caption" align="center" color="text.secondary" display="block">
                        Klik/mezerník teď = prohra
                      </Typography>
                    </motion.div>
                  )}
                  {st.phase === 'go' && (
                    <motion.div key="go" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                      <Typography variant="h3" fontWeight={900} align="center">TEĎ!</Typography>
                      <Typography variant="body2" align="center" color="text.secondary">Stiskni mezerník co nejrychleji</Typography>
                    </motion.div>
                  )}
                  {st.phase === 'finished' && (
                    <motion.div key="fin" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}>
                      <Stack spacing={1} alignItems="center">
                        {st.foul ? (
                          <>
                            <Typography variant="h5" color="error.main" fontWeight={900}>Foul start</Typography>
                            <Typography variant="body2" color="text.secondary">Předčasný stisk ve fázi „Připrav se“</Typography>
                          </>
                        ) : (
                          <>
                            <Typography variant="h3" fontWeight={900}>{st.resultMs} ms</Typography>
                            <Typography variant="body2" color="text.secondary">Reakční čas</Typography>
                          </>
                        )}
                      </Stack>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Box>

              {/* Výsledkový banner (jako RPS) */}
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

          {/* hint */}
          {hint && <Typography variant="body2" color="text.secondary">{hint}</Typography>}

          {/* Ovládání */}
          <Stack direction="row" gap={1}>
            <Button variant="contained" onClick={handleStart} disabled={busy || (!canStart && st.phase !== 'finished')}>
              Start (Enter)
            </Button>
            <Button
              variant="outlined"
              onClick={handleTap}
              disabled={!busy || (st.phase !== 'go' && st.phase !== 'wait')}
            >
              Tap (Space)
            </Button>
            {!canStart && st.phase !== 'finished' && (
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

      {/* Efekty */}
      <Confetti show={confettiFx} />
      <FlyCoins show={coinsFx} toSelector="#bank-anchor" gain={overlay.payout} />

      {/* Overlay s výhrou/výsledkem */}
      <AnimatePresence>
        {overlayOpen  && (
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
                  {overlay.type === 'win' ? 'Výhra!' : overlay.type === 'draw' ? 'Remíza' : 'Prohra'}
                </Typography>
                <IconButton size="small" onClick={() => setOverlay((o) => ({ ...o, open: false }))}><CloseIcon /></IconButton>
              </Stack>

              <Stack spacing={1.5} alignItems="center">
                {overlay.ms != null && (
                  <Typography variant="h4" fontWeight={900}>{overlay.ms} ms</Typography>
                )}
                <Typography variant="h5" fontWeight={900} color={overlay.type === 'win' ? 'success.main' : overlay.type === 'draw' ? 'text.primary' : 'error.main'}>
                  {overlay.type === 'win' ? `+${overlay.payout}` : overlay.type === 'draw' ? `+${overlay.payout}` : '0'}
                </Typography>
                <Typography variant="body2" align="center" color="text.secondary">
                  {overlay.type === 'win' || overlay.type === 'draw'
                    ? 'Mince připsány na účet.'
                    : 'Zkus to znovu – a rychleji!'}
                </Typography>
              </Stack>

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
