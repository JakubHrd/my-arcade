import { PropsWithChildren, useState } from 'react';
import { Outlet, Link as RouterLink } from 'react-router-dom';
import {
  AppBar, Toolbar, IconButton, Typography, Drawer, List, ListItemButton, ListItemText, Box, Container, CssBaseline, Divider, Link, Switch,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import { BankIndicator } from '@widgets/BankIndicator';

export default function PrimaryLayout() {
  const [open, setOpen] = useState(false);

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
            My Arcade
          </Typography>

          {/* 💰 Banka vpravo v AppBaru */}
          <Box sx={{ mr: 1 }}>
            <BankIndicator />
          </Box>

          {/* (příklad) přepínač tématu – připoj si ke svému theme store */}
          <Switch disabled />
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
          </List>
        </Box>
      </Drawer>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Outlet />
      </Container>
    </>
  );
}
