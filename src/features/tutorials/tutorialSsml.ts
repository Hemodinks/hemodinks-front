import { tutorialPronunciations, type TutorialPronunciationKey } from './tutorialPronunciations';
import { tutorialVoiceConfig } from './tutorialVoiceConfig';

function escapeXml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

export function applyTutorialPronunciations(text: string, keys: readonly string[] = []) {
  let escaped = escapeXml(text);
  for (const key of keys) {
    if (!(key in tutorialPronunciations)) throw new Error(`Pronúncia desconhecida: ${key}`);
    const alias = tutorialPronunciations[key as TutorialPronunciationKey];
    escaped = escaped.replaceAll(key, `<sub alias="${escapeXml(alias)}">${key}</sub>`);
  }
  return escaped;
}

export function buildTutorialSsml(input: { text: string; ssml?: string; pronunciationKeys?: readonly string[]; voice?: string }) {
  const voice = input.voice ?? tutorialVoiceConfig.defaultVoice;
  const body = input.ssml ?? applyTutorialPronunciations(input.text, input.pronunciationKeys);
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${tutorialVoiceConfig.locale}"><voice name="${escapeXml(voice)}"><prosody rate="${tutorialVoiceConfig.rate}" pitch="${tutorialVoiceConfig.pitch}" volume="${tutorialVoiceConfig.volume}">${body}</prosody></voice></speak>`;
}
