import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { getPageMetadata, PUBLIC_PATHS, SITE_URL } from './pageMetadata';
import { PageMetadata } from './usePageMetadata';
import { VIEW_PATHS } from '../routes';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PageMetadata />
    </MemoryRouter>,
  );
}

const headContent = (selector: string, attribute: string) =>
  document.head.querySelector(selector)?.getAttribute(attribute) ?? null;

afterEach(() => {
  document.head.innerHTML = '';
  document.title = '';
});

describe('getPageMetadata', () => {
  it('torna indexáveis somente a entrada e as páginas legais', () => {
    expect(PUBLIC_PATHS).toEqual(['/', '/termos-de-uso', '/politica-de-privacidade']);
    for (const path of PUBLIC_PATHS) {
      const metadata = getPageMetadata(path);
      expect(metadata.indexable).toBe(true);
      expect(metadata.canonical).toBe(`${SITE_URL}${path === '/' ? '/' : path}`);
      expect(metadata.description).toBeTruthy();
    }
  });

  it('não indexa telas internas nem caminhos desconhecidos', () => {
    for (const path of [...Object.values(VIEW_PATHS), '/configuracoes', '/qualquer-coisa']) {
      const metadata = getPageMetadata(path);
      expect(metadata.indexable, path).toBe(false);
      expect(metadata.canonical, path).toBeUndefined();
    }
  });

  it('ignora barra final', () => {
    expect(getPageMetadata('/termos-de-uso/').indexable).toBe(true);
  });
});

describe('PageMetadata', () => {
  it('aplica título, descrição, canonical e robots em página pública', () => {
    renderAt('/termos-de-uso');

    expect(document.title).toBe('Termos de Uso — HemoDinks');
    expect(headContent('meta[name="robots"]', 'content')).toBe('index, follow');
    expect(headContent('meta[name="description"]', 'content')).toContain('HemoDinks');
    expect(headContent('link[rel="canonical"]', 'href')).toBe(`${SITE_URL}/termos-de-uso`);
  });

  it('marca noindex e remove canonical em tela interna', () => {
    renderAt('/pacientes');

    expect(document.title).toBe('HemoDinks');
    expect(headContent('meta[name="robots"]', 'content')).toBe('noindex, nofollow');
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.head.querySelector('meta[name="description"]')).toBeNull();
  });
});
