export type LegalDocument = {
  slug: 'termos-de-uso' | 'politica-de-privacidade';
  title: string;
  version: string;
  updatedAt: string;
  introduction: string;
  sections: Array<{ title: string; paragraphs: string[] }>;
};

export const LEGAL_DOCUMENTS: Record<LegalDocument['slug'], LegalDocument> = {
  'termos-de-uso': {
    slug: 'termos-de-uso',
    title: 'Termos de Uso',
    version: TERMS_VERSION,
    updatedAt: '3 de setembro de 2026',
    introduction: '',
    sections: [],
  },
  'politica-de-privacidade': {
    slug: 'politica-de-privacidade',
    title: 'Aviso de Privacidade do HemoDinks',
    version: PRIVACY_NOTICE_VERSION,
    updatedAt: '3 de setembro de 2026',
    introduction: '',
    sections: [],
  },
};
import { PRIVACY_NOTICE_VERSION, TERMS_VERSION } from './legalVersions';
