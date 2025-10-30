// src/shared/store/player.telemetry.ts
import { usePlayerStore } from './playerStore';
import type { PlayerState } from './playerStore';

// --- helper pro identitu
function buildIdentity() {
  const p = usePlayerStore.getState().profile;
  const id = p.nickname?.trim() ? p.nickname.trim() : p.id;
  return {
    id,
    traits: {
      level: p.progression.level,
      xp: p.progression.xp,
      avatar: p.equipped.avatarId ?? 'none',
      onboardingDone: p.onboardingDone === true,
      coins: p.coins,
      createdAt: p.createdAt,
    },
  };
}

// --- identifikace pouze pokud je hotový onboarding
function identifyIfReady() {
  const p = usePlayerStore.getState().profile;
  if (!p.onboardingDone) return;
  const { id, traits } = buildIdentity();

  // TODO: sem napoj reálné SDK (Segment/PostHog/Amplitude…)
  // telemetry.identify(id, traits);
  console.debug('[telemetry] identify', id, traits);
}

// 1) pokus o okamžitou identifikaci (uživatel mohl být hydratovaný a onboarding hotový)
try {
  identifyIfReady();
} catch {}

// 2) posloucháme změny profilu; v zustand v5 má subscribe signaturu (state, prevState)
let prev = usePlayerStore.getState();
const unsubscribe = usePlayerStore.subscribe((state: PlayerState, prevState: PlayerState) => {
  const before = prevState.profile;
  const after = state.profile;

  // spustit identify, když:
  // a) onboarding přejde z false -> true
  // b) onboarding je hotový a změní se nickname nebo avatar
  const onboardingBecameTrue = before.onboardingDone === false && after.onboardingDone === true;
  const nicknameChanged = after.onboardingDone && before.nickname !== after.nickname;
  const avatarChanged = after.onboardingDone && before.equipped.avatarId !== after.equipped.avatarId;

  if (onboardingBecameTrue || nicknameChanged || avatarChanged) {
    try {
      identifyIfReady();
    } catch {}
  }

  prev = state;
});

// Volitelně: přidáme cleanup pro snadné odpojení v dev tools
// (window as any).__playerTelemetryCleanup = () => unsubscribe();
