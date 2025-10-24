import { Box, Typography } from '@mui/material';
export function NotFoundPage() {
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h5" fontWeight={800}>404 – Nenalezeno</Typography>
      <Typography>Ups, tahle obrazovka neexistuje.</Typography>
    </Box>
  );
}
