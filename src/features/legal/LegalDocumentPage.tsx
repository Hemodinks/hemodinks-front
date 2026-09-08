import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthSession } from '../auth/useAuthSession';
import { LegalAcceptanceAction } from './LegalAcceptanceAction';
import { LegalFooter } from './LegalFooter';
import type { LegalDocument } from './legalDocuments';
import { PrivacyPolicyContent } from './PrivacyPolicyContent';
import { TermsOfUseContent } from './TermsOfUseContent';
import { useLegalAcceptance } from './useLegalAcceptance';
import './legal.css';

export function LegalDocumentPage({ document }: { document: LegalDocument }) {
  const navigate = useNavigate();
  const { session } = useAuthSession();
  const canAccept = Boolean(
    session && !session.user.precisaTrocarSenha && !session.user.precisaTrocarPin,
  );
  const legalAcceptance = useLegalAcceptance(canAccept ? session : null);

  const handleAccept = async () => {
    if (await legalAcceptance.accept()) navigate('/', { replace: true });
  };

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

        <LegalAcceptanceAction
          authenticated={canAccept}
          current={legalAcceptance.isCurrent}
          loading={canAccept && legalAcceptance.loading}
          accepting={legalAcceptance.accepting}
          error={canAccept ? legalAcceptance.error : ''}
          onAccept={handleAccept}
          onRetry={legalAcceptance.retry}
          showHeading
        />
      </article>
      <LegalFooter />
    </main>
  );
}
