import { useEffect, useState } from 'react';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';

type Props = { active: boolean; onCancel: () => void; stage?: string };

export function LoginLoadingOverlay({ active, onCancel, stage = 'Conectando ao serviço de acesso…' }: Props) {
  const [waitStage, setWaitStage] = useState(0);
  useEffect(() => {
    setWaitStage(0);
    if (!active) return;
    const slow = window.setTimeout(() => setWaitStage(1), 12_000);
    const long = window.setTimeout(() => setWaitStage(2), 35_000);
    return () => { window.clearTimeout(slow); window.clearTimeout(long); };
  }, [active]);

  return <LoadingOverlay active={active} className="login-initial-loading" eyebrow="Acessando o HemoDinks"
    message={<div className="login-initial-loading-copy">
      <strong>{waitStage === 0 ? stage : 'Seu acesso ainda está sendo preparado'}</strong>
      <p>{waitStage === 0
        ? 'Estamos verificando seu acesso. Aguarde um momento.'
        : 'O primeiro acesso após um período sem uso pode levar mais tempo enquanto o serviço inicia.'}</p>
      {waitStage === 2 && <small>Ainda estamos aguardando uma resposta. Você pode continuar esperando ou cancelar e tentar novamente em instantes.</small>}
      <div className="bootstrap-progress" role="progressbar" aria-label="Aguardando resposta do serviço de acesso" aria-busy="true" />
      <button type="button" className="ghost-button" onClick={onCancel}>Cancelar tentativa</button>
    </div>}
  />;
}
