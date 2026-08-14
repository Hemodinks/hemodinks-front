import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { TUTORIALS } from '../../src/features/tutorials/tutorialRegistry';
import { hashTutorialAudio } from '../../src/features/tutorials/tutorialAudioHash';
import { shouldGenerateTutorialAudio } from '../../src/features/tutorials/tutorialAudioGeneration';
import { getTutorialNarration } from '../../src/features/tutorials/tutorialNarration';
import { buildTutorialSsml } from '../../src/features/tutorials/tutorialSsml';
import { tutorialVoiceConfig } from '../../src/features/tutorials/tutorialVoiceConfig';
import { audioRoot, readAudioManifest, writeAudioManifest } from './audio-manifest';
import { requireAzureSpeechEnvironment, synthesizeAzureMp3 } from './azure-speech';

type Work = { tutorialId: string; stepId: string; file: string; hash: string; characters: number; ssml: string };
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const allowLarge = args.includes('--allow-large-generation');
const requestedIds = args.filter((arg) => !arg.startsWith('--'));
const aliases: Record<string, keyof typeof TUTORIALS> = { reports: 'reports-analytics' };
const selected = requestedIds.length ? requestedIds.map((id) => aliases[id] ?? id) : Object.keys(TUTORIALS);
const voice = process.env.AZURE_SPEECH_VOICE || tutorialVoiceConfig.defaultVoice;
const manifest = await readAudioManifest();
const work: Work[] = [];
let unchanged = 0;
let migratedSteps = 0;

console.log('Tutorial audio generation\n');
for (const tutorialId of selected) {
  const tutorial = TUTORIALS[tutorialId as keyof typeof TUTORIALS];
  if (!tutorial) throw new Error(`Tutorial desconhecido: ${tutorialId}`);
  console.log(`[${tutorialId.toUpperCase()}]`);
  for (const step of tutorial.steps) {
    const narration = getTutorialNarration(step);
    if (!narration.audio) continue;
    migratedSteps += 1;
    const ssml = buildTutorialSsml({ ...narration, voice });
    const hash = await hashTutorialAudio({ tutorialId, stepId: step.id, text: narration.text, ssml, voice, ...tutorialVoiceConfig });
    const file = narration.audio.replace(/^\/tutorials\/audio\//, '');
    const diskFile = join(audioRoot, file);
    const previous = manifest.tutorials[tutorialId]?.steps[step.id];
    const exists = await access(diskFile).then(() => true).catch(() => false);
    if (!shouldGenerateTutorialAudio({ force, expectedHash: hash, expectedFile: narration.audio, fileExists: exists, manifest: previous })) {
      unchanged += 1; console.log(`  SKIP      ${step.id}`); continue;
    }
    work.push({ tutorialId, stepId: step.id, file: diskFile, hash, characters: narration.text.length, ssml });
    console.log(`  GENERATE  ${step.id}`);
  }
}

const characters = work.reduce((total, item) => total + item.characters, 0);
const max = Number(process.env.TUTORIAL_TTS_MAX_CHARACTERS_PER_RUN || 100_000);
console.log(`\nCharacters to synthesize: ${characters.toLocaleString('pt-BR')}`);
console.log('Acompanhe o consumo mensal F0 no portal do Azure; nenhuma estimativa financeira é calculada pelo script.');
if (characters > max && !allowLarge) throw new Error(`Limite de segurança de ${max.toLocaleString('pt-BR')} caracteres excedido. Use --allow-large-generation conscientemente.`);
if (dryRun) {
  console.log(`\nSummary\n  tutorials: ${selected.length}\n  migrated steps: ${migratedSteps}\n  generate: ${work.length}\n  unchanged: ${unchanged}\n  errors: 0\n\nNo Azure requests performed.`);
  process.exit(0);
}
if (work.length) requireAzureSpeechEnvironment();

let cursor = 0;
let manifestCheckpoint = Promise.resolve();
const concurrency = Math.max(1, Math.min(4, Number(process.env.TUTORIAL_TTS_CONCURRENCY || 2)));
async function worker() {
  while (cursor < work.length) {
    const item = work[cursor++];
    const audio = await synthesizeAzureMp3(item.ssml);
    await mkdir(dirname(item.file), { recursive: true });
    await writeFile(item.file, audio);
    manifest.tutorials[item.tutorialId] ??= { steps: {} };
    manifest.tutorials[item.tutorialId].steps[item.stepId] = {
      hash: item.hash,
      file: `/tutorials/audio/${item.file.slice(audioRoot.length + 1).replaceAll('\\', '/')}`,
      generatedAt: new Date().toISOString(), characters: item.characters,
    };
    manifestCheckpoint = manifestCheckpoint.then(() => writeAudioManifest(manifest));
    await manifestCheckpoint;
    console.log(`  GENERATED ${item.tutorialId}.${item.stepId} — ${item.characters.toLocaleString('pt-BR')} chars`);
  }
}
await Promise.all(Array.from({ length: Math.min(concurrency, work.length) }, worker));
if (work.length) { manifest.voice = { locale: tutorialVoiceConfig.locale, name: voice, rate: tutorialVoiceConfig.rate, pitch: tutorialVoiceConfig.pitch, volume: tutorialVoiceConfig.volume, outputFormat: tutorialVoiceConfig.outputFormat }; await writeAudioManifest(manifest); }
console.log(`\nTutorial audio generation completed\nGenerated: ${work.length}\nUnchanged: ${unchanged}\nCharacters submitted: ${characters}\nErrors: 0`);
