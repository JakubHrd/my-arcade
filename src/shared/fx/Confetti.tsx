import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type ConfettiProps = { show: boolean; count?: number; onDone?: () => void };

export function Confetti({ show, count = 60, onDone }: ConfettiProps) {
  const [items, setItems] = useState<number[]>([]);
  useEffect(() => {
    if (show) {
      setItems(Array.from({ length: count }, (_, i) => i));
      const t = setTimeout(() => onDone?.(), 1200);
      return () => clearTimeout(t);
    } else {
      setItems([]);
    }
  }, [show, count, onDone]);

  return (
    <AnimatePresence>
      {show && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1300 }}>
          {items.map((i) => {
            const x = Math.random() * 100;
            const r = (Math.random() * 720 - 360) | 0;
            const d = 0.8 + Math.random() * 0.6;
            const s = 6 + Math.random() * 10;
            const hue = (Math.random() * 360) | 0;
            return (
              <motion.span
                key={i}
                initial={{ x: `${x}vw`, y: '-5vh', rotate: 0, opacity: 0 }}
                animate={{ y: '110vh', rotate: r, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: d, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  left: 0,
                  width: s,
                  height: s * 0.6,
                  background: `hsl(${hue} 90% 55%)`,
                  borderRadius: 2,
                }}
              />
            );
          })}
        </div>
      )}
    </AnimatePresence>
  );
}

export default Confetti;