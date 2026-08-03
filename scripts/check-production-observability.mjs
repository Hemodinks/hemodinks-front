import process from 'node:process';

const dsn = process.env.VITE_SENTRY_DSN?.trim();
const sampleRateValue = process.env.VITE_SENTRY_TRACES_SAMPLE_RATE?.trim();
const sampleRate = Number(sampleRateValue);
const errors = [];

if (!dsn) {
  errors.push('VITE_SENTRY_DSN não está configurado.');
} else {
  try {
    const url = new URL(dsn);
    if (url.protocol !== 'https:' || !url.hostname) {
      errors.push('VITE_SENTRY_DSN deve ser uma URL HTTPS válida.');
    }
  } catch {
    errors.push('VITE_SENTRY_DSN deve ser uma URL válida.');
  }
}

if (!sampleRateValue || !Number.isFinite(sampleRate) || sampleRate <= 0 || sampleRate > 1) {
  errors.push('VITE_SENTRY_TRACES_SAMPLE_RATE deve estar entre 0 (exclusivo) e 1.');
}

if (errors.length) {
  console.error('Configuração de observabilidade de produção inválida:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Observabilidade de produção configurada com amostragem de ${sampleRate}.`);
