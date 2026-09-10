import { useEffect, useRef } from 'react';
import { LoadingOverlay } from './LoadingOverlay';

type Props = {
  active: boolean;
  stage: string;
  slow: boolean;
  canRetry: boolean;
  onRetry: () => Promise<void>;
};

export function BootstrapLoading({ active, stage, slow, canRetry, onRetry }: Props) {
  const retryButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (active && canRetry) retryButton.current?.focus();
  }, [active, canRetry]);
  return <LoadingOverlay active={active} className="login-initial-loading" eyebrow="Iniciando o sistema"
    message={<div className="login-initial-loading-copy">
      <strong>Preparando seu ambiente</strong>
      <p>Estamos carregando as informações necessárias para seu acesso.</p>
      <span className="login-initial-loading-step" aria-atomic="true">{stage}</span>
      <div className="bootstrap-progress" role="progressbar" aria-label={stage} aria-busy="true" />
      {slow && <small>A inicialização está levando um pouco mais de tempo que o normal.</small>}
      {canRetry && <button ref={retryButton} type="button" className="ghost-button" onClick={() => void onRetry()}>Tentar novamente</button>}
    </div>}
  />;
}
