import { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePlayerStore } from '@shared/store/playerStore';

type Props = PropsWithChildren<{ min: number }>;

export default function RequireLevel({ min, children }: Props) {
  const level = usePlayerStore((s) => s.profile.progression.level);
  const loc = useLocation();

  if (level < min) {
    // pošli uživatele zpět na katalog a vysvětli důvod
    return (
      <Navigate
        to="/games"
        replace
        state={{ locked: true, needLevel: min, from: loc.pathname }}
      />
    );
  }
  return <>{children}</>;
}
