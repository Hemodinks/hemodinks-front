import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildTutorialSsml } from '../../src/features/tutorials/tutorialSsml';
import { synthesizeAzureMp3 } from './azure-speech';
import { tutorialVoiceConfig } from '../../src/features/tutorials/tutorialVoiceConfig';

const phrase = process.argv.slice(2).filter((arg) => !arg.startsWith('--')).join(' ').trim();
if (!phrase) throw new Error('Informe a frase: npm run tutorial:voice-preview -- "HemoDinks"');
const keys = process.argv.filter((arg) => arg.startsWith('--pronunciation=')).flatMap((arg) => arg.slice('--pronunciation='.length).split(','));
const outputRoot = join(process.cwd(), 'artifacts', 'tutorials', 'audio-preview');
await mkdir(outputRoot, { recursive: true });
const output = join(outputRoot, `preview-${Date.now()}.mp3`);
await writeFile(output, await synthesizeAzureMp3(buildTutorialSsml({ text: phrase, pronunciationKeys: keys, voice: process.env.AZURE_SPEECH_VOICE || tutorialVoiceConfig.defaultVoice })));
console.log(`Preview criado em ${output}.`);
