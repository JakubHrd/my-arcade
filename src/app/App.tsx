import { CssBaseline, ThemeProvider } from '@mui/material';
import { RouterProvider } from 'react-router-dom';
import { useUIStore } from '@shared/store/uiStore';
import { buildTheme } from './theme/theme';
import { router } from './routes';

export default function App() {
  const mode = useUIStore((s) => s.themeMode);
  const theme = buildTheme(mode);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}
