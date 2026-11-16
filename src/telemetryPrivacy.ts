export function privateErrorSummary(error: unknown) {
  return error instanceof Error && ['Error', 'TypeError', 'RangeError', 'SyntaxError', 'ApiError', 'AxiosError'].includes(error.name) ? error.name : 'UnknownError';
}

// Regras compartilhadas pelo obfuscate do New Relic e pelo sanitizador local (#262).
// JWT/Bearer antes de e-mail e GUID, para o token sair inteiro.
export const TELEMETRY_OBFUSCATE_RULES: ReadonlyArray<{ regex: RegExp; replacement: string }> = [
  { regex: /https?:\/\/[^\s"'<>]+/gi, replacement: '[url]' },
  { regex: /\b(?:data|blob):[^\s"'<>)]+/gi, replacement: '[url]' },
  { regex: /\bBearer\s+[\w.~+/=-]+/gi, replacement: 'Bearer [token]' },
  { regex: /\beyJ[\w-]*\.[\w-]+\.[\w-]*/g, replacement: '[token]' },
  { regex: /[\w.+-]{1,64}@[\w-]+(?:\.[\w-]+)+/g, replacement: '[email]' },
  { regex: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, replacement: '[id]' },
  { regex: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, replacement: '[cpf]' },
];

export function sanitizeTelemetryText(text: string) {
  return TELEMETRY_OBFUSCATE_RULES.reduce((value, { regex, replacement }) => value.replace(regex, replacement), text);
}

const MAX_STACK_FRAMES = 20;
// Frame real termina em linha:coluna; linha de mensagem multilinha que imite um frame não passa.
const FRAME_PATTERN = /^\s*(?:at\s.*|[^\s@]*@\S*):\d+:\d+\)?\s*$/;

// Só os frames: a primeira linha do V8 repete a mensagem, que pode trazer texto da API ou dado digitado.
// Origem, query e hash saem do arquivo; o caminho dos assets fica para localizar o erro.
function sanitizeStackFrames(error: Error) {
  let stack = typeof error.stack === 'string' ? error.stack : '';
  const header = `${error.name}: ${error.message}`;
  if (stack.startsWith(header)) stack = stack.slice(header.length);
  return stack.split('\n')
    .filter(line => FRAME_PATTERN.test(line))
    .slice(0, MAX_STACK_FRAMES)
    .map(line => sanitizeTelemetryText(line.trim()
      .replace(/\b(?:data|blob):\S*?(?=:\d+:\d+\)?$)/i, '[url]')
      .replace(/https?:\/\/[^/\s)]+/gi, '')
      .replace(/[?#][^\s:)]*/g, '')));
}

// Erro que pode sair para a telemetria: nome resumido, sem mensagem livre, frames sanitizados.
export function sanitizedErrorForTelemetry(error: unknown) {
  const summary = privateErrorSummary(error);
  const sanitized = new Error(summary);
  sanitized.name = summary;
  const frames = error instanceof Error ? sanitizeStackFrames(error) : [];
  sanitized.stack = [summary, ...frames].join('\n');
  return sanitized;
}
