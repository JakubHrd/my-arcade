import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Stack, Typography, Avatar,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { useState } from 'react';
import { playerApi } from '@games/core/player.api';
import { usePlayerStore } from '@shared/store/playerStore';
import { DEFAULT_AVATARS } from '@shared/constants/avatars';

export function OnboardingDialog() {
  const onboardingDone = usePlayerStore((s) => s.profile.onboardingDone);
  const [nickname, setNickname] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  if (onboardingDone) return null;

  const handleComplete = () => {
    if (!nickname.trim() || !selected) return;
    playerApi.completeOnboarding({ nickname: nickname.trim(), avatarId: selected });
  };

  return (
    <Dialog open={!onboardingDone}>
      <DialogTitle>Vítej v My Arcade 🎮</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2">
            Vyber si přezdívku a svého avatara. Získáš startovní mince 💰 a odemkneš profil!
          </Typography>

          <TextField
            label="Přezdívka"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            fullWidth
            inputProps={{ maxLength: 16 }}
          />

          <Typography variant="subtitle2" sx={{ mt: 1 }}>Tvůj avatar</Typography>
          <Grid container spacing={1}>
            {DEFAULT_AVATARS.map((a) => (
              <Grid key={a.id} size="auto">
                <Avatar
                  src={a.url}
                  alt={a.name}
                  sx={{
                    width: 56,
                    height: 56,
                    border: selected === a.id ? '2px solid #1976d2' : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => setSelected(a.id)}
                />
              </Grid>
            ))}
          </Grid>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleComplete} disabled={!nickname || !selected} variant="contained">
          Potvrdit
        </Button>
      </DialogActions>
    </Dialog>
  );
}
