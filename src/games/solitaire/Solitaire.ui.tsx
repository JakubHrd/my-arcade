import { useEffect, useMemo, useRef, useState } from 'react';
import { Card as MUICard, CardContent, Stack, Typography, Chip, Button, Box, Divider, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { motion, AnimatePresence } from 'framer-motion';
import { useCasino } from '@games/core/useCasino';
import { FlyCoins } from '@shared/fx/FlyCoins';
import { Confetti } from '@shared/fx/Confetti';

import {
  SUITS, RANKS, Card as K, State, deal, canOnTableau, canOnFound, isValidStack, deep,
  trySolve, generateDealForDifficulty, isRed,
} from './Solitaire.logic';

type Difficulty = 'easy'|'medium'|'hard'|'extreme';

export default function Solitaire() {
  const GAME_KEY = 'hilo-solitaire' as const; // unikátní klíč do ceníku / historie
  const { balance, priceTable, defaultPayout, startRound, finishRound } = useCasino();

  const [price, setPrice] = useState(() => priceTable?.hilo?.entry ?? 6);
  const [payoutWin, setPayoutWin] = useState(() => priceTable?.hilo?.win ?? 18);

  const [phase, setPhase] = useState<'idle'|'playing'|'auto'|'won'|'lost'>('idle');
  const [drawMode, setDrawMode] = useState<1|3>(1);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');

  const [state, setState] = useState<State>(() => deal(drawMode));
  const [selected, setSelected] = useState<{ from: 'waste' } | { from: 'tableau'; col: number; index: number } | null>(null);
  const [steps, setSteps] = useState(0);
  const [msg, setMsg] = useState('Zvol obtížnost a klikni na Nová hra.');

  const undoRef = useRef<State[]>([]);
  const roundRef = useRef<string | null>(null);

  // efekty po výhře
  const [overlay, setOverlay] = useState<{ open: boolean; payout: number }>({ open: false, payout: 0 });
  const [coinsFx, setCoinsFx] = useState(false);
  const [confettiFx, setConfettiFx] = useState(false);

  useEffect(() => {
    const pt = priceTable?.hilo;
    if (pt?.entry != null) setPrice(pt.entry|0);
    if (pt?.win != null) setPayoutWin(pt.win|0);
  }, [priceTable]);

  // detekce výhry
  useEffect(() => {
    const won = SUITS.every((s) => state.found[s].length === 13);
    if ((phase === 'playing' || phase === 'auto') && won) {
      setPhase('won');
      setMsg('Vyhrál jsi! 🎉');
      const payout = defaultPayout(GAME_KEY as any, 'win') ?? payoutWin;
      finishRound(GAME_KEY as any, { roundId: roundRef.current!, result: 'win', payout, details: { drawMode, difficulty, steps } });
      roundRef.current = null;

      // efekty + overlay + mince do banku
      setOverlay({ open: true, payout });
      setCoinsFx(true); setConfettiFx(true);
      setTimeout(() => { setCoinsFx(false); setConfettiFx(false); }, 1200);
    }
  }, [state, phase, drawMode, difficulty, steps, payoutWin, defaultPayout, finishRound]);

  const pushUndo = () => {
    undoRef.current.push(deep(state));
    if (undoRef.current.length > 200) undoRef.current.shift();
  };
  const undo = () => {
    if (!undoRef.current.length) return;
    const last = undoRef.current.pop()!;
    setState(last);
    setSelected(null);
    setPhase('playing');
    setMsg('Krok zpět.');
  };

  const startGame = () => {
    if (phase === 'playing' || phase === 'auto') return;
    const st = startRound(GAME_KEY as any, { drawMode, difficulty });
    if (!st?.ok) { setMsg('Nemáš dost mincí pro start.'); return; }
    roundRef.current = st.roundId;

    setMsg(`Míchám balíček (${difficulty})…`);
    const picked = generateDealForDifficulty(drawMode, difficulty);
    if (!picked) {
      const d = deal(drawMode);
      setState(d);
      setMsg('Rozdáno (fallback).');
    } else {
      setState(picked.deal);
      setMsg(
        difficulty === 'easy' ? 'Rozdáno – hodně hratelný layout 👍'
        : difficulty === 'medium' ? 'Rozdáno – spíš přívětivé.'
        : difficulty === 'hard' ? 'Rozdáno – náročnější kolo.'
        : 'Rozdáno – extrémně utažené. Bez chyby!'
      );
    }
    undoRef.current = [];
    setSelected(null);
    setSteps(0);
    setPhase('playing');
  };

  const giveUp = () => {
    if (phase !== 'playing' && phase !== 'auto') return;
    setPhase('lost');
    setMsg('Vzdáno.');
    const payout = defaultPayout(GAME_KEY as any, 'loss') ?? 0;
    finishRound(GAME_KEY as any, { roundId: roundRef.current!, result: 'loss', payout, details: { drawMode, difficulty } });
    roundRef.current = null;
  };

  const autoFlip = (st: State) => {
    const cols = st.tableau.map((col) => {
      if (!col.length) return col;
      const top = col[col.length - 1];
      return top.faceUp ? col : [...col.slice(0, -1), { ...top, faceUp: true }];
    });
    return { ...st, tableau: cols };
  };

  // === Akce ===
  const drawFromStock = () => {
    if (phase !== 'playing') return;
    pushUndo();
    const st = deep(state);
    if (st.stock.length === 0) {
      if (!st.waste.length) { undoRef.current.pop(); return; }
      st.stock = st.waste.slice().reverse().map((c) => ({ ...c, faceUp: false }));
      st.waste = [];
      setState(st); setSelected(null); setMsg('Recyklace balíčku.');
      return;
    }
    const n = Math.min(st.drawMode, st.stock.length);
    const take = st.stock.slice(-n).map((c) => ({ ...c, faceUp: true }));
    st.stock = st.stock.slice(0, st.stock.length - n);
    st.waste = st.waste.concat(take);
    setState(st); setSelected(null);
  };

  const tryAutoMoveToFoundation = (from: { kind: 'waste' } | { kind: 'tableau'; col: number }) => {
    if (phase !== 'playing') return false;
    const st = deep(state);

    if (from.kind === 'waste') {
      const card = st.waste[st.waste.length - 1]; if (!card) return false;
      const pile = st.found[card.suit];
      if (!canOnFound(card, pile)) return false;
      pushUndo();
      st.waste.pop(); pile.push(card);
      setState(autoFlip(st)); setSelected(null); return true;
    }
    if (from.kind === 'tableau') {
      const col = st.tableau[from.col];
      if (!col?.length) return false;
      const top = col[col.length - 1]; if (!top?.faceUp) return false;
      const pile = st.found[top.suit];
      if (!canOnFound(top, pile)) return false;
      pushUndo();
      col.pop(); pile.push(top);
      setState(autoFlip(st)); setSelected(null); return true;
    }
    return false;
  };

  const moveWasteToTableau = (toCol: number) => {
    const st = deep(state);
    const top = st.waste[st.waste.length - 1]; if (!top) return;
    const target = st.tableau[toCol][st.tableau[toCol].length - 1] || null;
    if (!canOnTableau(top, target)) return;
    pushUndo();
    st.waste.pop();
    st.tableau[toCol] = [...st.tableau[toCol], top];
    setState(autoFlip(st)); setSelected(null);
  };

  const moveTableauToTableau = (toCol: number, fromCol: number, fromIndex: number) => {
    const st = deep(state);
    const src = st.tableau[fromCol];
    const stack = src.slice(fromIndex);
    if (!stack.length || !isValidStack(stack)) return;
    const target = st.tableau[toCol][st.tableau[toCol].length - 1] || null;
    if (!canOnTableau(stack[0], target)) return;
    if (!st.tableau[toCol].length && stack[0].rank !== 'K') return;
    pushUndo();
    st.tableau[fromCol] = st.tableau[fromCol].slice(0, fromIndex);
    st.tableau[toCol] = [...st.tableau[toCol], ...stack];
    setState(autoFlip(st)); setSelected(null);
  };

  const moveToFoundation = (suit: K['suit'], payload: { src: 'waste' } | { src: 'tableau'; col: number; index: number }) => {
    const st = deep(state);
    const pile = st.found[suit];
    if (payload.src === 'waste') {
      const card = st.waste[st.waste.length - 1];
      if (!card || !canOnFound(card, pile)) return;
      pushUndo();
      st.waste.pop(); pile.push(card);
      setState(autoFlip(st)); setSelected(null); return;
    }
    const topIndex = st.tableau[payload.col].length - 1;
    if (payload.index !== topIndex) return;
    const card = st.tableau[payload.col][topIndex];
    if (!canOnFound(card, pile)) return;
    pushUndo();
    st.tableau[payload.col] = st.tableau[payload.col].slice(0, topIndex);
    pile.push(card);
    setState(autoFlip(st)); setSelected(null);
  };

  // === Klik logika (základ + double-click auto-move) ===
  const clickStock = () => drawFromStock();
  const clickWaste = () => {
    if (phase !== 'playing' || !state.waste.length) return;
    const topId = state.waste[state.waste.length - 1].id;
    if (selected?.from === 'waste') {
      if (!tryAutoMoveToFoundation({ kind: 'waste' })) setSelected(null);
      return;
    }
    setSelected({ from: 'waste' });
  };
  const clickTableau = (colIdx: number, index: number) => {
    if (phase !== 'playing') return;
    const card = state.tableau[colIdx][index];
    if (!card.faceUp) {
      if (index === state.tableau[colIdx].length - 1) {
        pushUndo();
        const st = deep(state);
        st.tableau[colIdx][index] = { ...card, faceUp: true };
        setState(st);
      }
      return;
    }
    if (selected?.from === 'tableau' && selected.col === colIdx && selected.index === index && index === state.tableau[colIdx].length - 1) {
      if (!tryAutoMoveToFoundation({ kind: 'tableau', col: colIdx })) setSelected(null);
      return;
    }
    if (!selected) { setSelected({ from: 'tableau', col: colIdx, index }); return; }

    const target = state.tableau[colIdx][state.tableau[colIdx].length - 1] || null;

    if (selected.from === 'waste') {
      const top = state.waste[state.waste.length - 1]; if (!top) return;
      if (!canOnTableau(top, target)) { setMsg('Sem to nejde.'); return; }
      moveWasteToTableau(colIdx); return;
    }
    if (selected.from === 'tableau') {
      const { col, index: srcIndex } = selected;
      const stack = state.tableau[col].slice(srcIndex);
      if (!isValidStack(stack) || !canOnTableau(stack[0], target)) { setMsg('Sem to nejde.'); return; }
      if (!state.tableau[colIdx].length && stack[0].rank !== 'K') { setMsg('Prázdný sloupec – jen s králem.'); return; }
      moveTableauToTableau(colIdx, col, srcIndex); return;
    }
  };
  const clickEmptyCol = (colIdx: number) => {
    if (!selected) return;
    if (selected.from === 'waste') {
      const top = state.waste[state.waste.length - 1];
      if (!top || top.rank !== 'K') return;
      pushUndo();
      const st = deep(state);
      st.waste = st.waste.slice(0, -1);
      st.tableau[colIdx] = [...st.tableau[colIdx], top];
      setState(st); setSelected(null); return;
    }
    if (selected.from === 'tableau') {
      const { col, index } = selected;
      const stack = state.tableau[col].slice(index);
      if (!isValidStack(stack) || stack[0].rank !== 'K') return;
      moveTableauToTableau(colIdx, col, index); return;
    }
  };

  // === Auto-win tlačítko
  const autoWin = () => {
    if (phase !== 'playing') return;
    const current = deep(state);
    const solved = trySolve(current);
    if (!solved.ok) { setMsg('Solver to teď nedá. Zkus pár tahů a znovu Auto-win.'); return; }
    setMsg('Auto-win ✨'); setPhase('auto'); setSelected(null);

    let st = deep(current);
    const path = solved.path.slice();
    const apply = (mv: any) => {
      switch (mv.type) {
        case 'flip': {
          const col = st.tableau[mv.col];
          if (col.length && !col[col.length - 1].faceUp) col[col.length - 1].faceUp = true;
          break;
        }
        case 'waste_to_found': {
          const card = st.waste.pop();
          if (card) st.found[card.suit].push(card);
          break;
        }
        case 'tab_to_found': {
          const top = st.tableau[mv.from].pop();
          if (top) st.found[top.suit].push(top);
          const col = st.tableau[mv.from];
          if (col.length && !col[col.length - 1].faceUp) col[col.length - 1].faceUp = true;
          break;
        }
        case 'tab_to_tab': {
          const stack = st.tableau[mv.from].slice(mv.index);
          st.tableau[mv.from] = st.tableau[mv.from].slice(0, mv.index);
          st.tableau[mv.to] = st.tableau[mv.to].concat(stack);
          const col = st.tableau[mv.from];
          if (col.length && !col[col.length - 1].faceUp) col[col.length - 1].faceUp = true;
          break;
        }
        case 'waste_to_tab':
        case 'waste_to_tab_empty': {
          const card = st.waste.pop();
          if (card) st.tableau[mv.to].push(card);
          break;
        }
        case 'recycle': {
          st.stock = st.waste.slice().reverse().map((c) => ({ ...c, faceUp: false }));
          st.waste = [];
          break;
        }
        case 'draw': {
          const n = Math.min(st.drawMode, st.stock.length);
          const take = st.stock.slice(-n).map((c) => ({ ...c, faceUp: true }));
          st.stock = st.stock.slice(0, st.stock.length - n);
          st.waste = st.waste.concat(take);
          break;
        }
      }
    };

    const tick = () => {
      if (!path.length) {
        setState(st);
        setPhase('playing'); // necháme useEffect detekovat WIN
        return;
      }
      for (let i = 0; i < 3 && path.length; i++) apply(path.shift());
      setState(deep(st));
      setTimeout(tick, 90);
    };
    tick();
  };

  // ===== Render =====
  const offDown = 18, offUp = 28;
  const canStart = phase !== 'playing' && phase !== 'auto' && balance >= (price | 0);

  const CardFace = ({ c, sel, onDoubleClick }: { c: K; sel?: boolean; onDoubleClick?: () => void }) => (
    <div className={`sol-card faceUp ${isRed(c.suit) ? 'red' : ''} ${sel ? 'sel' : ''}`} onDoubleClick={onDoubleClick}>
      <div className="rank">{c.rank}<br/>{c.suit}</div>
      <div className="pip">{c.rank}{c.suit}</div>
      <div className="rank br">{c.rank}<br/>{c.suit}</div>
    </div>
  );
  const CardDown = () => <div className="sol-card faceDown" />;

  return (
    <MUICard variant="outlined" sx={{ overflow: 'visible' }}>
      <CardContent>
        <Stack spacing={2}>
          {/* Top bar */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
            <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
              <Chip label={`💰 ${balance}`} />
              <Chip variant="outlined" label={`Vstup: -${price} • Výhra: +${payoutWin}`} />
              <Chip variant="outlined" label={`Kroky: ${steps}`} />
              <Chip variant="outlined" label={`Draw: ${drawMode} • Režim: ${difficulty}`} />
            </Stack>
          </Stack>

          <Stack direction="row" gap={1} flexWrap="wrap">
            <select className="mg-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} disabled={phase==='playing'||phase==='auto'}>
              <option value="easy">Lehká</option>
              <option value="medium">Střední</option>
              <option value="hard">Těžká</option>
              <option value="extreme">Extrémní</option>
            </select>
            <Button variant="contained" disabled={!canStart} onClick={startGame}>Nová hra</Button>
            <Button variant="outlined" disabled={undoRef.current.length===0 || phase==='idle'} onClick={undo}>Undo</Button>
            <Button variant="outlined" disabled={phase==='playing' || phase==='auto'} onClick={() => setDrawMode(d => d===1?3:1)}>
              Přepnout {drawMode===1 ? 'na 3-card' : 'na 1-card'}
            </Button>
            <Button variant="outlined" disabled={phase!=='playing'} onClick={autoWin}>Auto-win</Button>
            <Button variant="outlined" disabled={phase!=='playing' && phase!=='auto'} onClick={giveUp}>Vzdát</Button>
          </Stack>

          <Divider />

          {/* BOARD */}
          <div className="sol-board">
            <div className="sol-row">
              <div className="sol-side">
                {/* STOCK */}
                <div className="sol-pile" onClick={clickStock} title="Stock (klik = dobírat / recyklovat)">
                  {state.stock.length ? <CardDown/> : <div className="sol-mini" style={{ padding: 6 }}>Prázdný (klik = recyklace)</div>}
                </div>

                {/* WASTE fan */}
                <div className="sol-wasteFan">
                  {state.waste.slice(-3).map((c, i, arr) => {
                    const isTop = i === arr.length - 1;
                    const sel = selected?.from === 'waste';
                    return (
                      <div key={c.id} className="slot" style={{ left: i*10 }} onClick={clickWaste}>
                        <CardFace c={c} sel={sel && isTop} onDoubleClick={() => tryAutoMoveToFoundation({ kind: 'waste' })} />
                      </div>
                    );
                  })}
                  {state.waste.length===0 && (
                    <div className="sol-mini" style={{ position:'absolute', top:'40%', left:0, right:0, textAlign:'center' }}>Waste</div>
                  )}
                </div>
              </div>

              {/* FOUNDATIONS */}
              <div className="sol-found">
                {SUITS.map((s) => {
                  const pile = state.found[s];
                  const top = pile[pile.length - 1] || null;
                  return (
                    <div key={s} className="sol-pile" title={`Foundation ${s}`}
                      onClick={() => {
                        if (!selected) return;
                        if (selected.from === 'waste') return moveToFoundation(s, { src:'waste' });
                        if (selected.from === 'tableau') return moveToFoundation(s, { src:'tableau', col:selected.col, index:selected.index });
                      }}>
                      {top ? <CardFace c={top}/> : <div className="sol-mini" style={{ padding: 6 }}>{s}</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TABLEAU */}
            <div className="sol-tableau">
              {state.tableau.map((col, ci) => {
                const height = col.reduce((h, c) => h + (c.faceUp ? offUp : offDown), 0) + 6 + 116;
                return (
                  <div key={ci} className="sol-col" style={{ minHeight: Math.max(height, 190) }}
                    onClick={() => { if (!col.length) clickEmptyCol(ci); }}>
                    <div className="sol-fan" style={{ height }}>
                      {col.map((c, idx) => {
                        const y = col.slice(0, idx).reduce((p, cc) => p + (cc.faceUp ? offUp : offDown), 0);
                        const sel = selected?.from === 'tableau' && selected.col === ci && selected.index === idx;
                        const isTop = idx === col.length - 1;
                        return (
                          <div key={c.id} className="slot" style={{ top: y }} onClick={() => clickTableau(ci, idx)}>
                            {c.faceUp ? (
                              <CardFace c={c} sel={sel} onDoubleClick={() => { if (isTop) tryAutoMoveToFoundation({ kind: 'tableau', col: ci }); }} />
                            ) : (<CardDown />)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* status */}
          {msg && (
            <div className="sol-msg">
              <span className={phase==='won' ? 'mg-badge mg-badge--win' : phase==='lost' ? 'mg-badge mg-badge--lose' : 'mg-badge mg-badge--draw'}>
                {msg}
              </span>
            </div>
          )}
        </Stack>
      </CardContent>

      {/* Efekty */}
      <Confetti show={confettiFx} />
      <FlyCoins show={coinsFx} toSelector="#bank-anchor" gain={overlay.payout} />

      {/* Overlay po výhře */}
      <AnimatePresence>
        {overlay.open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1500 }}
            onClick={() => setOverlay({ ...overlay, open: false })}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: .96, y: 8, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: .96, y: 8, opacity: 0 }}
              style={{ background: 'white', borderRadius: 16, padding: 24, minWidth: 280, boxShadow: '0 28px 60px rgba(0,0,0,.35)' }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="h6" fontWeight={900}>Výhra!</Typography>
                <IconButton size="small" onClick={() => setOverlay({ ...overlay, open: false })}><CloseIcon /></IconButton>
              </Stack>
              <Typography variant="h5" fontWeight={900} color="success.main" align="center">+{overlay.payout}</Typography>
              <Typography variant="body2" align="center" sx={{ mt: 1 }}>Mince připsány na účet. 💰</Typography>
              <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
                <Button variant="contained" onClick={() => setOverlay({ ...overlay, open: false })}>Pokračovat</Button>
              </Stack>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MUICard>
  );
}
