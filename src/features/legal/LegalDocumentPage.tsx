import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LegalFooter } from './LegalFooter';
import type { LegalDocument } from './legalDocuments';
import { PrivacyPolicyContent } from './PrivacyPolicyContent';
import { TermsOfUseContent } from './TermsOfUseContent';
import './legal.css';

export function LegalDocumentPage({ document }: { document: LegalDocument }) {
  return (
    <main className="legal-page">
      <article className="legal-document">
        <Link className="legal-back-link" to="/"><ArrowLeft size={17} />Voltar ao acesso</Link>
        <header className="legal-document-header">
          <span className="eyebrow">HemoDinks</span>
          <h1>{document.title}</h1>
        </header>

        {document.slug === 'politica-de-privacidade'
          ? <PrivacyPolicyContent />
          : <TermsOfUseContent />}
      </article>
      <LegalFooter />
    </main>
  );
}
