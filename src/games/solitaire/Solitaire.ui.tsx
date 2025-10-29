import { useEffect, useRef, useState } from 'react';
import {
  Card as MUICard,
  CardContent,
  Stack,
  Typography,
  Chip,
  Button,
  Box,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { motion, AnimatePresence } from 'framer-motion';
import { useCasino } from '@games/core/useCasino';
import { FlyCoins } from '@shared/fx/FlyCoins';
import { Confetti } from '@shared/fx/Confetti';

import {
  SUITS,
  Card as K,
  State,
  deal,
  canOnTableau,
  canOnFound,
  isValidStack,
  deep,
  trySolve,
  generateDealForDifficulty,
  isRed,
} from './Solitaire.logic';

import { applySolitaireRewards } from './Solitaire.rewards';

// ---- DND
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDraggable,
  useDroppable,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from '@dnd-kit/core';

type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme';

const CARD_W = 76;
const CARD_H = 108;
const FAN_UP = 28;
const FAN_DOWN = 18;

/** Karta – lícem nahoru */
function CardFace({
  c,
  sel,
  onDoubleClick,
}: {
  c: K;
  sel?: boolean;
  onDoubleClick?: () => void;
}) {
  const red = isRed(c.suit);
  return (
    <Box
      onDoubleClick={onDoubleClick}
      sx={{
        width: CARD_W,
        height: CARD_H,
        borderRadius: 1.5,
        border: sel ? '2px solid' : '1px solid',
        borderColor: sel ? 'primary.main' : 'divider',
        bgcolor: 'background.paper',
        boxShadow: 1,
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* levý horní roh */}
      <Box
        sx={{
          position: 'absolute',
          top: 6,
          left: 6,
          fontSize: 12,
          lineHeight: 1.1,
          textAlign: 'left',
          color: red ? 'error.main' : 'text.primary',
          fontWeight: 700,
        }}
      >
        {c.rank}
        <br />
        {c.suit}
      </Box>

      {/* střední „pip“ */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          fontSize: 20,
          color: red ? 'error.main' : 'text.secondary',
        }}
      >
        {c.rank}
        {c.suit}
      </Box>

      {/* pravý dolní roh (otočený) */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 6,
          right: 6,
          transform: 'rotate(180deg)',
          fontSize: 12,
          lineHeight: 1.1,
          color: red ? 'error.main' : 'text.primary',
          fontWeight: 700,
        }}
      >
        {c.rank}
        <br />
        {c.suit}
      </Box>
    </Box>
  );
}

/** Karta – rub (balíček) */
function CardDown() {
  return (
    <Box
      sx={{
        width: CARD_W,
        height: CARD_H,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'grey.300',
        backgroundImage:
          'repeating-linear-gradient(45deg, rgba(255,255,255,.25) 0 8px, rgba(0,0,0,.04) 8px 16px)',
        boxShadow: 1,
      }}
    />
  );
}

/** Prázdné místo pro kartu/stack */
function EmptySlot({ label }: { label?: string }) {
  return (
    <Box
      sx={{
        width: CARD_W,
        height: CARD_H,
        borderRadius: 1.5,
        border: '1px dashed',
        borderColor: 'divider',
        display: 'grid',
        placeItems: 'center',
        color: 'text.disabled',
        fontSize: 12,
      }}
    >
      {label ?? ''}
    </Box>
  );
}

/** DND – Draggable obal pro kartu (tableau i waste-top) */
function DraggableCard({
  id,
  children,
  disabled,
  translateY = 0,
}: {
  id: string;
  children: React.ReactNode;
  disabled?: boolean;
  translateY?: number;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled,
  });

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : translateY
      ? `translateY(${translateY}px)`
      : undefined,
    cursor: disabled ? 'default' : 'grab',
    zIndex: isDragging ? 5 : undefined,
  };

  return (
    <Box ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </Box>
  );
}

/** DND – Droppable pro cíl (tableau column / foundation) */
function DroppableArea({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <Box
      ref={setNodeRef}
      sx={{
        outline: isOver ? '2px dashed' : 'none',
        outlineColor: 'primary.main',
        outlineOffset: 2,
        borderRadius: 1.5,
      }}
    >
      {children}
    </Box>
  );
}

