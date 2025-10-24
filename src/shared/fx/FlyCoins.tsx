import { createPortal } from 'react-dom';
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';

type Props = {
  show: boolean;
  toSelector: string;          // např. "#bank-anchor"
  count?: number;
  from?: { x?: number; y?: number }; // start v px; default ~střed okna
  gain?: number;               // kolik se připsalo (pro bank-ping)
  onDone?: () => void;
};

function targetCenter(sel: string) {
  const el = document.querySelector(sel) as HTMLElement | null;
  if (!el) return { x: window.innerWidth - 40, y: 20 };
  const r = el.getBoundingClientRect(); // viewport coords (pro position:fixed)
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export function FlyCoins({ show, toSelector, count = 12, from, gain, onDone }: Props) {
  const [items, setItems] = useState<number[]>([]);
  const start = useMemo(
    () => ({ x: from?.x ?? window.innerWidth * 0.5, y: from?.y ?? window.innerHeight * 0.6 }),
    [from]
  );
  const dest = useMemo(() => targetCenter(toSelector), [toSelector]);

  useEffect(() => {
    if (!show) { setItems([]); return; }
    setItems(Array.from({ length: count }, (_, i) => i));

    // po doletu pingneme banku
    const t = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('bank-ping', { detail: { gain: gain ?? 0 } }));
      onDone?.();
    }, 950);
    return () => clearTimeout(t);
  }, [show, count, gain, onDone]);

  return createPortal(
    <AnimatePresence>
      {show && items.map((i) => {
        // náhodný „mezi-bod“: trochu doprava/doleva a HLAVNĚ NAHORU
        const midX = start.x + (Math.random() * 2 - 1) * 180;
        const midY = Math.min(start.y - (120 + Math.random() * 180), dest.y + 20); // posuň výrazně nahoru

        const delay = Math.random() * 0.10;
        const rot = (Math.random() * 360 - 180) | 0;

        return (
          <motion.div
            key={i}
            initial={{ x: start.x, y: start.y, scale: 0.7, opacity: 0, rotate: 0 }}
            animate={{
              x: [start.x, midX, dest.x],
              y: [start.y, midY, dest.y],
              scale: [0.7, 0.9, 0.85],
              opacity: [0, 1, 1],
              rotate: [0, rot, rot * 0.3],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.9,
              ease: 'easeInOut',
              times: [0, 0.45, 1],
              delay,
            }}
            style={{ position: 'fixed', zIndex: 1600, pointerEvents: 'none', willChange: 'transform' }}
          >
            <PaidRoundedIcon sx={{ color: '#E6B800', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.25))' }} />
          </motion.div>
        );
      })}
    </AnimatePresence>,
    document.body
  );
}
