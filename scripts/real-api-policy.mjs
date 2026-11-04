export function assertSyntheticFixture(fixture) {
  if (fixture?.apiUrl !== 'http://127.0.0.1:5193'
    || !fixture.a?.id || !fixture.b?.id || fixture.a.id === fixture.b.id
    || !fixture.multiEmail?.endsWith('@example.invalid')) {
    throw new Error('Invalid synthetic fixture; remote targets are forbidden.');
  }
  return fixture;
}

export function assertRealApiResults(report) {
  const { expected = 0, unexpected = 0, skipped = 0, flaky = 0 } = report.stats ?? {};
  if (expected !== 9 || unexpected || skipped || flaky) {
    throw new Error(`Real API gate rejected results: passed=${expected}, failed=${unexpected}, skipped=${skipped}, flaky=${flaky}`);
  }
  const specs = [];
  function visit(suite) {
    specs.push(...(suite.specs ?? []));
    for (const child of suite.suites ?? []) visit(child);
  }
  for (const suite of report.suites ?? []) visit(suite);
  const cases = ['login', 'sessão', 'pacientes', 'multi-clínica', 'IDOR', 'faturamento', 'exportações', 'equipes', 'agenda'];
  if (specs.length !== cases.length || cases.some(name => specs.filter(spec => spec.title.startsWith(`${name}:`)).length !== 1)
    || specs.some(spec => spec.tests?.length !== 1 || spec.tests[0].results?.length !== 1
      || spec.tests[0].results[0].status !== 'passed' || spec.tests[0].results[0].retry !== 0)) {
    throw new Error('Real API gate requires each of the nine scenarios exactly once, without retries.');
  }
}
