import { createBrowserRouter } from 'react-router-dom';
import PrimaryLayout from '@app/layout/PrimaryLayout';
import { HomePage } from '@pages/HomePage';
import { GamesPage } from '@pages/GamesPage';
import RPSGame from '@games/rps/RPS.ui';
import { Solitaire } from '@games/solitaire';


export const router = createBrowserRouter([
  {
    path: '/',
    element: <PrimaryLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'games', element: <GamesPage /> },
      { path: 'games/rps', element: <RPSGame /> },
      { path: 'games/solitaire', element: <Solitaire /> },
    ],
  },
]);
