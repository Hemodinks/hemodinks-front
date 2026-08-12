import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { reportsTutorial } from '../../src/features/tutorials/configs/reportsTutorial';
import { run } from './process-utils';
import {
  audioManifestPath,
  audioRoot,
  piperExecutable,
  reportsArtifacts,
  voiceConfig,
  voiceModel,
  workspaceRoot,
} from './tutorial-paths';

function wavDurationSeconds(buffer: Buffer) {
  const byteRate = buffer.readUInt32LE(28);
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    if (chunkId === 'data') return chunkSize / byteRate;
    offset += 8 + chunkSize + (chunkSize % 2);
  }
  throw new Error('Arquivo WAV sem bloco de dados reconhecível.');
}

await mkdir(reportsArtifacts, { recursive: true });
await rm(audioRoot, { recursive: true, force: true });
await mkdir(audioRoot, { recursive: true });

const entries = [];
for (const [index, step] of reportsTutorial.steps.entries()) {
  const filename = `step-${String(index + 1).padStart(2, '0')}-${step.id}.wav`;
  const output = join(audioRoot, filename);
  await run(piperExecutable, [
    '--model', voiceModel,
    '--config', voiceConfig,
    '--output_file', output,
    '--length-scale', '1.1',
    '--noise-scale', '0.55',
    '--noise-w-scale', '0.65',
    '--sentence-silence', '0.4',
  ], { cwd: workspaceRoot, input: `${step.narration}\n` });
  const durationSeconds = wavDurationSeconds(await readFile(output));
  entries.push({
    index: index + 1,
    id: step.id,
    title: step.title,
    text: step.narration,
    action: step.action,
    audioFile: basename(output),
    durationSeconds: Number(durationSeconds.toFixed(3)),
  });
}

await writeFile(audioManifestPath, JSON.stringify({
  tutorialId: reportsTutorial.id,
  language: 'pt-BR',
  voice: 'pt_BR-faber-medium',
  generatedAt: new Date().toISOString(),
  steps: entries,
}, null, 2));

console.log(`Narração gerada: ${entries.length} faixas em ${audioRoot}.`);
