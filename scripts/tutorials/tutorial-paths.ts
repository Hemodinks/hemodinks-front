import { join, resolve } from 'node:path';

export const workspaceRoot = resolve(import.meta.dirname, '..', '..');
export const artifactsRoot = join(workspaceRoot, 'artifacts', 'tutorials');
export const reportsArtifacts = join(artifactsRoot, 'reports');
export const toolsRoot = join(artifactsRoot, '.tools');
export const piperVenv = join(toolsRoot, 'piper-venv');
export const voiceRoot = join(toolsRoot, 'voices', 'pt_BR-faber-medium');
export const voiceModel = join(voiceRoot, 'pt_BR-faber-medium.onnx');
export const voiceConfig = join(voiceRoot, 'pt_BR-faber-medium.onnx.json');
export const audioRoot = join(reportsArtifacts, 'audio');
export const audioManifestPath = join(reportsArtifacts, 'audio-manifest.json');
export const timelinePath = join(reportsArtifacts, 'timeline.json');
export const rawVideoPath = join(reportsArtifacts, 'tutorial-relatorios-sem-audio.webm');
export const subtitlesPath = join(reportsArtifacts, 'tutorial-relatorios.srt');
export const assSubtitlesPath = join(reportsArtifacts, 'tutorial-relatorios.ass');
export const narratedWebmPath = join(reportsArtifacts, 'tutorial-relatorios-narrado.webm');
export const narratedMp4Path = join(reportsArtifacts, 'tutorial-relatorios-narrado.mp4');
export const publishedReportsRoot = join(workspaceRoot, 'public', 'tutorials', 'reports');
export const publishedWebmPath = join(publishedReportsRoot, 'tutorial-relatorios-narrado.webm');
export const publishedMp4Path = join(publishedReportsRoot, 'tutorial-relatorios-narrado.mp4');

export const piperExecutable = process.platform === 'win32'
  ? join(piperVenv, 'Scripts', 'piper.exe')
  : join(piperVenv, 'bin', 'piper');

export const venvPython = process.platform === 'win32'
  ? join(piperVenv, 'Scripts', 'python.exe')
  : join(piperVenv, 'bin', 'python');
