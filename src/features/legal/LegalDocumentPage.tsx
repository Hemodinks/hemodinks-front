import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LegalFooter } from './LegalFooter';
import type { LegalDocument } from './legalDocuments';
import { PrivacyPolicyContent } from './PrivacyPolicyContent';
import './legal.css';

export function LegalDocumentPage({ document }: { document: LegalDocument }) {
  return (
    <main className="legal-page">
      <article className="legal-document">
        <Link className="legal-back-link" to="/"><ArrowLeft size={17} />Voltar ao acesso</Link>
        <header className="legal-document-header">
          <span className="eyebrow">HemoDinks</span>
          <h1>{document.title}</h1>
          {document.slug !== 'politica-de-privacidade' && <>
            <p className="legal-document-meta">Última atualização: {document.updatedAt} · Versão {document.version}</p>
            <p>{document.introduction}</p>
          </>}
        </header>

        {document.slug === 'politica-de-privacidade'
          ? <PrivacyPolicyContent />
          : (
          <div className="legal-document-sections">
            {document.sections.map((section) => (
              <section key={section.title}>
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </section>
            ))}
          </div>
          )}
      </article>
      <LegalFooter />
    </main>
  );
}
