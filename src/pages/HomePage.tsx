import { Card, CardContent, Typography, Button, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { CasinoHUD } from '@widgets/CasinoHUD';


export function HomePage() {
  const navigate = useNavigate();
  return (
    <Stack spacing={2}>
      <Typography variant="h4" fontWeight={800}>Vítej v herně</Typography>
      <Card>
        <CardContent>
          <Typography sx={{ mb: 2 }}>
            Začni hned – mrkni na dostupné mini hry nebo si připrav profil.
          </Typography>
          <CasinoHUD />
          <Button variant="contained" color="primary" onClick={() => navigate('/games')}>
            Zobrazit hry
          </Button>
        </CardContent>
      </Card>
    </Stack>
  );
}
