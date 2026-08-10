import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_ROOT = new URL('../src/', import.meta.url);
const MAX_PRODUCTION_LINES = 550;
const LARGE_FILE_WARNING_LINES = 500;
const sourceExtensions = new Set(['.ts', '.tsx']);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  }));
  return nested.flat();
}

const sourceRootPath = fileURLToPath(SOURCE_ROOT);
const files = (await walk(sourceRootPath))
  .filter((file) => sourceExtensions.has(extname(file)))
  .filter((file) => !/\.(test|spec)\.[^.]+$/.test(file));

const errors = [];
const warnings = [];

for (const file of files) {
  const content = await readFile(file, 'utf8');
  const lineCount = content.split(/\r?\n/).length;
  const projectPath = relative(sourceRootPath, file).split(sep).join('/');

  if (lineCount > MAX_PRODUCTION_LINES) {
    errors.push(`${projectPath}: ${lineCount} linhas (limite ${MAX_PRODUCTION_LINES})`);
  } else if (lineCount > LARGE_FILE_WARNING_LINES) {
    warnings.push(`${projectPath}: ${lineCount} linhas; candidato a nova extração`);
  }

  const isFoundation = projectPath.startsWith('shared/') || projectPath.startsWith('services/');
  if (isFoundation && /from\s+['"][^'"]*(?:features|app)\//.test(content)) {
    errors.push(`${projectPath}: camada base não pode depender de app/features`);
  }
  if (projectPath.startsWith('services/') && /from\s+['"][^'"]*shared\/components/.test(content)) {
    errors.push(`${projectPath}: serviço não pode depender de componentes visuais`);
  }
}

for (const warning of warnings) console.warn(`[architecture] aviso: ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`[architecture] erro: ${error}`);
  process.exitCode = 1;
} else {
  console.log(`[architecture] ${files.length} arquivos verificados; nenhuma violação de camada ou tamanho máximo.`);
}
