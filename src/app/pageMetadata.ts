export const SITE_URL = 'https://hemodinks.gestao-saude.tec.br';

export const DEFAULT_TITLE = 'HemoDinks';

export type PageMetadata = {
  title: string;
  description?: string;
  /** URL canônica absoluta; ausente em páginas que não devem ser indexadas. */
  canonical?: string;
  indexable: boolean;
};

const PUBLIC_PAGES: Record<string, Omit<PageMetadata, 'indexable'>> = {
  '/': {
    title: 'HemoDinks — Gestão de cirurgias para clínicas',
    description:
      'Acesse o HemoDinks, plataforma SaaS multiclínica para gestão de cirurgias, faturamento e relatórios, com segurança e isolamento dos dados de cada clínica.',
    canonical: `${SITE_URL}/`,
  },
  '/termos-de-uso': {
    title: 'Termos de Uso — HemoDinks',
    description: 'Condições de acesso e utilização da plataforma HemoDinks pelos usuários das clínicas contratantes.',
    canonical: `${SITE_URL}/termos-de-uso`,
  },
  '/politica-de-privacidade': {
    title: 'Aviso de Privacidade — HemoDinks',
    description: 'Como o HemoDinks trata e protege dados pessoais e quais são os direitos dos titulares, conforme a LGPD.',
    canonical: `${SITE_URL}/politica-de-privacidade`,
  },
};

export const PUBLIC_PATHS = Object.keys(PUBLIC_PAGES);

function normalizePath(pathname: string) {
  return pathname.replace(/\/+$/, '') || '/';
}

/**
 * Metadados de SEO por rota. Somente a entrada (login) e as páginas legais são
 * indexáveis; telas internas recebem noindex e não expõem canonical.
 */
export function getPageMetadata(pathname: string): PageMetadata {
  const page = PUBLIC_PAGES[normalizePath(pathname)];

  return page ? { ...page, indexable: true } : { title: DEFAULT_TITLE, indexable: false };
}
