import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const distDir = join(process.cwd(), 'dist');
const indexHtmlPath = join(distDir, 'index.html');
const indexHtml = readFileSync(indexHtmlPath, 'utf8');

const entryMatch = indexHtml.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/);
const initialJsAssets = new Set([
  ...Array.from(indexHtml.matchAll(/<script[^>]+type="module"[^>]+src="([^"]+)"/g), match => match[1]),
  ...Array.from(indexHtml.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g), match => match[1]),
]);
const initialCssAssets = new Set(Array.from(
  indexHtml.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g), match => match[1],
));

function toFilePath(assetPath) {
  return join(distDir, assetPath.replace(/^\//, ''));
}

function bytesToKb(bytes) {
  return bytes / 1024;
}

function readBudget(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function checkBudget(label, filePaths, maxKb, gzip = false) {
  const sizeKb = bytesToKb(filePaths.reduce((total, filePath) => {
    const raw = readFileSync(filePath);
    return total + (gzip ? gzipSync(raw).length : raw.length);
  }, 0));
  const formattedSize = sizeKb.toFixed(2);
  const formattedLimit = maxKb.toFixed(2);

  if (sizeKb > maxKb) {
    throw new Error(`${label} is ${formattedSize} kB, above budget ${formattedLimit} kB.`);
  }

  console.log(`${label}: ${formattedSize} kB / ${formattedLimit} kB`);
}

if (!entryMatch) {
  throw new Error('Could not find Vite entry script in dist/index.html.');
}

const entryPath = toFilePath(entryMatch[1]);
const entryRawBudgetKb = readBudget('PERF_BUDGET_ENTRY_KB', 380);
const entryGzipBudgetKb = readBudget('PERF_BUDGET_ENTRY_GZIP_KB', 120);
checkBudget('entry js raw', [entryPath], entryRawBudgetKb);
checkBudget('entry js gzip', [entryPath], entryGzipBudgetKb, true);

// Vite emits static dependencies as modulepreloads in index.html. Measure their
// combined transfer cost instead of allowing a small entry to hide large vendors.
const initialJsPaths = [...initialJsAssets].map(toFilePath);
checkBudget('initial js raw', initialJsPaths, readBudget('PERF_BUDGET_INITIAL_JS_KB', 650));
checkBudget('initial js gzip', initialJsPaths, readBudget('PERF_BUDGET_INITIAL_JS_GZIP_KB', 200), true);
checkBudget('initial css raw', [...initialCssAssets].map(toFilePath), readBudget('PERF_BUDGET_CSS_KB', 70));

// Deferred exports and optional telemetry still need a verifiable upper bound.
const chunkPaths = readdirSync(join(distDir, 'assets'), { recursive: true })
  .filter(file => file.endsWith('.js'));
for (const chunk of chunkPaths) {
  const chunkPath = join(distDir, 'assets', chunk);
  checkBudget(`${chunk} raw`, [chunkPath], readBudget('PERF_BUDGET_CHUNK_KB', 550));
  checkBudget(`${chunk} gzip`, [chunkPath], readBudget('PERF_BUDGET_CHUNK_GZIP_KB', 180), true);
}

// #308: o deploy inteiro (incluindo videos de public/) tem teto no Static Web Apps Free (250 MB).
// Falha bem antes disso para nao depender de upgrade de plano.
const distTotalBytes = readdirSync(distDir, { recursive: true })
  .map(entry => join(distDir, entry))
  .filter(path => statSync(path).isFile())
  .reduce((total, path) => total + statSync(path).size, 0);
const distBudgetMb = readBudget('PERF_BUDGET_DIST_MB', 100);
const distTotalMb = distTotalBytes / (1024 * 1024);
if (distTotalMb > distBudgetMb) {
  throw new Error(`dist total is ${distTotalMb.toFixed(2)} MB, above budget ${distBudgetMb.toFixed(2)} MB.`);
}
console.log(`dist total: ${distTotalMb.toFixed(2)} MB / ${distBudgetMb.toFixed(2)} MB`);
