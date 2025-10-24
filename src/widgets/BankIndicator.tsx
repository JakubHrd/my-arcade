import { Chip, Box } from '@mui/material';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import { useCasino } from '@games/core/useCasino';
import { useEffect, useState } from 'react';
import { animate, useAnimate, motion } from 'framer-motion';

/**
 * BankIndicator:
 *  - živé číslo se přepočítává (roll-up)
 *  - reaguje na CustomEvent('bank-ping', {detail:{gain}}): ripple + krátké zobrazení +X
 */
export function BankIndicator() {
  const { balance } = useCasino();
  const [scope, anim] = useAnimate();
  const [gain, setGain] = useState<number | null>(null);

  // roll-up čísla + jemný pulz při každé změně
  useEffect(() => {
    const el = document.getElementById('bank-number');
    if (!el) return;
    const from = Number(el.textContent || 0);
    const c = animate(from, balance, {
      duration: 0.5,
      ease: 'easeOut',
      onUpdate: (v) => (el.textContent = String(Math.round(v))),
    });
    anim(scope.current, { scale: [1, 1.06, 1] }, { duration: 0.28 });
    return () => c.stop();
  }, [balance, anim, scope]);

  // posluchač pingů (dolet mincí)
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ gain?: number }>;
      const g = ce.detail?.gain ?? 0;
      setGain(g > 0 ? g : null); // záporné nezobrazujeme (mince nelítají při prohře)
      // ripple/pulz
      anim('#bank-anchor', { boxShadow: ['0 0 0 0 rgba(0,0,0,0)', '0 0 0 10px rgba(230,184,0,.25)', '0 0 0 0 rgba(0,0,0,0)'] }, { duration: 0.7 });
      anim(scope.current, { scale: [1, 1.12, 1] }, { duration: 0.35 });
      // schovej bublinu po chvilce
      setTimeout(() => setGain(null), 900);
    };
    window.addEventListener('bank-ping', handler as EventListener);
    return () => window.removeEventListener('bank-ping', handler as EventListener);
  }, [anim]);

  return (
    <Box ref={scope} sx={{ position: 'relative' }}>
      <Chip
        id="bank-anchor"
        icon={<MonetizationOnIcon />}
        label={<span id="bank-number">{balance}</span>}
        sx={{ bgcolor: 'background.paper' }}
      />

      {/* +X bublina poblíž chipu */}
      {gain != null && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: -8 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          style={{
            position: 'absolute',
            right: -14,
            top: -8,
            fontWeight: 900,
            color: '#2e7d32',
            textShadow: '0 1px 0 #fff',
          }}
        >
          +{gain}
        </motion.div>
      )}
    </Box>
  );
}
