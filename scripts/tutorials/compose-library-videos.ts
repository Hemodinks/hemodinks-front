import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative } from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import { TUTORIAL_MEDIA } from './library-config';
import { capture, run } from './process-utils';
import { artifactsRoot, workspaceRoot } from './tutorial-paths';
import { TUTORIALS, type TutorialId } from '../../src/features/tutorials/tutorialRegistry';
import { getTutorialNarration } from '../../src/features/tutorials/tutorialNarration';

type Timeline = { tutorialId: TutorialId; slug: string; completedAtMs: number; steps: Array<{ id: string; narrationStartMs: number; narrationEndMs: number }> };

async function findFiles(root: string, name: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? findFiles(path, name) : entry.name === name ? [path] : [];
  }))).flat();
}

function srtTime(ms: number) {
  const h = Math.floor(ms / 3_600_000); const m = Math.floor(ms % 3_600_000 / 60_000);
  const s = Math.floor(ms % 60_000 / 1000); const milli = Math.floor(ms % 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(milli).padStart(3, '0')}`;
}

function assTime(ms: number) {
  const h = Math.floor(ms / 3_600_000); const m = Math.floor(ms % 3_600_000 / 60_000);
  const s = Math.floor(ms % 60_000 / 1000); const cs = Math.floor(ms % 1000 / 10);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

if (!ffmpegPath) throw new Error('FFmpeg não encontrado.');
const resultRoot = join(artifactsRoot, 'playwright-library-results');
const requested = process.argv.slice(2) as TutorialId[];
const discoveredTimelines = await findFiles(resultRoot, 'timeline.json');
const timelines: string[] = [];
for (const path of discoveredTimelines) {
  const timeline = JSON.parse(await readFile(path, 'utf8')) as Timeline;
  if (!requested.length || requested.includes(timeline.tutorialId)) timelines.push(path);
}
if (!timelines.length) throw new Error('Nenhuma timeline da biblioteca foi encontrada.');

for (const timelineFile of timelines) {
  const timeline = JSON.parse(await readFile(timelineFile, 'utf8')) as Timeline;
  if (requested.length && !requested.includes(timeline.tutorialId)) continue;
  const media = TUTORIAL_MEDIA[timeline.tutorialId];
  const tutorial = TUTORIALS[timeline.tutorialId];
  const sourceVideo = join(dirname(timelineFile), 'video.webm');
  const root = join(artifactsRoot, 'library', media.slug);
  const publicRoot = join(workspaceRoot, 'public', 'tutorials', media.slug);
  if (tutorial.steps.length !== timeline.steps.length) throw new Error(`Timeline divergente: ${timeline.tutorialId}`);
  const steps = tutorial.steps.map((tutorialStep, index) => {
    const timelineStep = timeline.steps[index];
    const narration = getTutorialNarration(tutorialStep);
    if (tutorialStep.id !== timelineStep.id || !narration.audio) throw new Error(`Etapa divergente: ${timeline.tutorialId}.${tutorialStep.id}`);
    return { id: tutorialStep.id, text: narration.text, audioFile: join(workspaceRoot, 'public', narration.audio.replace(/^\//, '')), ...timelineStep };
  });
  await mkdir(root, { recursive: true }); await mkdir(publicRoot, { recursive: true });
  const raw = join(root, `tutorial-${media.slug}-sem-audio.webm`);
  const srtPath = join(root, `tutorial-${media.slug}.srt`);
  const assPath = join(root, `tutorial-${media.slug}.ass`);
  const webm = join(root, `tutorial-${media.slug}-narrado.webm`);
  const mp4 = join(root, `tutorial-${media.slug}-narrado.mp4`);
  await copyFile(sourceVideo, raw);
  await writeFile(srtPath, steps.map((step, index) => `${index + 1}\n${srtTime(step.narrationStartMs)} --> ${srtTime(step.narrationEndMs)}\n${step.text}\n`).join('\n'), 'utf8');
  const header = `[Script Info]\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\nWrapStyle: 0\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Tutorial,Arial,34,&H00FFFFFF,&H000000FF,&H00131A2A,&H90000000,-1,0,0,0,100,100,0,0,1,3,1,2,110,110,42,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
  await writeFile(assPath, header + steps.map((step) => `Dialogue: 0,${assTime(step.narrationStartMs)},${assTime(step.narrationEndMs)},Tutorial,,0,0,0,,${step.text}`).join('\n'), 'utf8');
  const inputs = [raw, ...steps.map((step) => step.audioFile)].flatMap((path) => ['-i', path]);
  const delays = steps.map((step, index) => (
    `[${index + 1}:a]loudnorm=I=-14:TP=-1.0:LRA=7,adelay=${Math.round(step.narrationStartMs)}:all=1[a${index + 1}]`
  ));
  const labels = steps.map((_, index) => `[a${index + 1}]`).join('');
  const subtitle = relative(workspaceRoot, assPath).replaceAll('\\', '/').replaceAll(':', '\\:');
  const filter = [`[0:v]scale=1920:1080,subtitles='${subtitle}'[video]`, ...delays, `${labels}amix=inputs=${steps.length}:duration=longest:dropout_transition=0:normalize=0,loudnorm=I=-14:TP=-2:LRA=7,apad[audio]`].join(';');
  const common = ['-y', '-hide_banner', '-loglevel', 'error', ...inputs, '-filter_complex', filter, '-map', '[video]', '-map', '[audio]', '-t', (timeline.completedAtMs / 1000).toFixed(3)];
  await run(ffmpegPath, [...common, '-c:v', 'libvpx-vp9', '-crf', '32', '-b:v', '0', '-deadline', 'good', '-cpu-used', '4', '-c:a', 'libopus', '-b:a', '112k', webm], { cwd: workspaceRoot });
  await run(ffmpegPath, ['-y', '-hide_banner', '-loglevel', 'error', '-i', webm, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-movflags', '+faststart', mp4], { cwd: workspaceRoot });
  for (const output of [webm, mp4]) {
    const probe = await capture(ffmpegPath, ['-hide_banner', '-i', output], workspaceRoot);
    if (!probe.stderr.includes('1920x1080') || !probe.stderr.includes('Audio:')) throw new Error(`Mídia inválida: ${basename(output)}`);
    const decoding = await capture(ffmpegPath, ['-v', 'error', '-i', output, '-map', '0:v:0', '-map', '0:a:0', '-f', 'null', '-'], workspaceRoot);
    if (decoding.code !== 0 || decoding.stderr.trim()) throw new Error(`Decodificação integral inválida: ${basename(output)}\n${decoding.stderr.slice(0, 2000)}`);
  }
  await Promise.all([copyFile(webm, join(publicRoot, basename(webm))), copyFile(mp4, join(publicRoot, basename(mp4)))]);
  console.log(`${timeline.tutorialId}: WebM e MP4 publicados.`);
}
