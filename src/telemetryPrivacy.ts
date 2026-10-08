export function privateErrorSummary(error: unknown) {
  return error instanceof Error && ['Error', 'TypeError', 'RangeError', 'SyntaxError', 'ApiError', 'AxiosError'].includes(error.name) ? error.name : 'UnknownError';
}

export function sanitizeTelemetryEvent<T extends object>(event: T): T {
  const safe: Record<string, unknown> = {};
  for (const key of ['type', 'event_id', 'timestamp', 'platform', 'level', 'release', 'environment', 'sdk'])
    if ((event as Record<string, unknown>)[key] !== undefined) safe[key] = (event as Record<string, unknown>)[key];
  safe.message = 'Falha na aplicação';
  return safe as T;
}


// Export timing/status, never URLs, bodies, headers, DOM labels or event payloads.
export function sanitizeSpan(span: import('@opentelemetry/sdk-trace-base').ReadableSpan): import('@opentelemetry/sdk-trace-base').ReadableSpan {
  const status = span.attributes['http.response.status_code'] ?? span.attributes['http.status_code'];
  return {
    name: 'browser.operation', kind: span.kind, spanContext: () => span.spanContext(),
    parentSpanContext: span.parentSpanContext, startTime: span.startTime, endTime: span.endTime,
    duration: span.duration, ended: span.ended, status: { code: span.status.code },
    attributes: typeof status === 'number' ? { 'http.response.status_code': status } : {},
    links: [], events: [], resource: span.resource, instrumentationScope: span.instrumentationScope,
    droppedAttributesCount: span.droppedAttributesCount, droppedEventsCount: span.droppedEventsCount,
    droppedLinksCount: span.droppedLinksCount,
  };
}
