import { useEffect, useState } from 'react';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';

type Props = { waiting: boolean; empty: boolean; onRetry: () => void };

export function LoginPreparation({ waiting, empty, onRetry }: Props) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    if (!waiting) return;
    const timer = window.setTimeout(() => setSlow(true), 12_000);
    return () => window.clearTimeout(timer);
  }, [waiting]);

  return <LoadingOverlay active className="login-initial-loading" eyebrow="Bem-vindo ao HemoDinks"
    message={<div className="login-initial-loading-copy">
      <strong>{waiting ? 'Preparando o acesso ao sistema…' : 'Ainda não foi possível preparar o acesso'}</strong>
      <p>{waiting
        ? 'Estamos conectando ao serviço e carregando as clínicas. Assim que estiver pronto, você poderá informar seu e-mail e senha.'
        : empty ? 'Não há clínicas disponíveis para acesso neste momento.'
          : 'O serviço ainda não respondeu. Você pode tentar conectar novamente, sem precisar preencher seus dados.'}</p>
      {waiting && slow && <small>Está levando mais tempo que o habitual. O serviço pode estar iniciando após um período sem uso. Continuamos tentando conectar automaticamente.</small>}
      {waiting
        ? <div className="bootstrap-progress" role="progressbar" aria-label="Preparando acesso e carregando clínicas" aria-busy="true" />
        : <button type="button" className="primary-action" onClick={onRetry}>Tentar conectar novamente</button>}
    </div>}
  />;
}
