import Grid from '@mui/material/Grid';
import { Card, CardContent, Typography, Button, Chip, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export function GamesPage() {
    const navigate = useNavigate();

  const games = [
    { id: 'solitaire', title: 'Solitaire', tag: 'karetní', disabled: false, path: '/games/solitaire' },
    { id: 'rps', title: 'Kámen–Nůžky–Papír', tag: 'mini', disabled: false, path: '/games/rps' },
    { id: '2048', title: '2048', tag: 'logická', disabled: true, path: '/games/2048' },
  ];
  return (
    <Stack spacing={2}>
      <Typography variant="h4" fontWeight={800}>Hry</Typography>
      <Grid container spacing={2}>
        {games.map((g) => (
          <Grid key={g.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack spacing={1}>
                  <Typography variant="h6" fontWeight={700}>{g.title}</Typography>
                  <Chip label={g.tag} size="small" />
                  <Button variant="contained" disabled={g.disabled} onClick={() => navigate(g.path)}>
                    Hrát
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
