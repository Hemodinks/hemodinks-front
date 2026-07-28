import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, extname, relative, resolve, sep } from 'node:path';
import process from 'node:process';

const projectRoot = process.cwd();
const sourceRoot = resolve(projectRoot, 'src');
const sourceExtensions = ['.ts', '.tsx'];
const importPattern =
  /(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

function collectSourceFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry);
    if (statSync(path).isDirectory()) return collectSourceFiles(path);
    return sourceExtensions.includes(extname(path)) && !path.endsWith('.d.ts') ? [path] : [];
  });
}

function resolveImport(sourceFile, specifier) {
  if (!specifier.startsWith('.')) return null;
  const candidate = resolve(dirname(sourceFile), specifier);
  const candidates = [
    candidate,
    ...sourceExtensions.map((extension) => `${candidate}${extension}`),
    ...sourceExtensions.map((extension) => resolve(candidate, `index${extension}`)),
  ];
  return candidates.find((path) => existsSync(path) && statSync(path).isFile()) ?? null;
}

function featureName(path) {
  const pathParts = relative(sourceRoot, path).split(sep);
  return pathParts[0] === 'features' ? pathParts[1] : null;
}

function displayPath(path) {
  return relative(projectRoot, path).split(sep).join('/');
}

const files = collectSourceFiles(sourceRoot);
const graph = new Map(files.map((file) => [file, []]));
const errors = [];

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1] ?? match[2];
    const target = resolveImport(file, specifier);
    if (!target || !target.startsWith(sourceRoot)) continue;
    graph.get(file).push(target);

    const sourcePath = relative(sourceRoot, file).split(sep);
    const targetPath = relative(sourceRoot, target).split(sep);
    if (sourcePath[0] === 'shared' && targetPath[0] === 'features') {
      errors.push(`${displayPath(file)}: shared não pode importar ${displayPath(target)}.`);
    }
    if (['services', 'layout'].includes(sourcePath[0]) && targetPath[0] === 'features') {
      errors.push(
        `${displayPath(file)}: ${sourcePath[0]} deve depender de contratos compartilhados, não de ${displayPath(target)}.`,
      );
    }

    const sourceFeature = featureName(file);
    const targetFeature = featureName(target);
    if (sourceFeature && targetFeature && sourceFeature !== targetFeature) {
      errors.push(
        `${displayPath(file)}: feature "${sourceFeature}" não pode importar diretamente "${targetFeature}".`,
      );
    }

    if (
      sourcePath[0] === 'app' &&
      targetPath[0] === 'features' &&
      basename(target, extname(target)) !== 'index' &&
      basename(file) !== 'lazyModules.tsx'
    ) {
      errors.push(
        `${displayPath(file)}: app deve consumir a API publica de ${targetPath[1]} em index.ts.`,
      );
    }

    if (target === resolve(sourceRoot, 'types.ts')) {
      errors.push(`${displayPath(file)}: importe o contrato específico em vez de src/types.ts.`);
    }
  }
}

const visiting = new Set();
const visited = new Set();
const stack = [];
const reportedCycles = new Set();

function visit(file) {
  if (visiting.has(file)) {
    const cycleStart = stack.indexOf(file);
    const cycle = [...stack.slice(cycleStart), file];
    const normalized = cycle.map(displayPath);
    const key = [...normalized.slice(0, -1)].sort().join('|');
    if (!reportedCycles.has(key)) {
      reportedCycles.add(key);
      errors.push(`Ciclo entre módulos: ${normalized.join(' -> ')}.`);
    }
    return;
  }
  if (visited.has(file)) return;

  visiting.add(file);
  stack.push(file);
  for (const target of graph.get(file) ?? []) visit(target);
  stack.pop();
  visiting.delete(file);
  visited.add(file);
}

for (const file of files) visit(file);

if (errors.length) {
  console.error(`Falha na validação arquitetural (${errors.length} problema(s)):\n`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Fronteiras arquiteturais válidas em ${files.length} módulos.`);
