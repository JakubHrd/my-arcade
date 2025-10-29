import { Casino } from '@games/core/casino';
import { telemetry } from '@shared/fx/telemetry';

Casino.subscribe((e) => {
  if (!e?.type) return;
  telemetry.log({
    kind: 'casino',
    type: e.type,
    payload: e.payload ?? null,
  });
});
