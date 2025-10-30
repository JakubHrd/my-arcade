import { createBrowserRouter } from 'react-router-dom';
import PrimaryLayout from '@app/layout/PrimaryLayout';
import { HomePage } from '@pages/HomePage';
import { GamesPage } from '@pages/GamesPage';
import RPSGame from '@games/rps/RPS.ui';
import { Solitaire } from '@games/solitaire';
import ReactionTap from '@games/reaction/Reaction.ui';  
import RequireLevel from '@app/guards/RequireLevel';
import { GAMES } from '@games/registry';
import { ProfilePage } from '@pages/ProfilePage';
import { ShopPage } from '@pages/ShopPage';
import HiloGame from '@games/hilo/Hilo.ui';
import { Memory } from '@games/memory';



const META = {
  rps: GAMES.find(g => g.id === 'rps')!,
  sol: GAMES.find(g => g.id === 'solitaire')!,
  rea: GAMES.find(g => g.id === 'reaction')!,
  hilo: GAMES.find(g => g.id === 'hilo')!,
  memory: GAMES.find(g => g.id === 'memory')!,
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PrimaryLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'games', element: <GamesPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'shop', element: <ShopPage /> },
      {
        path: META.rps.path.replace('/games/', 'games/'),
        element: (
          <RequireLevel min={META.rps.minLevel}>
            <RPSGame />
          </RequireLevel>
        ),
      },
      {
        path: META.sol.path.replace('/games/', 'games/'),
        element: (
          <RequireLevel min={META.sol.minLevel}>
            <Solitaire />
          </RequireLevel>
        ),
      },
      {
        path: META.rea.path.replace('/games/', 'games/'),
        element: (
          <RequireLevel min={META.rea.minLevel}>
            <ReactionTap />
          </RequireLevel>
        ),
      },
      {
        path: META.hilo.path.replace('/games/', 'games/'),
        element: (
          <RequireLevel min={META.hilo.minLevel}>
            <HiloGame />
          </RequireLevel>
        ),
      },
      {
        path: META.memory.path.replace('/games/', 'games/'),
        element: (
          <RequireLevel min={META.memory.minLevel}>
            <Memory />
          </RequireLevel>
        ),
      },
    ],
  },
]);
