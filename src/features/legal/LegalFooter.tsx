import { Link } from 'react-router-dom';
import { useConsent } from '../privacy/ConsentProvider';

export function LegalFooter({ className = '' }: { className?: string }) {
  const { openPreferences } = useConsent();

  return (
    <footer className={`legal-footer ${className}`.trim()} aria-label="Links legais">
      <Link to="/termos-de-uso">Termos de Uso</Link>
      <Link to="/politica-de-privacidade">Política de Privacidade</Link>
      <button type="button" onClick={openPreferences}>Configurar cookies</button>
    </footer>
  );
}
