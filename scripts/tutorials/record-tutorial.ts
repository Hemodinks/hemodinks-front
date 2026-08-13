import { run } from './process-utils';

const requested = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
if (requested.length !== 1) throw new Error('Informe exatamente um tutorial, por exemplo: npm run tutorial:record -- reports.');
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Execute este comando por npm para que npm_execpath esteja disponível.');
const npm = (args: string[]) => run(process.execPath, [npmCli, ...args]);
await npm(['run', 'tutorial:audit']);
if (['reports', 'reports-analytics'].includes(requested[0])) {
  await npm(['run', 'record:tutorials:reports:local']);
  await npm(['run', 'tutorial:compose:reports']);
} else {
  await npm(['run', 'tutorial:record:library', '--', '--grep', `grava biblioteca sanitizada: ${requested[0]}$`]);
  await npm(['run', 'tutorial:compose:library', '--', requested[0]]);
}
