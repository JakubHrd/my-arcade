import { Chip, Tooltip } from '@mui/material';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import { useCasino } from '@games/core/useCasino';

export function BankIndicator() {
  const { balance } = useCasino();
  return (
    <Tooltip title="Kasino mince (sázky/výhry miniher)">
      <span id="bank-anchor">
        <Chip
          icon={<MonetizationOnIcon />}
          color="success"
          variant="outlined"
          label={balance}
          size="small"
          sx={{ fontWeight: 700 }}
        />
      </span>
    </Tooltip>
  );
}

export default BankIndicator;
