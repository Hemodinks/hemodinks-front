import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { capture } from './process-utils';
import { artifactsRoot, piperExecutable, voiceConfig, voiceModel, workspaceRoot } from './tutorial-paths';

const sample = 'situação, autorização, notificações e configuração.';
const output = join(artifactsRoot, 'pronunciation-check.wav');
const result = await capture(piperExecutable, [
  '--model', voiceModel,
  '--config', voiceConfig,
  '--output_file', output,
  '--debug',
], workspaceRoot, sample);

await rm(output, { force: true });
if (result.code !== 0) throw new Error(`Falha na verificação do Piper.\n${result.stderr}`);
const phonemes = result.stderr.match(/phonemes=\[\[(.+)\]\]/s)?.[1];
if (!phonemes) throw new Error('O Piper não informou os fonemas da amostra pt-BR.');
const phonemeCount = phonemes.split(',').length;
if (phonemeCount > 100) {
  throw new Error(`Acentos pt-BR foram corrompidos antes da fonetização (${phonemeCount} símbolos).`);
}
console.log(`Pronúncia pt-BR validada: ${phonemeCount} símbolos fonéticos, sem corrupção UTF-8.`);
