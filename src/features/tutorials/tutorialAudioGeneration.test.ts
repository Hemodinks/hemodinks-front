import { describe, expect, it } from 'vitest';
import { shouldGenerateTutorialAudio } from './tutorialAudioGeneration';

describe('geração incremental', () => {
  const unchanged = { force: false, expectedHash: 'abc', expectedFile: '/audio.mp3', fileExists: true, manifest: { hash: 'abc', file: '/audio.mp3' } };
  it('não chama geração quando arquivo e manifesto não mudaram', () => expect(shouldGenerateTutorialAudio(unchanged)).toBe(false));
  it.each([
    { expectedHash: 'changed' }, { expectedFile: '/other.mp3' }, { fileExists: false }, { force: true }, { manifest: undefined },
  ])('gera somente quando necessário: %o', (change) => expect(shouldGenerateTutorialAudio({ ...unchanged, ...change })).toBe(true));
});
