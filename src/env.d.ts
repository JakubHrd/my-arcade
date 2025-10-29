/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string;
  readonly VITE_TELEMETRY: string; // "1" | "0"
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
