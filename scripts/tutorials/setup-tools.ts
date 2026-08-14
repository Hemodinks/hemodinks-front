import { access, mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { getPythonLauncher, run, sha256 } from './process-utils';
import {
  piperExecutable,
  piperVenv,
  voiceConfig,
  voiceModel,
  voiceRoot,
  workspaceRoot,
} from './tutorial-paths';

const PIPER_VERSION = '1.6.0';
const VOICE_REVISION = 'v1.0.0';
const VOICE_BASE_URL = `https://huggingface.co/rhasspy/piper-voices/resolve/${VOICE_REVISION}/pt/pt_BR/faber/medium`;
const MODEL_SHA256 = '858555e3a064209c57088fe6bd70c4c3dc54d03eaa00c45d5ecaf43a33f95aa7';

async function exists(path: string) {
  try { await access(path); return true; } catch { return false; }
}

async function download(url: string, destination: string) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`Falha ao baixar ${url}: HTTP ${response.status}.`);
  const data = Buffer.from(await response.arrayBuffer());
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, data);
}

if (!(await exists(piperExecutable))) {
  const python = getPythonLauncher();
  await mkdir(dirname(piperVenv), { recursive: true });
  await run(python.command, [...python.args, '-m', 'venv', piperVenv], { cwd: workspaceRoot });
  const venvPython = process.platform === 'win32'
    ? `${piperVenv}\\Scripts\\python.exe`
    : `${piperVenv}/bin/python`;
  await run(venvPython, ['-m', 'pip', 'install', '--disable-pip-version-check', `piper-tts==${PIPER_VERSION}`], { cwd: workspaceRoot });
}

await mkdir(voiceRoot, { recursive: true });
if (!(await exists(voiceModel)) || (await stat(voiceModel)).size < 1_000_000) {
  await download(`${VOICE_BASE_URL}/pt_BR-faber-medium.onnx?download=true`, voiceModel);
}
if (!(await exists(voiceConfig))) {
  await download(`${VOICE_BASE_URL}/pt_BR-faber-medium.onnx.json?download=true`, voiceConfig);
}

const modelHash = await sha256(voiceModel);
if (modelHash !== MODEL_SHA256) {
  throw new Error(`Checksum inesperado para o modelo Piper: ${modelHash}.`);
}

console.log(`Piper ${PIPER_VERSION} e voz pt_BR-faber-medium disponíveis.`);

