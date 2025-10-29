type TelemetryEventBase = {
  id: string;
  ts: number;
  kind: 'casino' | 'profile';
  type: string;
  payload?: any;
};

export type TelemetryEvent = TelemetryEventBase;

const KEY = 'telemetry_v1';
const LIMIT = 200;

function load(): TelemetryEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TelemetryEvent[]) : [];
  } catch {
    return [];
  }
}

function save(arr: TelemetryEvent[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(arr.slice(-LIMIT)));
  } catch {}
}

let cache: TelemetryEvent[] = load();
const subs = new Set<(list: TelemetryEvent[]) => void>();

function emit() {
  subs.forEach((fn) => {
    try { fn(cache); } catch {}
  });
}

export const telemetry = {
  log(evt: Omit<TelemetryEvent, 'id' | 'ts'>) {
    const full: TelemetryEvent = {
      ...evt,
      id: Math.random().toString(36).slice(2, 10),
      ts: Date.now(),
    };
    cache.push(full);
    if (cache.length > LIMIT) cache = cache.slice(-LIMIT);
    save(cache);
    emit();
  },
  getAll(): TelemetryEvent[] {
    return [...cache].reverse();
  },
  clear() {
    cache = [];
    save(cache);
    emit();
  },
  subscribe(fn: (list: TelemetryEvent[]) => void): () => void {
    subs.add(fn);
    try { fn(this.getAll()); } catch {}
    return () => {
      // 👇 explicitně void cleanup
      subs.delete(fn);
    };
  },
};
