export type OpenTelemetryRuntimeConfig = {
  enabled?: boolean;
  exporterEndpoint?: string;
  exporterHeaders?: string;
  serviceName?: string;
  serviceVersion?: string;
  environment?: string;
  tracesSampleRate?: number;
};
