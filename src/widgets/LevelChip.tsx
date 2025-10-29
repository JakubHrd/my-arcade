import { Chip, Tooltip } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { usePlayerStore } from '@shared/store/playerStore';

export default function LevelChip() {
  const level = usePlayerStore((s) => s.profile.progression.level);
  return (
    <Tooltip title="Tvůj level (odemiká nové hry)">
      <Chip
        icon={<EmojiEventsIcon />}
        color="primary"
        variant="outlined"
        size="small"
        label={`Lv ${level}`}
        sx={{ fontWeight: 700 }}
      />
    </Tooltip>
  );
}
