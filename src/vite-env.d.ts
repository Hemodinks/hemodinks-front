/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_LOGIN_PREPARATION_ENABLED?: string;
  readonly VITE_WARMUP_ENABLED?: string;
  readonly VITE_APP_ENV?: string;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_CLINICA_ID?: string;
  readonly VITE_CLINICA_SLUG?: string;
  readonly VITE_NEW_RELIC_ACCOUNT_ID?: string;
  readonly VITE_NEW_RELIC_AGENT_ID?: string;
  readonly VITE_NEW_RELIC_APPLICATION_ID?: string;
  readonly VITE_NEW_RELIC_BEACON?: string;
  readonly VITE_NEW_RELIC_ERROR_BEACON?: string;
  readonly VITE_NEW_RELIC_LICENSE_KEY?: string;
  readonly VITE_NEW_RELIC_TRUST_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __APP_BUILD_ID__: string;
