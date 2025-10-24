import { createTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    brand: {
      main: string;
      contrastText: string;
    };
  }
  interface PaletteOptions {
    brand?: {
      main: string;
      contrastText: string;
    };
  }
}

export const buildTheme = (mode: 'light' | 'dark') =>
  createTheme({
    palette: {
      mode,
      primary: { main: mode === 'light' ? '#6a5acd' : '#8e7dff' },
      secondary: { main: '#00c2a8' },
      background: {
        default: mode === 'light' ? '#f7f7fb' : '#0f1115',
        paper: mode === 'light' ? '#ffffff' : '#141821',
      },
      brand: { main: '#ff6b3d', contrastText: '#ffffff' },
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily: `'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif`,
      h1: { fontWeight: 800, letterSpacing: -0.5 },
      button: { textTransform: 'none', fontWeight: 700 },
    },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 12 },
        },
      },
      MuiPaper: { styleOverrides: { root: { borderRadius: 16 } } },
    },
  });
