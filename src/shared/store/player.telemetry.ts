import { usePlayerStore } from '@shared/store/playerStore';
import { telemetry } from '@shared/fx/telemetry';

// Odvození typu profilu přímo ze stavu store (bez duplicitních deklarací)
type Profile = ReturnType<typeof usePlayerStore.getState>['profile'];

let ready = false;

try {
  // držíme si předchozí snapshot profilu sami
  let prev: Profile = usePlayerStore.getState().profile;

  const unsub = usePlayerStore.subscribe((state) => {
    const profile: Profile = state.profile;

    // první průchod nehlásíme (abychom nelogovali init)
    if (!ready) {
      ready = true;
      prev = profile;
      return;
    }

    const deltaCoins = (profile.coins ?? 0) - (prev?.coins ?? 0);
    const deltaXP = (profile.progression?.xp ?? 0) - (prev?.progression?.xp ?? 0);
    const leveledUp =
      (profile.progression?.level ?? 0) > (prev?.progression?.level ?? 0);

    if (deltaCoins !== 0) {
      telemetry.log({
        kind: 'profile',
        type: 'coins',
        payload: { coins: profile.coins ?? 0, delta: deltaCoins },
      });
    }

    if (deltaXP !== 0 || leveledUp) {
      telemetry.log({
        kind: 'profile',
        type: 'xp',
        payload: {
          xp: profile.progression?.xp ?? 0,
          level: profile.progression?.level ?? 0,
          deltaXP,
          leveledUp,
        },
      });
    }

    // posuň prev na aktuální
    prev = profile;
  });

  // necháme běžet po celou dobu života aplikace; unsub není potřeba exportovat
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _keep = unsub;
} catch {
  // ignore v SSR/testech
}
