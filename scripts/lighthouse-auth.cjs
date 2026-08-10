const session = {
  token: 'lighthouse-token',
  user: {
    id: 99,
    nome: 'Lighthouse Admin',
    email: 'lighthouse@hemodinks.local',
    cpf: '00000000191',
    fotoPerfil: null,
    precisaTrocarSenha: false,
    perfilId: 1,
    perfilNome: 'Administrador',
  },
};

module.exports = async (browser, context) => {
  const page = await browser.newPage();
  const origin = new URL(context.url).origin;

  try {
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await page.evaluate((storedSession) => {
      localStorage.setItem('hemodinks.session', JSON.stringify(storedSession));
    }, session);
  } finally {
    await page.close();
  }
};
