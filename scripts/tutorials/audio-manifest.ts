import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tutorialVoiceConfig } from '../../src/features/tutorials/tutorialVoiceConfig';

export const publicRoot = join(process.cwd(), 'public');
export const audioRoot = join(publicRoot, 'tutorials', 'audio');
export const tutorialAudioManifestPath = join(publicRoot, 'tutorials', 'tutorial-audio-manifest.json');

export type AudioManifestStep = { hash: string; file: string; generatedAt: string; characters: number };
export type TutorialAudioManifest = {
  version: 1;
  voice: { locale: string; name: string; rate: string; pitch: string; volume: string; outputFormat: string };
  tutorials: Record<string, { steps: Record<string, AudioManifestStep> }>;
};

export function emptyManifest(voice = process.env.AZURE_SPEECH_VOICE || tutorialVoiceConfig.defaultVoice): TutorialAudioManifest {
  return { version: 1, voice: { locale: tutorialVoiceConfig.locale, name: voice, rate: tutorialVoiceConfig.rate, pitch: tutorialVoiceConfig.pitch, volume: tutorialVoiceConfig.volume, outputFormat: tutorialVoiceConfig.outputFormat }, tutorials: {} };
}

export async function readAudioManifest() {
  try { return JSON.parse(await readFile(tutorialAudioManifestPath, 'utf8')) as TutorialAudioManifest; }
  catch { return emptyManifest(); }
}

export async function writeAudioManifest(manifest: TutorialAudioManifest) {
  await writeFile(tutorialAudioManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}
