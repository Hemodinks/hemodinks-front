import { gzipSync } from 'node:zlib';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const distDir = join(process.cwd(), 'dist');
const indexHtmlPath = join(distDir, 'index.html');
const indexHtml = readFileSync(indexHtmlPath, 'utf8');

const entryMatch = indexHtml.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/);
const cssMatch = indexHtml.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/);

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

function checkBudget(label, filePath, maxKb, gzip = false) {
  const raw = readFileSync(filePath);
  const sizeKb = bytesToKb(gzip ? gzipSync(raw).length : statSync(filePath).size);
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
checkBudget('entry js raw', entryPath, entryRawBudgetKb);
checkBudget('entry js gzip', entryPath, entryGzipBudgetKb, true);

if (cssMatch) {
  const cssPath = toFilePath(cssMatch[1]);
  const cssBudgetKb = readBudget('PERF_BUDGET_CSS_KB', 70);
  checkBudget('entry css raw', cssPath, cssBudgetKb);
}
