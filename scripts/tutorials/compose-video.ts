import { copyFile, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import { capture, run } from './process-utils';
import {
  assSubtitlesPath,
  audioManifestPath,
  audioRoot,
  narratedMp4Path,
  narratedWebmPath,
  publishedMp4Path,
  publishedReportsRoot,
  publishedWebmPath,
  rawVideoPath,
  reportsArtifacts,
  subtitlesPath,
  timelinePath,
  workspaceRoot,
} from './tutorial-paths';

type AudioManifest = {
  steps: Array<{ index: number; id: string; text: string; audioFile: string; durationSeconds: number }>;
};

type Timeline = {
  completedAtMs: number;
  steps: Array<{ index: number; id: string; narrationStartMs: number; narrationEndMs: number }>;
};

async function findRecordedVideo(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findRecordedVideo(path);
    return entry.name === 'video.webm' ? [path] : [];
  }));
  return paths.flat();
}

function srtTime(milliseconds: number) {
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const seconds = Math.floor((milliseconds % 60_000) / 1000);
  const millis = Math.floor(milliseconds % 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

function assTime(milliseconds: number) {
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const seconds = Math.floor((milliseconds % 60_000) / 1000);
  const centiseconds = Math.floor((milliseconds % 1000) / 10);
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

if (!ffmpegPath) throw new Error('O binário do FFmpeg não foi encontrado em ffmpeg-static.');
await mkdir(reportsArtifacts, { recursive: true });

const recordings = await findRecordedVideo(join(reportsArtifacts, '..', 'playwright-local-results'));
if (!recordings.length) throw new Error('Nenhum video.webm do Playwright foi encontrado. Execute a gravação primeiro.');
const candidates = await Promise.all(recordings.map(async (path) => ({ path, modified: (await stat(path)).mtimeMs })));
const sourceVideo = candidates.sort((left, right) => right.modified - left.modified)[0].path;
await copyFile(sourceVideo, rawVideoPath);

const manifest = JSON.parse(await readFile(audioManifestPath, 'utf8')) as AudioManifest;
const timeline = JSON.parse(await readFile(timelinePath, 'utf8')) as Timeline;
if (manifest.steps.length !== timeline.steps.length) throw new Error('Manifesto de áudio e timeline possuem quantidades diferentes de etapas.');

const synchronized = manifest.steps.map((audioStep, index) => {
  const timelineStep = timeline.steps[index];
  if (audioStep.id !== timelineStep.id) throw new Error(`Etapa divergente na posição ${index + 1}.`);
  return { ...audioStep, ...timelineStep };
});

const srt = synchronized.map((step, index) => [
  String(index + 1),
  `${srtTime(step.narrationStartMs)} --> ${srtTime(step.narrationEndMs)}`,
  step.text,
  '',
].join('\n')).join('\n');
await writeFile(subtitlesPath, srt, 'utf8');

const assHeader = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Tutorial,Arial,34,&H00FFFFFF,&H000000FF,&H00131A2A,&H90000000,-1,0,0,0,100,100,0,0,1,3,1,2,110,110,42,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
const assEvents = synchronized.map((step) => (
  `Dialogue: 0,${assTime(step.narrationStartMs)},${assTime(step.narrationEndMs)},Tutorial,,0,0,0,,${step.text.replaceAll('\n', '\\N')}`
)).join('\n');
await writeFile(assSubtitlesPath, `${assHeader}${assEvents}\n`, 'utf8');

const inputs = [rawVideoPath, ...synchronized.map((step) => join(audioRoot, step.audioFile))];
const inputArgs = inputs.flatMap((input) => ['-i', input]);
const subtitleRelativePath = relative(workspaceRoot, assSubtitlesPath).replaceAll('\\', '/').replaceAll(':', '\\:');
const audioDelays = synchronized.map((step, index) => (
  `[${index + 1}:a]adelay=${Math.max(0, Math.round(step.narrationStartMs))}:all=1[a${index + 1}]`
));
const audioLabels = synchronized.map((_, index) => `[a${index + 1}]`).join('');
const filter = [
  `[0:v]scale=1920:1080,subtitles='${subtitleRelativePath}'[video]`,
  ...audioDelays,
  `${audioLabels}amix=inputs=${synchronized.length}:duration=longest:dropout_transition=0,volume=1.25,apad[audio]`,
].join(';');
const durationSeconds = (timeline.completedAtMs / 1000).toFixed(3);
const common = ['-y', '-hide_banner', ...inputArgs, '-filter_complex', filter, '-map', '[video]', '-map', '[audio]', '-t', durationSeconds];

await run(ffmpegPath, [
  ...common,
  '-c:v', 'libvpx-vp9', '-crf', '30', '-b:v', '0', '-row-mt', '1',
  '-c:a', 'libopus', '-b:a', '112k',
  narratedWebmPath,
], { cwd: workspaceRoot });

await run(ffmpegPath, [
  ...common,
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart',
  narratedMp4Path,
], { cwd: workspaceRoot });

for (const output of [narratedWebmPath, narratedMp4Path]) {
  const probe = await capture(ffmpegPath, ['-hide_banner', '-i', output], workspaceRoot);
  const details = probe.stderr;
  const isWebm = output === narratedWebmPath;
  const expectedVideoCodec = isWebm ? 'Video: vp9' : 'Video: h264';
  const expectedAudioCodec = isWebm ? 'Audio: opus' : 'Audio: aac';
  if (
    !details.includes('1920x1080') ||
    !details.includes(expectedVideoCodec) ||
    !details.includes(expectedAudioCodec)
  ) {
    throw new Error(`Validação de mídia falhou para ${basename(output)}.\n${details}`);
  }
  console.log(`${basename(output)} validado: 1920x1080, ${expectedVideoCodec}, ${expectedAudioCodec}.`);
}

await mkdir(publishedReportsRoot, { recursive: true });
await Promise.all([
  copyFile(narratedWebmPath, publishedWebmPath),
  copyFile(narratedMp4Path, publishedMp4Path),
]);

console.log(`Legendas: ${subtitlesPath}`);
console.log(`Vídeos publicados no módulo: ${publishedReportsRoot}`);
