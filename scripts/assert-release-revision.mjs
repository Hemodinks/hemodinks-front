import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function assertReleaseRevision({ eventName, ref, sha, repository }, readHead) {
  if (!['push', 'workflow_dispatch'].includes(eventName) || ref !== 'refs/heads/main') {
    throw new Error('Production requires a main push or manual CI run.');
  }
  if (!/^[a-f0-9]{40}$/.test(sha ?? '') || !/^[\w.-]+\/[\w.-]+$/.test(repository ?? '')) {
    throw new Error('Invalid release revision or repository.');
  }
  if (readHead(repository).trim() !== sha) {
    throw new Error('Release revision is no longer the main head; run CI for the current main.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    assertReleaseRevision({
      eventName: process.env.GITHUB_EVENT_NAME,
      ref: process.env.GITHUB_REF,
      sha: process.env.GITHUB_SHA,
      repository: process.env.GITHUB_REPOSITORY,
    }, repository => execFileSync('gh', [
      'api', `repos/${repository}/git/ref/heads/main`, '--jq', '.object.sha',
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  } catch {
    console.error('::error::Release revision verification failed. Production upload is blocked.');
    process.exitCode = 1;
  }
}
