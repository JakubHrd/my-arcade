import Grid from '@mui/material/Grid';
import { Card, CardContent, Typography, Button, Chip, Stack, Box, Tooltip, Alert } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import { useNavigate, useLocation } from 'react-router-dom';
import { GAMES, isUnlocked } from '@games/registry';
import { usePlayerStore } from '@shared/store/playerStore';

export function GamesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const level = usePlayerStore((s) => s.profile.progression.level);

  const lockedRedirect = location.state?.locked as boolean | undefined;
  const needLevel = location.state?.needLevel as number | undefined;
  const from = location.state?.from as string | undefined;

  return (
    <Stack spacing={2}>
      <Typography variant="h4" fontWeight={800}>Hry</Typography>

      {lockedRedirect && typeof needLevel === 'number' && (
        <Alert
          severity="info"
          onClose={() => window.history.replaceState({}, document.title)}
        >
          Přístup do <strong>{from}</strong> je uzamčen. Odemkne se na <strong>Level {needLevel}+</strong>.
        </Alert>
      )}

      <Grid container spacing={2}>
        {GAMES.map((g) => {
          const unlocked = isUnlocked(level, g);
          return (
            <Grid key={g.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Stack spacing={1}>
                    <Stack direction="row" alignItems="center" gap={1}>
                      <SportsEsportsIcon fontSize="small" />
                      <Typography variant="h6" fontWeight={700}>{g.title}</Typography>
                    </Stack>

                    <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                      <Chip label={`L${g.minLevel}+`} size="small" variant="outlined" />
                      {g.tag && <Chip label={g.tag} size="small" />}
                      {g.phase && <Chip label={`Fáze ${g.phase}`} size="small" variant="outlined" />}
                    </Stack>

                    <Box sx={{ mt: 1 }}>
                      {g.disabled ? (
                        <Chip icon={<LockIcon />} label="Brzy" size="small" />
                      ) : unlocked ? (
                        <Button
                          variant="contained"
                          onClick={() => navigate(g.path)}
                        >
                          Hrát
                        </Button>
                      ) : (
                        <Tooltip title={`Odemkne se na Lv ${g.minLevel}+`}>
                          <span>
                            <Button
                              variant="outlined"
                              startIcon={<LockIcon />}
                              disabled
                            >
                              Uzamčeno
                            </Button>
                          </span>
                        </Tooltip>
                      )}
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Stack>
  );
}