export default function Solitaire() {
  const GAME_KEY = 'solitaire' as const; // ✔ správný klíč do ceníku/historie
  const { balance, priceTable, defaultPayout, startRound, finishRound } = useCasino();

  const [price, setPrice] = useState(() => priceTable?.solitaire?.entry ?? 6);
  const [payoutWin, setPayoutWin] = useState(() => priceTable?.solitaire?.win ?? 18);

  const [phase, setPhase] = useState<'idle' | 'playing' | 'auto' | 'won' | 'lost'>('idle');
  const [drawMode, setDrawMode] = useState<1 | 3>(1);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');

  const [state, setState] = useState<State>(() => deal(drawMode));
  const [selected, setSelected] = useState<
    { from: 'waste' } | { from: 'tableau'; col: number; index: number } | null
  >(null);
  const [steps, setSteps] = useState(0);
  const [msg, setMsg] = useState('Zvol obtížnost a klikni na Nová hra.');

  const undoRef = useRef<State[]>([]);
  const roundRef = useRef<string | null>(null);

  // DND sensors
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 8 } }),
  );

  // drag state (pro DragOverlay)
  const [dragPayload, setDragPayload] = useState<
    | null
    | { kind: 'waste' }
    | { kind: 'tableau'; col: number; index: number; stack: K[] }
  >(null);

  // efekty po výhře
  const [overlay, setOverlay] = useState<{ open: boolean; payout: number }>({
    open: false,
    payout: 0,
  });
  const [coinsFx, setCoinsFx] = useState(false);
  const [confettiFx, setConfettiFx] = useState(false);

  useEffect(() => {
    const pt = priceTable?.solitaire;
    if (pt?.entry != null) setPrice(pt.entry | 0);
    if (pt?.win != null) setPayoutWin(pt.win | 0);
  }, [priceTable]);

  // detekce výhry
  useEffect(() => {
    const won = SUITS.every((s) => state.found[s].length === 13);
    if ((phase === 'playing' || phase === 'auto') && won) {
      setPhase('won');
      setMsg('Vyhrál jsi! 🏆');
      const payout = defaultPayout(GAME_KEY as any, 'win') ?? payoutWin;
      finishRound(GAME_KEY as any, {
        roundId: roundRef.current!,
        result: 'win',
        payout,
        details: { drawMode, difficulty, steps },
      });
      roundRef.current = null;

      // META odměny
      applySolitaireRewards('win', { moves: steps });

      // efekty + overlay + mince do banku
      setOverlay({ open: true, payout });
      setCoinsFx(true);
      setConfettiFx(true);
      setTimeout(() => {
        setCoinsFx(false);
        setConfettiFx(false);
      }, 1200);
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
    if (!st?.ok) {
      setMsg('Nemáš dost mincí pro start.');
      return;
    }
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
        difficulty === 'easy'
          ? 'Rozdáno – hodně hratelný layout 👍'
          : difficulty === 'medium'
          ? 'Rozdáno – spíš přívětivé.'
          : difficulty === 'hard'
          ? 'Rozdáno – náročnější kolo.'
          : 'Rozdáno – extrémně utažené. Bez chyby!',
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
    finishRound(GAME_KEY as any, {
      roundId: roundRef.current!,
      result: 'loss',
      payout,
      details: { drawMode, difficulty },
    });
    roundRef.current = null;

    // META odměny (prohra)
    applySolitaireRewards('loss');
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
      if (!st.waste.length) {
        undoRef.current.pop();
        return;
      }
      st.stock = st.waste.slice().reverse().map((c) => ({ ...c, faceUp: false }));
      st.waste = [];
      setState(st);
      setSelected(null);
      setMsg('Recyklace balíčku.');
      return;
    }
    const n = Math.min(st.drawMode, st.stock.length);
    const take = st.stock.slice(-n).map((c) => ({ ...c, faceUp: true }));
    st.stock = st.stock.slice(0, st.stock.length - n);
    st.waste = st.waste.concat(take);
    setState(st);
    setSelected(null);
  };

  const tryAutoMoveToFoundation = (from: { kind: 'waste' } | { kind: 'tableau'; col: number }) => {
    if (phase !== 'playing') return false;
    const st = deep(state);

    if (from.kind === 'waste') {
      const card = st.waste[st.waste.length - 1];
      if (!card) return false;
      const pile = st.found[card.suit];
      if (!canOnFound(card, pile)) return false;
      pushUndo();
      st.waste.pop();
      pile.push(card);
      setState(autoFlip(st));
      setSelected(null);
      return true;
    }
    if (from.kind === 'tableau') {
      const col = st.tableau[from.col];
      if (!col?.length) return false;
      const top = col[col.length - 1];
      if (!top?.faceUp) return false;
      const pile = st.found[top.suit];
      if (!canOnFound(top, pile)) return false;
      pushUndo();
      col.pop();
      pile.push(top);
      setState(autoFlip(st));
      setSelected(null);
      return true;
    }
    return false;
  };

  const moveWasteToTableau = (toCol: number) => {
    const st = deep(state);
    const top = st.waste[st.waste.length - 1];
    if (!top) return;
    const target = st.tableau[toCol][st.tableau[toCol].length - 1] || null;
    if (!canOnTableau(top, target)) return;
    pushUndo();
    st.waste.pop();
    st.tableau[toCol] = [...st.tableau[toCol], top];
    setState(autoFlip(st));
    setSelected(null);
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
    setState(autoFlip(st));
    setSelected(null);
  };

  const moveToFoundation = (
    suit: K['suit'],
    payload: { src: 'waste' } | { src: 'tableau'; col: number; index: number },
  ) => {
    const st = deep(state);
    const pile = st.found[suit];
    if (payload.src === 'waste') {
      const card = st.waste[st.waste.length - 1];
      if (!card || !canOnFound(card, pile)) return;
      pushUndo();
      st.waste.pop();
      pile.push(card);
      setState(autoFlip(st));
      setSelected(null);
      return;
    }
    const topIndex = st.tableau[payload.col].length - 1;
    if (payload.index !== topIndex) return;
    const card = st.tableau[payload.col][topIndex];
    if (!canOnFound(card, pile)) return;
    pushUndo();
    st.tableau[payload.col] = st.tableau[payload.col].slice(0, topIndex);
    pile.push(card);
    setState(autoFlip(st));
    setSelected(null);
  };

  // === Klik logika + double-click auto-move
  const clickStock = () => drawFromStock();
  const clickWaste = () => {
    if (phase !== 'playing' || !state.waste.length) return;
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
    if (
      selected?.from === 'tableau' &&
      selected.col === colIdx &&
      selected.index === index &&
      index === state.tableau[colIdx].length - 1
    ) {
      if (!tryAutoMoveToFoundation({ kind: 'tableau', col: colIdx })) setSelected(null);
      return;
    }
    if (!selected) {
      setSelected({ from: 'tableau', col: colIdx, index });
      return;
    }

    const target = state.tableau[colIdx][state.tableau[colIdx].length - 1] || null;

    if (selected.from === 'waste') {
      const top = state.waste[state.waste.length - 1];
      if (!top) return;
      if (!canOnTableau(top, target)) {
        setMsg('Sem to nejde.');
        return;
      }
      moveWasteToTableau(colIdx);
      return;
    }
    if (selected.from === 'tableau') {
      const { col, index: srcIndex } = selected;
      const stack = state.tableau[col].slice(srcIndex);
      if (!isValidStack(stack) || !canOnTableau(stack[0], target)) {
        setMsg('Sem to nejde.');
        return;
      }
      if (!state.tableau[colIdx].length && stack[0].rank !== 'K') {
        setMsg('Prázdný sloupec – jen s králem.');
        return;
      }
      moveTableauToTableau(colIdx, col, srcIndex);
      return;
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
      setState(st);
      setSelected(null);
      return;
    }
    if (selected.from === 'tableau') {
      const { col, index } = selected;
      const stack = state.tableau[col].slice(index);
      if (!isValidStack(stack) || stack[0].rank !== 'K') return;
      moveTableauToTableau(colIdx, col, index);
      return;
    }
  };

  // === Auto-win tlačítko (upravené tickování, provádí reálné přesuny)
  const autoWin = () => {
    if (phase !== 'playing') return;
    const current = deep(state);
    const solved = trySolve(current);
    if (!solved.ok) {
      setMsg('Solver to teď nedá. Zkus pár tahů a znovu Auto-win.');
      return;
    }
    setMsg('Auto-win ✨');
    setPhase('auto');
    setSelected(null);

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
        setPhase('playing'); // useEffect detekuje výhru
        return;
      }
      for (let i = 0; i < 3 && path.length; i++) apply(path.shift());
      setState(deep(st));
      setTimeout(tick, 90);
    };
    tick();
  };

  // ======== DND handlers ========

  // ID schéma:
  // - Waste top draggable: 'waste-top'
  // - Tableau card draggable: `tab-${col}-${index}`
  // - Droppable columns: `col-${col}`
  // - Droppable foundations: `found-${suit}`
  const onDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    if (id === 'waste-top') {
      setDragPayload({ kind: 'waste' });
      return;
    }
    if (id.startsWith('tab-')) {
      const [, scol, sidx] = id.split('-');
      const col = parseInt(scol, 10);
      const index = parseInt(sidx, 10);
      const colArr = state.tableau[col];
      const stack = colArr.slice(index);
      // pouze validní stack je draggable (horní karta musí být faceUp)
      if (!stack.length || !stack[0].faceUp || !isValidStack(stack)) {
        setDragPayload(null);
        return;
      }
      setDragPayload({ kind: 'tableau', col, index, stack });
    }
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    const payload = dragPayload;
    setDragPayload(null);
    if (!over || !payload) return;

    const overId = String(over.id);

    // drop na foundation
    if (overId.startsWith('found-')) {
      const suit = overId.replace('found-', '') as K['suit'];
      if (payload.kind === 'waste') {
        moveToFoundation(suit, { src: 'waste' });
        return;
        }
      if (payload.kind === 'tableau') {
        // pouze top karta může jít na foundation
        const topIndex = state.tableau[payload.col].length - 1;
        if (payload.index === topIndex) {
          moveToFoundation(suit, { src: 'tableau', col: payload.col, index: payload.index });
        }
        return;
      }
    }

    // drop na tableau column
    if (overId.startsWith('col-')) {
      const toCol = parseInt(overId.replace('col-', ''), 10);
      if (payload.kind === 'waste') {
        moveWasteToTableau(toCol);
        return;
      }
      if (payload.kind === 'tableau') {
        if (payload.col === toCol) return; // nic se nemění
        moveTableauToTableau(toCol, payload.col, payload.index);
        return;
      }
    }
  };

  const canStart = phase !== 'playing' && phase !== 'auto' && balance >= (price | 0);

  // ===== Render =====
  return (
    <MUICard variant="outlined" sx={{ overflow: 'visible' }}>
      <CardContent>
        <Stack spacing={2}>
          {/* Top bar */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            gap={1}
          >
            <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
              <Chip label={`💰 ${balance}`} />
              <Chip variant="outlined" label={`Vstup: -${price} • Výhra: +${payoutWin}`} />
              <Chip variant="outlined" label={`Kroky: ${steps}`} />
              <Chip variant="outlined" label={`Draw: ${drawMode} • Režim: ${difficulty}`} />
            </Stack>
          </Stack>

          <Stack direction="row" gap={1} flexWrap="wrap">
            <select
              className="mg-select"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              disabled={phase === 'playing' || phase === 'auto'}
            >
              <option value="easy">Lehká</option>
              <option value="medium">Střední</option>
              <option value="hard">Těžká</option>
              <option value="extreme">Extrémní</option>
            </select>
            <Button variant="contained" disabled={!canStart} onClick={startGame}>
              Nová hra
            </Button>
            <Button
              variant="outlined"
              disabled={undoRef.current.length === 0 || phase === 'idle'}
              onClick={undo}
            >
              Undo
            </Button>
            <Button
              variant="outlined"
              disabled={phase === 'playing' || phase === 'auto'}
              onClick={() => setDrawMode((d) => (d === 1 ? 3 : 1))}
            >
              Přepnout {drawMode === 1 ? 'na 3-card' : 'na 1-card'}
            </Button>
            <Button variant="outlined" disabled={phase !== 'playing'} onClick={autoWin}>
              Auto-win
            </Button>
            <Button
              variant="outlined"
              disabled={phase !== 'playing' && phase !== 'auto'}
              onClick={giveUp}
            >
              Vzdát
            </Button>
          </Stack>

          <Divider />

          {/* BOARD + DND */}
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <Box sx={{ width: '100%', overflowX: 'auto' }}>
              {/* Horní řada: Stock / Waste / Foundations */}
              <Stack
                direction="row"
                alignItems="flex-start"
                justifyContent="space-between"
                sx={{ minWidth: 7 * (CARD_W + 16) }}
              >
                {/* Stock + Waste */}
                <Stack direction="row" gap={2} alignItems="center">
                  <Tooltip title="Stock (klik = dobírat / recyklovat)">
                    <Box onClick={clickStock} sx={{ cursor: 'pointer' }}>
                      {state.stock.length ? <CardDown /> : <EmptySlot label="Prázdné" />}
                    </Box>
                  </Tooltip>

                  {/* Waste fan (max 3 karty viditelné) */}
                  <Box sx={{ position: 'relative', width: CARD_W + 20, height: CARD_H }}>
                    {state.waste.slice(-3).map((c, i, arr) => {
                      const isTop = i === arr.length - 1;
                      // jen top je draggable
                      const isTopDraggable = isTop;
                      const id = isTopDraggable ? 'waste-top' : `waste-${i}`;
                      return (
                        <Box
                          key={c.id}
                          sx={{ position: 'absolute', left: i * 10, top: 0 }}
                          onClick={isTop ? clickWaste : undefined}
                        >
                          {isTopDraggable ? (
                            <DraggableCard id={id}>
                              <CardFace c={c} />
                            </DraggableCard>
                          ) : (
                            <CardFace c={c} />
                          )}
                        </Box>
                      );
                    })}
                    {state.waste.length === 0 && (
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          display: 'grid',
                          placeItems: 'center',
                          color: 'text.disabled',
                          fontSize: 12,
                        }}
                      >
                        Waste
                      </Box>
                    )}
                  </Box>
                </Stack>

                {/* Foundations 4× */}
                <Stack direction="row" gap={2}>
                  {SUITS.map((s) => {
                    const pile = state.found[s];
                    const top = pile[pile.length - 1] || null;
                    const dropId = `found-${s}`;
                    return (
                      <DroppableArea key={s} id={dropId}>
                        <Box
                          sx={{ cursor: 'pointer' }}
                          onClick={() => {
                            if (!selected) return;
                            if (selected.from === 'waste') return moveToFoundation(s, { src: 'waste' });
                            if (selected.from === 'tableau')
                              return moveToFoundation(s, {
                                src: 'tableau',
                                col: selected.col,
                                index: selected.index,
                              });
                          }}
                        >
                          {top ? <CardFace c={top} /> : <EmptySlot label={s} />}
                        </Box>
                      </DroppableArea>
                    );
                  })}
                </Stack>
              </Stack>

              {/* Tableau – 7 sloupců */}
              <Box
                sx={{
                  mt: 3,
                  display: 'grid',
                  gridTemplateColumns: `repeat(7, ${CARD_W}px)`,
                  gap: 2,
                  minWidth: 7 * (CARD_W + 16),
                  pb: 2,
                }}
              >
                {state.tableau.map((col, ci) => {
                  const height =
                    col.reduce((h, c) => h + (c.faceUp ? FAN_UP : FAN_DOWN), 0) + CARD_H + 8;
                  const dropId = `col-${ci}`;
                  return (
                    <DroppableArea key={ci} id={dropId}>
                      <Box
                        sx={{
                          position: 'relative',
                          width: CARD_W,
                          minHeight: Math.max(height, CARD_H + 40),
                          borderRadius: 1,
                          background:
                            'repeating-linear-gradient(0deg, rgba(0,0,0,0.02) 0 12px, rgba(0,0,0,0.04) 12px 24px)',
                        }}
                        onClick={() => {
                          if (!col.length) clickEmptyCol(ci);
                        }}
                      >
                        {/* placeholder text */}
                        {col.length === 0 && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 8,
                              left: 0,
                              right: 0,
                              display: 'grid',
                              placeItems: 'center',
                              color: 'text.disabled',
                              pointerEvents: 'none',
                              fontSize: 12,
                            }}
                          >
                            Prázdné
                          </Box>
                        )}

                        {col.map((c, idx) => {
                          const y = col
                            .slice(0, idx)
                            .reduce((p, cc) => p + (cc.faceUp ? FAN_UP : FAN_DOWN), 0);
                          const isTop = idx === col.length - 1;
                          const stack = col.slice(idx);
                          const stackDraggable =
                            c.faceUp && isValidStack(stack); // jen validní faceUp stack
                          const dragId = `tab-${ci}-${idx}`;

                          return (
                            <Box
                              key={c.id}
                              onClick={() => {
                                // klik logika paralelně s DnD
                                // (výběr + případný auto-move)
                                const card = state.tableau[ci][idx];
                                if (!card.faceUp) {
                                  if (idx === state.tableau[ci].length - 1) {
                                    const st = deep(state);
                                    st.tableau[ci][idx] = { ...card, faceUp: true };
                                    setState(st);
                                  }
                                  return;
                                }
                                if (selected?.from === 'tableau' && selected.col === ci && selected.index === idx && isTop) {
                                  if (!tryAutoMoveToFoundation({ kind: 'tableau', col: ci })) setSelected(null);
                                  return;
                                }
                                setSelected({ from: 'tableau', col: ci, index: idx });
                              }}
                              sx={{
                                position: 'absolute',
                                top: 8 + y,
                                left: 0,
                                cursor: stackDraggable ? 'grab' : 'pointer',
                              }}
                            >
                              {c.faceUp ? (
                                stackDraggable ? (
                                  <DraggableCard id={dragId}>
                                    <CardFace c={c} sel={selected?.from === 'tableau' && selected.col === ci && selected.index === idx} />
                                  </DraggableCard>
                                ) : (
                                  <CardFace c={c} sel={selected?.from === 'tableau' && selected.col === ci && selected.index === idx} />
                                )
                              ) : (
                                <CardDown />
                              )}
                            </Box>
                          );
                        })}
                      </Box>
                    </DroppableArea>
                  );
                })}
              </Box>
            </Box>

            {/* Drag overlay – zobrazení přetahovaného stacku/karty */}
            <DragOverlay dropAnimation={null}>
              {dragPayload ? (
                dragPayload.kind === 'waste' ? (
                  state.waste.length ? <CardFace c={state.waste[state.waste.length - 1]} /> : null
                ) : (
                  <Box sx={{ position: 'relative' }}>
                    {dragPayload.stack.map((c, i) => (
                      <Box key={c.id} sx={{ position: 'absolute', top: i * FAN_UP, left: 0 }}>
                        <CardFace c={c} />
                      </Box>
                    ))}
                    <Box sx={{ width: CARD_W, height: CARD_H + (dragPayload.stack.length - 1) * FAN_UP }} />
                  </Box>
                )
              ) : null}
            </DragOverlay>

          </DndContext>

          {/* status */}
          {msg && (
            <Box sx={{ mt: 1 }}>
              <Chip
                size="small"
                color={phase === 'won' ? 'success' : phase === 'lost' ? 'error' : 'default'}
                label={msg}
              />
            </Box>
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1500,
            }}
            onClick={() => setOverlay({ ...overlay, open: false })}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.96, y: 8, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 8, opacity: 0 }}
              style={{
                background: 'white',
                borderRadius: 16,
                padding: 24,
                minWidth: 280,
                boxShadow: '0 28px 60px rgba(0,0,0,.35)',
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 1 }}
              >
                <Typography variant="h6" fontWeight={900}>
                  Výhra!
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setOverlay({ ...overlay, open: false })}
                >
                  <CloseIcon />
                </IconButton>
              </Stack>
              <Typography variant="h5" fontWeight={900} color="success.main" align="center">
                +{overlay.payout}
              </Typography>
              <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                Mince připsány na účet. 💰
              </Typography>
              <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => setOverlay({ ...overlay, open: false })}
                >
                  Pokračovat
                </Button>
              </Stack>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MUICard>
  );
}
