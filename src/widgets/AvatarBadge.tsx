import { Avatar, Tooltip } from '@mui/material';
import { usePlayerStore } from '@shared/store/playerStore';

export default function AvatarBadge() {
  const avatar = usePlayerStore((s) => s.profile.equipped.avatarId) ?? '🐶';
  const nick = usePlayerStore((s) => s.profile.nickname) ?? 'Guest';
  return (
    <Tooltip title={nick}>
      <Avatar
        sx={{ width: 28, height: 28, fontSize: 16, bgcolor: 'background.paper', color: 'text.primary', border: '1px solid', borderColor: 'divider' }}
      >
        {avatar}
      </Avatar>
    </Tooltip>
  );
}
