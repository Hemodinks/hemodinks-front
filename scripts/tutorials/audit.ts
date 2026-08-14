import { access, readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { TUTORIALS } from '../../src/features/tutorials/tutorialRegistry';
import { hashTutorialAudio } from '../../src/features/tutorials/tutorialAudioHash';
import { getTutorialNarration, getStableStepId } from '../../src/features/tutorials/tutorialNarration';
import { buildTutorialSsml } from '../../src/features/tutorials/tutorialSsml';
import { tutorialVoiceConfig } from '../../src/features/tutorials/tutorialVoiceConfig';
import { audioRoot, readAudioManifest } from './audio-manifest';

const manifest = await readAudioManifest();
const errors: string[] = [];
const warnings: string[] = [];
const ids = new Set<string>();
const expectedAudio = new Set<string>();
let steps = 0;
let narrated = 0;
let audioDefinitions = 0;
let audioFiles = 0;

for (const [registryId, tutorial] of Object.entries(TUTORIALS)) {
  if (!tutorial.id || tutorial.id !== registryId) errors.push(`${registryId}: ID ausente ou diferente da chave do registro.`);
  for (const step of tutorial.steps) {
    steps += 1;
    const stableId = getStableStepId(tutorial.id, step.id);
    if (!step.id) errors.push(`${tutorial.id}: step sem ID.`);
    if (ids.has(stableId)) errors.push(`ID duplicado: ${stableId}`);
    ids.add(stableId);
    if (!/^\[data-tour="[a-z0-9-]+"\]$/.test(step.target)) errors.push(`${stableId}: seletor data-tour instável: ${step.target}`);
    const narration = getTutorialNarration(step);
    if (!narration.text.trim()) errors.push(`${stableId}: narração sem texto.`); else narrated += 1;
    if (!narration.audio) continue;
    audioDefinitions += 1;
    if (!/^\/tutorials\/audio\/[a-z0-9/-]+\.mp3$/.test(narration.audio)) errors.push(`${stableId}: caminho de áudio inválido.`);
    expectedAudio.add(narration.audio);
    const diskFile = join(process.cwd(), 'public', narration.audio.replace(/^\//, ''));
    const exists = await access(diskFile).then(() => true).catch(() => false);
    if (!exists) errors.push(`${stableId}: arquivo ausente ${narration.audio}`); else audioFiles += 1;
    const entry = manifest.tutorials[tutorial.id]?.steps[step.id];
    if (!entry) { errors.push(`${stableId}: ausente no manifesto.`); continue; }
    const ssml = buildTutorialSsml({ ...narration, voice: manifest.voice.name });
    const hash = await hashTutorialAudio({ tutorialId: tutorial.id, stepId: step.id, text: narration.text, ssml, voice: manifest.voice.name, ...tutorialVoiceConfig });
    if (entry.hash !== hash || entry.file !== narration.audio) errors.push(`${stableId}: manifesto divergente.`);
  }
}

async function findMp3(directory: string): Promise<string[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return (await Promise.all(entries.map((entry) => entry.isDirectory() ? findMp3(join(directory, entry.name)) : entry.name.endsWith('.mp3') ? [join(directory, entry.name)] : []))).flat();
  } catch { return []; }
}
for (const file of await findMp3(audioRoot)) {
  const publicPath = `/tutorials/audio/${relative(audioRoot, file).replaceAll('\\', '/')}`;
  if (!expectedAudio.has(publicPath)) warnings.push(`ORPHAN: ${relative(process.cwd(), file)}`);
}

// Referências repetidas entre config e JSX são esperadas; definições JSX duplicadas no mesmo arquivo não são.
const sourceFiles = (await readdir(join(process.cwd(), 'src'), { recursive: true, withFileTypes: true }))
  .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name));
for (const entry of sourceFiles) {
  const path = join(entry.parentPath, entry.name);
  if (path.includes(`${join('features', 'tutorials', 'configs')}`)) continue;
  const text = await readFile(path, 'utf8');
  const occurrences = [...text.matchAll(/data-tour=["']([a-z0-9-]+)["']/g)].map((match) => match[1]);
  for (const value of new Set(occurrences)) if (occurrences.filter((item) => item === value).length > 1) warnings.push(`data-tour repetido no arquivo ${relative(process.cwd(), path)}: ${value}`);
}

console.log(`Tutorial audit\n\nTutorials: ${Object.keys(TUTORIALS).length}\nSteps: ${steps}\nValid stable IDs: ${ids.size}\nNarration definitions: ${narrated}\nStatic audio definitions: ${audioDefinitions}\nAudio files: ${audioFiles}\nDuplicate IDs: ${errors.filter((item) => item.includes('duplicado')).length}\nWarnings: ${warnings.length}\nErrors: ${errors.length}`);
for (const warning of warnings) console.warn(`WARN ${warning}`);
for (const error of errors) console.error(`ERROR ${error}`);
if (errors.length) process.exitCode = 1;
