import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getPageMetadata } from './pageMetadata';

function upsertHeadElement<T extends HTMLElement>(selector: string, create: () => T): T {
  const existing = document.head.querySelector<T>(selector);
  if (existing) return existing;

  const element = create();
  document.head.appendChild(element);
  return element;
}

function setMeta(name: string, content: string | undefined) {
  const selector = `meta[name="${name}"]`;
  if (content == null) {
    document.head.querySelector(selector)?.remove();
    return;
  }

  upsertHeadElement(selector, () => {
    const meta = document.createElement('meta');
    meta.name = name;
    return meta;
  }).content = content;
}

function setCanonical(href: string | undefined) {
  const selector = 'link[rel="canonical"]';
  if (href == null) {
    document.head.querySelector(selector)?.remove();
    return;
  }

  upsertHeadElement(selector, () => {
    const link = document.createElement('link');
    link.rel = 'canonical';
    return link;
  }).href = href;
}

/** Mantém título, descrição, canonical e robots do documento alinhados à rota atual. */
export function usePageMetadata() {
  const { pathname } = useLocation();

  useEffect(() => {
    const metadata = getPageMetadata(pathname);

    document.title = metadata.title;
    setMeta('description', metadata.description);
    setMeta('robots', metadata.indexable ? 'index, follow' : 'noindex, nofollow');
    setCanonical(metadata.canonical);
  }, [pathname]);
}

export function PageMetadata() {
  usePageMetadata();
  return null;
}
