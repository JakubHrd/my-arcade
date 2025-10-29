import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Chip, Typography,
} from '@mui/material';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

type Props = { open: boolean; onClose: () => void };

export default function CurrencyHelpDialog({ open, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Nápověda: měny & XP</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.25}>
          <Stack direction="row" alignItems="center" gap={1}>
            <Chip icon={<MonetizationOnIcon />} color="success" variant="outlined" label="Kasino mince" size="small" />
            <Typography variant="body2">Používáš na vstupy/výhry miniher. Spravuje <b>Casino</b>.</Typography>
          </Stack>
          <Stack direction="row" alignItems="center" gap={1}>
            <Chip icon={<MonetizationOnIcon />} color="warning" variant="outlined" label="Meta mince" size="small" />
            <Typography variant="body2">Používáš v <b>Shopu</b>, odznaky a kosmetika. Uloženo v <b>profilu hráče</b>.</Typography>
          </Stack>
          <Stack direction="row" alignItems="center" gap={1}>
            <Chip icon={<EmojiEventsIcon />} color="primary" label="XP / Level" size="small" />
            <Typography variant="body2">XP získáváš hraním. Level odemyká nové hry. Denní bonus přidá kasino mince.</Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Tip: Denní bonus najdeš v HUDu (tlačítko „Denní bonus“).
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">OK</Button>
      </DialogActions>
    </Dialog>
  );
}
