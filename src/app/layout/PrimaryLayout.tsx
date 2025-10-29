import { useState } from 'react';
import { Outlet, Link as RouterLink } from 'react-router-dom';
import {
  AppBar, Toolbar, IconButton, Typography, Drawer, List, ListItemButton, ListItemText,
  Box, Container, CssBaseline, Divider, Switch, Tooltip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import BugReportIcon from '@mui/icons-material/BugReport';
import { BankIndicator } from '@widgets/BankIndicator';
import CoinCounter from '@widgets/CoinCounter';
import LevelChip from '@widgets/LevelChip';
import AvatarBadge from '@widgets/AvatarBadge';
import CurrencyHelpDialog from '@app/components/CurrencyHelpDialog';
import TelemetryPanel from '@app/dev/TelemetryPanel';
import { useUIStore } from '@shared/store/uiStore';

export default function PrimaryLayout() {
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [telemetryOpen, setTelemetryOpen] = useState(false);

  const { themeMode, toggleTheme } = useUIStore();

  const telemetryEnabled =
    import.meta.env.VITE_TELEMETRY === '1' || import.meta.env.DEV === true;

  return (
    <>
      <CssBaseline />
      <AppBar position="sticky" color="default" elevation={1}>
        <Toolbar>
          <IconButton edge="start" onClick={() => setOpen(true)} color="inherit">
            <MenuIcon />
          </IconButton>
          <SportsEsportsIcon sx={{ ml: 1, mr: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 800, flexGrow: 1 }}>
            {import.meta.env.VITE_APP_NAME || 'My Arcade'}
          </Typography>

          {/* ---- Pravý HUD v AppBaru ---- */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.0 }}>
            <LevelChip />
            <CoinCounter />
            <BankIndicator />
            <AvatarBadge />

            <Tooltip title="Nápověda k měnám a XP">
              <IconButton color="inherit" onClick={() => setHelp(true)} size="small">
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>

            {telemetryEnabled && (
              <Tooltip title="Telemetry (lokální události)">
                <IconButton color="inherit" onClick={() => setTelemetryOpen(true)} size="small">
                  <BugReportIcon />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title={`Přepnout téma (${themeMode === 'dark' ? 'tmavé' : 'světlé'})`}>
              <Switch
                checked={themeMode === 'dark'}
                onChange={toggleTheme}
                inputProps={{ 'aria-label': 'theme switch' }}
              />
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 260 }}>
          <Typography variant="h6" sx={{ p: 2, fontWeight: 800 }}>Menu</Typography>
          <Divider />
          <List>
            <ListItemButton component={RouterLink} to="/" onClick={() => setOpen(false)}>
              <ListItemText primary="Domů" />
            </ListItemButton>
            <ListItemButton component={RouterLink} to="/games" onClick={() => setOpen(false)}>
              <ListItemText primary="Hry" />
            </ListItemButton>
            <ListItemButton component={RouterLink} to="/games/rps" onClick={() => setOpen(false)}>
              <ListItemText primary="Kámen–Nůžky–Papír" />
            </ListItemButton>
            <ListItemButton component={RouterLink} to="/games/solitaire" onClick={() => setOpen(false)}>
              <ListItemText primary="Solitér" />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Outlet />
      </Container>

      <CurrencyHelpDialog open={help} onClose={() => setHelp(false)} />
      {telemetryEnabled && (
        <TelemetryPanel open={telemetryOpen} onClose={() => setTelemetryOpen(false)} />
      )}
    </>
  );
}
