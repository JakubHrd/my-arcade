import { createBrowserRouter } from 'react-router-dom';
import PrimaryLayout from '@app/layout/PrimaryLayout';
import { HomePage } from '@pages/HomePage';
import { GamesPage } from '@pages/GamesPage';
import RPSGame from '@games/rps/RPS.ui';
import { Solitaire } from '@games/solitaire';
import RequireLevel from '@app/guards/RequireLevel';
import { GAMES } from '@games/registry';

const META = {
  rps: GAMES.find(g => g.id === 'rps')!,
  sol: GAMES.find(g => g.id === 'solitaire')!,
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PrimaryLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'games', element: <GamesPage /> },

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
    ],
  },
]);
