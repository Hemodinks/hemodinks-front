// Fonte única da CSP e dos headers de segurança (#266).
// Uso: `node scripts/security-headers.mjs` verifica drift; `--write` atualiza os destinos a partir de
// `security-headers.json`. A verificação compara nome e valor dos headers, sem depender da ordem.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const NGINX_HEADER = /^ {2}add_header (\S+) "([^"]*)" always;$/;

export function buildCsp(directives, append = {}) {
  return Object.entries(directives)
    .map(([name, values]) => [name, ...values, ...(append[name] ?? [])].join(' '))
    .join('; ');
}

export function expectedHeaders(canonical, target) {
  for (const name of Object.keys(target.cspAppend ?? {})) {
    if (!(name in canonical.contentSecurityPolicy)) throw new Error(`cspAppend com diretiva desconhecida: ${name}`);
  }
  return {
    'Content-Security-Policy': buildCsp(canonical.contentSecurityPolicy, target.cspAppend),
    ...canonical.headers,
    ...(target.headers ?? {}),
  };
}

function vercelSecurityEntry(config) {
  const entry = config.headers?.find((item) => item.source === '/(.*)');
  if (!entry) throw new Error('vercel.json sem a regra de headers "/(.*)"');
  return entry;
}

const formats = {
  azure: {
    read: (text) => ({ ...(JSON.parse(text).globalHeaders ?? {}) }),
    write(text, expected) {
      const config = JSON.parse(text);
      config.globalHeaders = Object.fromEntries(Object.keys(expected).sort().map((name) => [name, expected[name]]));
      return `${JSON.stringify(config, null, 2)}\n`;
    },
  },
  vercel: {
    read: (text) => Object.fromEntries(vercelSecurityEntry(JSON.parse(text)).headers.map((h) => [h.key, h.value])),
    write(text, expected) {
      const config = JSON.parse(text);
      const entry = vercelSecurityEntry(config);
      const kept = entry.headers.filter((h) => h.key in expected).map((h) => ({ key: h.key, value: expected[h.key] }));
      const added = Object.keys(expected)
        .filter((name) => !kept.some((h) => h.key === name))
        .map((name) => ({ key: name, value: expected[name] }));
      entry.headers = [...kept, ...added];
      return `${JSON.stringify(config, null, 2)}\n`;
    },
  },
  nginx: {
    read(text) {
      const headers = {};
      for (const line of text.split('\n')) {
        const match = NGINX_HEADER.exec(line);
        if (match) headers[match[1]] = match[2];
      }
      return headers;
    },
    write(text, expected) {
      for (const value of Object.values(expected)) {
        if (value.includes('"')) throw new Error('valor de header com aspas duplas não cabe no nginx');
      }
      const lines = text.split('\n');
      const first = lines.findIndex((line) => NGINX_HEADER.test(line));
      if (first < 0) throw new Error('nginx sem bloco add_header no nível do server');
      const block = Object.entries(expected).map(([name, value]) => `  add_header ${name} "${value}" always;`);
      const rest = lines.slice(first).filter((line) => !NGINX_HEADER.test(line));
      return [...lines.slice(0, first), ...block, ...rest].join('\n');
    },
  },
};

export function diffHeaders(actual, expected) {
  const problems = [];
  for (const [name, value] of Object.entries(expected)) {
    if (!(name in actual)) problems.push(`falta ${name}`);
    else if (actual[name] !== value) problems.push(`${name} diverge\n    atual:    ${actual[name]}\n    esperado: ${value}`);
  }
  for (const name of Object.keys(actual)) {
    if (!(name in expected)) problems.push(`${name} não está no security-headers.json`);
  }
  return problems;
}

export function run({ root, write = false }) {
  const canonical = JSON.parse(readFileSync(resolve(root, 'security-headers.json'), 'utf8'));
  const report = [];
  for (const [id, target] of Object.entries(canonical.targets)) {
    const format = formats[target.format];
    if (!format) throw new Error(`${id}: formato desconhecido ${target.format}`);
    const path = resolve(root, target.file);
    const original = readFileSync(path, 'utf8');
    const crlf = original.includes('\r\n');
    let text = original.replace(/\r\n/g, '\n');
    const expected = expectedHeaders(canonical, target);
    if (write) {
      text = format.write(text, expected);
      // Preserva o fim de linha da cópia de trabalho (core.autocrlf no Windows).
      writeFileSync(path, crlf ? text.replace(/\n/g, '\r\n') : text);
    }
    const problems = diffHeaders(format.read(text), expected);
    report.push({ id, file: target.file, problems });
  }
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const write = process.argv.includes('--write');
  const report = run({ root: resolve(fileURLToPath(import.meta.url), '../..'), write });
  const failing = report.filter((item) => item.problems.length > 0);
  for (const item of report) {
    console.log(`${item.problems.length ? 'DRIFT' : 'ok   '} ${item.id} (${item.file})`);
    for (const problem of item.problems) console.log(`  - ${problem}`);
  }
  if (failing.length) {
    console.error('\nHeaders fora do security-headers.json. Rode `npm run security-headers:write` e revise o diff.');
    process.exit(1);
  }
}
