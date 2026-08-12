import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export async function run(command: string, args: string[], options: { cwd?: string; input?: string } = {}) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: process.env,
      stdio: [options.input == null ? 'inherit' : 'pipe', 'inherit', 'inherit'],
      windowsHide: true,
    });
    if (options.input != null) {
      child.stdin.end(options.input, 'utf8');
    }
    child.once('error', reject);
    child.once('exit', (code) => code === 0
      ? resolve()
      : reject(new Error(`${command} terminou com código ${code ?? 'desconhecido'}.`)));
  });
}

export async function capture(command: string, args: string[], cwd?: string) {
  return new Promise<{ stdout: string; stderr: string; code: number }>((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: process.env, windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
    child.once('error', reject);
    child.once('exit', (code) => resolve({ stdout, stderr, code: code ?? -1 }));
  });
}

export async function sha256(path: string) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

export function getPythonLauncher() {
  return process.platform === 'win32'
    ? { command: 'py', args: [] }
    : { command: 'python3', args: [] };
}
