/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_APP_ENV?: string;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_NEW_RELIC_ACCOUNT_ID?: string;
  readonly VITE_NEW_RELIC_AGENT_ID?: string;
  readonly VITE_NEW_RELIC_APPLICATION_ID?: string;
  readonly VITE_NEW_RELIC_BEACON?: string;
  readonly VITE_NEW_RELIC_ERROR_BEACON?: string;
  readonly VITE_NEW_RELIC_LICENSE_KEY?: string;
  readonly VITE_NEW_RELIC_TRUST_KEY?: string;
  readonly VITE_OTEL_EXPORTER_OTLP_ENDPOINT?: string;
  readonly VITE_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?: string;
  readonly VITE_OTEL_EXPORTER_OTLP_HEADERS?: string;
  readonly VITE_OTEL_EXPORTER_OTLP_TRACES_HEADERS?: string;
  readonly VITE_OTEL_SERVICE_NAME?: string;
  readonly VITE_OTEL_TRACES_SAMPLE_RATE?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_TRACES_SAMPLE_RATE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
