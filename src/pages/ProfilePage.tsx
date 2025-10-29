import { Avatar, Stack, Typography, Divider, Box, Chip, Button } from '@mui/material';
import { usePlayerStore } from '@shared/store/playerStore';
import { XPBar } from '@widgets/XPBar';
import { CoinCounter } from '@widgets/CoinCounter';
import { LevelChip } from '@widgets/LevelChip';
import { DEFAULT_AVATARS } from '@shared/constants/avatars';

export function ProfilePage() {
  const profile = usePlayerStore((s) => s.profile);
  const avatar = DEFAULT_AVATARS.find((a) => a.id === profile.equipped.avatarId);
    console.log(profile);
  return (
    <Stack spacing={2}>
      <Typography variant="h4" fontWeight={800}>Tvůj profil</Typography>
      <Divider />

      <Stack direction="row" alignItems="center" spacing={2}>
        <Avatar src={avatar?.url} sx={{ width: 80, height: 80 }} />
        <Stack>
          <Typography variant="h6">{profile.nickname || 'Neznámý hráč'}</Typography>
          <LevelChip />
          <CoinCounter />
        </Stack>
      </Stack>

      <Box>
        <XPBar />
      </Box>

      <Divider />

      <Typography variant="h6">Odznaky ({Object.keys(profile.badges).length})</Typography>
      {Object.keys(profile.badges).length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Zatím žádné odznaky.
        </Typography>
      ) : (
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {Object.keys(profile.badges).map((id) => (
            <Chip key={id} label={id} color="secondary" />
          ))}
        </Stack>
      )}

      <Divider />

      <Button variant="outlined" color="error" onClick={() => usePlayerStore.getState().resetProfile()}>
        Reset profilu
      </Button>
    </Stack>
  );
}
