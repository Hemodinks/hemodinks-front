export function shouldGenerateTutorialAudio(input: { force: boolean; expectedHash: string; expectedFile: string; fileExists: boolean; manifest?: { hash: string; file: string } }) {
  return input.force || !input.fileExists || input.manifest?.hash !== input.expectedHash || input.manifest?.file !== input.expectedFile;
}
