import { describe, expect, it } from 'vitest';
import { hashTutorialAudio, type TutorialAudioHashInput } from './tutorialAudioHash';

const base: TutorialAudioHashInput = {
  tutorialId: 'reports-analytics', stepId: 'filters', text: 'Situação do relatório.',
  voice: 'pt-BR-FranciscaNeural', locale: 'pt-BR', rate: '+0%', pitch: '+0%', volume: 'default',
  outputFormat: 'audio-24khz-96kbitrate-mono-mp3',
};

describe('hash de áudio de tutorial', () => {
  it('é determinístico para a mesma entrada', async () => expect(await hashTutorialAudio(base)).toBe(await hashTutorialAudio(base)));
  it.each(['text', 'voice', 'rate', 'ssml'] as const)('muda quando %s muda', async (field) => {
    const changed = { ...base, [field]: `${base[field] ?? ''}-alterado` };
    expect(await hashTutorialAudio(changed)).not.toBe(await hashTutorialAudio(base));
  });
});
