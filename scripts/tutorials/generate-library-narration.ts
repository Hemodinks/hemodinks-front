import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { TUTORIALS, type TutorialId } from '../../src/features/tutorials/tutorialRegistry';
import { PENDING_TUTORIAL_IDS, TUTORIAL_MEDIA } from './library-config';
import { run } from './process-utils';
import { artifactsRoot, piperExecutable, voiceConfig, voiceModel } from './tutorial-paths';

function wavDuration(buffer: Buffer) {
  const byteRate = buffer.readUInt32LE(28);
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const name = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (name === 'data') return size / byteRate;
    offset += 8 + size + (size % 2);
  }
  throw new Error('Bloco data ausente no WAV.');
}

const requested = process.argv.slice(2) as TutorialId[];
const ids = requested.length ? requested : PENDING_TUTORIAL_IDS;

for (const id of ids) {
  const tutorial = TUTORIALS[id];
  const media = TUTORIAL_MEDIA[id];
  if (!tutorial || !media) throw new Error(`Tutorial desconhecido: ${id}`);
  const root = join(artifactsRoot, 'library', media.slug);
  const audioRoot = join(root, 'audio');
  await rm(audioRoot, { recursive: true, force: true });
  await mkdir(audioRoot, { recursive: true });
  const steps = [];
  for (const [index, step] of tutorial.steps.entries()) {
    const audioFile = `step-${String(index + 1).padStart(2, '0')}-${step.id}.wav`;
    const audioPath = join(audioRoot, audioFile);
    await run(piperExecutable, [
      '--model', voiceModel,
      '--config', voiceConfig,
      '--output_file', audioPath,
      '--length-scale', '1.0',
      '--noise-scale', '0.55',
      '--noise-w-scale', '0.65',
      '--sentence-silence', '0.3',
    ], { cwd: root, input: step.narration });
    const { readFile } = await import('node:fs/promises');
    const durationSeconds = wavDuration(await readFile(audioPath));
    steps.push({ index: index + 1, id: step.id, text: step.narration, audioFile, durationSeconds });
  }
  await writeFile(join(root, 'audio-manifest.json'), `${JSON.stringify({ tutorialId: id, slug: media.slug, steps }, null, 2)}\n`, 'utf8');
  console.log(`${id}: ${steps.length} faixas geradas.`);
}
