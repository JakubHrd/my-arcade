import { Chip, Tooltip } from '@mui/material';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import { usePlayerStore } from '@shared/store/playerStore';

export default function CoinCounter() {
  const coins = usePlayerStore((s) => s.profile.coins);
  return (
    <Tooltip title="Meta mince (shop, odznaky, kosmetika)">
      <Chip
        icon={<MonetizationOnIcon />}
        color="warning"
        variant="outlined"
        label={coins}
        size="small"
        sx={{ fontWeight: 700 }}
      />
    </Tooltip>
  );
}
