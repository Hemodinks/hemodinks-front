import { pathToFileURL } from 'node:url';

const TEST_JOBS = ['unit', 'e2e', 'responsive'];

// Decides the required "Test and build" check. Anything unexpected fails closed.
export function gateDecision({ scope, runTests, ...jobs }) {
  if (scope !== 'success') return { ok: false, reason: `scope job ended as ${scope || 'unknown'}` };
  if (runTests === 'false') {
    const ran = TEST_JOBS.filter(job => jobs[job] !== 'skipped');
    return ran.length
      ? { ok: false, reason: `scope skipped tests but ${ran.join(', ')} did not skip` }
      : { ok: true, reason: 'this exact tree already passed the test jobs' };
  }
  if (runTests !== 'true') return { ok: false, reason: `unexpected scope output ${runTests || 'empty'}` };
  const failed = TEST_JOBS.filter(job => jobs[job] !== 'success');
  return failed.length
    ? { ok: false, reason: `test jobs did not pass: ${failed.map(job => `${job}=${jobs[job] || 'unknown'}`).join(', ')}` }
    : { ok: true, reason: 'all test jobs passed' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { ok, reason } = gateDecision({
    scope: process.env.SCOPE_RESULT,
    runTests: process.env.RUN_TESTS,
    unit: process.env.UNIT_RESULT,
    e2e: process.env.E2E_RESULT,
    responsive: process.env.RESPONSIVE_RESULT,
  });
  if (ok) console.log(`Test and build: ${reason}.`);
  else {
    console.error(`::error::Test and build blocked: ${reason}.`);
    process.exitCode = 1;
  }
}
