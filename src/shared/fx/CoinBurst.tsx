import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';

export function CoinBurst({ show, onDone }: { show: boolean; onDone?: () => void }) {
  const [items, setItems] = useState<number[]>([]);
  useEffect(() => {
    if (show) {
      setItems(Array.from({ length: 14 }, (_, i) => i));
      const t = setTimeout(() => onDone?.(), 900);
      return () => clearTimeout(t);
    } else setItems([]);
  }, [show, onDone]);

  return (
    <AnimatePresence>
      {show && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1300 }}>
          {items.map((i) => {
            const dx = (Math.random() * 2 - 1) * 260;
            const dy = -120 - Math.random() * 180;
            const rot = (Math.random() * 360 - 180) | 0;
            const delay = Math.random() * 0.12;
            return (
              <motion.span
                key={i}
                initial={{ x: '50vw', y: '60vh', scale: 0.6, opacity: 0 }}
                animate={{ x: `calc(50vw + ${dx}px)`, y: `calc(60vh + ${dy}px)`, rotate: rot, scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut', delay }}
                style={{ position: 'absolute' }}
              >
                <PaidRoundedIcon sx={{ color: '#E6B800', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.25))' }} />
              </motion.span>
            );
          })}
        </div>
      )}
    </AnimatePresence>
  );
}

export default CoinBurst;
