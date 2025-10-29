import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Chip, Typography, IconButton,
  Box,
} from '@mui/material';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { useEffect, useState } from 'react';
import { telemetry, TelemetryEvent } from '@shared/fx/telemetry';

type Props = { open: boolean; onClose: () => void };

export default function TelemetryPanel({ open, onClose }: Props) {
  const [items, setItems] = useState<TelemetryEvent[]>(telemetry.getAll());

  useEffect(() => {
    const unsub = telemetry.subscribe((list) => setItems(list));
    return () => { unsub(); }; // 👈 wrap na void
  }, []);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Telemetry (lokální)
        <IconButton onClick={() => telemetry.clear()} sx={{ ml: 1 }} title="Vyčistit">
          <DeleteSweepIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.25}>
          {items.length === 0 && (
            <Typography variant="body2" color="text.secondary">Žádné události.</Typography>
          )}
          {items.map((e) => (
            <Box key={e.id} sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
              <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                <Chip
                  size="small"
                  color={e.kind === 'casino' ? 'success' : 'primary'}
                  label={e.kind}
                />
                <Chip size="small" variant="outlined" label={e.type} />
                <Typography variant="caption" color="text.secondary">
                  {new Date(e.ts).toLocaleTimeString()}
                </Typography>
              </Stack>
              {e.payload != null && (
                <Box component="pre" sx={{ m: 0.5, p: 1, bgcolor: 'action.hover', borderRadius: 1, fontSize: 12, overflowX: 'auto' }}>
                  {JSON.stringify(e.payload, null, 2)}
                </Box>
              )}
            </Box>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">Zavřít</Button>
      </DialogActions>
    </Dialog>
  );
}
