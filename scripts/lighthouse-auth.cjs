// Restore a synthetic session through the existing API flow; never inject storage.
module.exports = async (browser, context) => {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.url().includes('/api/') && !response.ok()) errors.push(`API ${response.status()} ${new URL(response.url()).pathname}`);
  });
  try {
    await page.goto(context.url, { waitUntil: 'networkidle0' });
    const titles = { '/dashboard': 'Painel inicial', '/usuarios': 'Usuários', '/pacientes': 'Pacientes', '/agenda': 'Agenda e notificações' };
    await page.waitForFunction(title => [...document.querySelectorAll('h1')].some(h => h.textContent === title),
      { timeout: 15000 }, titles[new URL(context.url).pathname]);
    if (errors.length) throw new Error(errors.join('\n'));
  } finally {
    await page.close();
  }
};
