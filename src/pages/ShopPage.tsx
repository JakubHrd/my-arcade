import { Stack, Typography, Divider, Card, CardContent, Button } from '@mui/material';
import Grid from '@mui/material/Grid';
import { usePlayerStore,selectCoins } from '@shared/store/playerStore';
import { playerApi } from '@games/core/player.api';
import { SHOP_ITEMS } from '@shared/constants/shop';

export function ShopPage() {
  const coins = usePlayerStore(selectCoins);

  const handleBuy = (id: string, price: number) => {
    if (playerApi.hasCosmetic(id as any)) return;
    if (!playerApi.spendCoins(price)) {
      alert('Nedostatek mincí!');
      return;
    }
    playerApi.grantCosmetic(id as any);
    alert('Zakoupeno!');
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h4" fontWeight={800}>Shop</Typography>
      <Typography variant="body2" color="text.secondary">
        Máš {coins} mincí.
      </Typography>
      <Divider />

      <Grid container spacing={2}>
        {SHOP_ITEMS.map((item) => (
          <Grid key={item.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6">{item.name}</Typography>
                <Typography variant="body2" color="text.secondary">{item.desc}</Typography>
                <Typography variant="body2" sx={{ my: 1 }}>
                  Cena: {item.price} 💰
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => handleBuy(item.id, item.price)}
                  disabled={playerApi.hasCosmetic(item.id as any)}
                >
                  {playerApi.hasCosmetic(item.id as any) ? 'Zakoupeno' : 'Koupit'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
