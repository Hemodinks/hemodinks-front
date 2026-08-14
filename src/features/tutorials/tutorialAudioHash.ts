export type TutorialAudioHashInput = {
  tutorialId: string;
  stepId: string;
  text: string;
  ssml?: string;
  voice: string;
  locale: string;
  rate: string;
  pitch: string;
  volume: string;
  outputFormat: string;
};

export async function hashTutorialAudio(input: TutorialAudioHashInput) {
  const canonical = JSON.stringify({
    tutorialId: input.tutorialId,
    stepId: input.stepId,
    text: input.text,
    ssml: input.ssml ?? '',
    voice: input.voice,
    locale: input.locale,
    rate: input.rate,
    pitch: input.pitch,
    volume: input.volume,
    outputFormat: input.outputFormat,
  });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
