import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAppUpdate } from '../hooks/useAppUpdate';
import { Modal } from './Modal';
import { Button } from './ui';
import './app-update.css';

// Aviso de nova versão: faixa discreta no topo e confirmação centralizada. Nunca recarrega sozinho.
export function AppUpdateNotice() {
  const available = useAppUpdate();
  const [confirming, setConfirming] = useState(false);
  const [reloading, setReloading] = useState(false);
  if (!available) return null;

  const reload = () => {
    setReloading(true);
    window.location.reload();
  };

  return <>
    <div className="app-update-notice" role="status">
      <span className="app-update-notice-icon" aria-hidden="true"><RefreshCw size={18} /></span>
      <p className="app-update-notice-copy">
        <strong>Nova versão disponível.</strong> <span>Salve seu trabalho antes de atualizar.</span>
      </p>
      <Button variant="primary" className="app-update-notice-action" onClick={() => setConfirming(true)}>
        <RefreshCw size={16} aria-hidden="true" />Atualizar sistema
      </Button>
    </div>
    {confirming && (
      <Modal titleId="app-update-title" descriptionId="app-update-description" className="app-update-modal"
        backdropClassName="app-update-backdrop" onClose={() => { if (!reloading) setConfirming(false); }}>
        <span className="app-update-modal-icon" aria-hidden="true"><RefreshCw size={26} /></span>
        <div className="app-update-modal-copy">
          <span className="eyebrow">Nova versão disponível</span>
          <h2 id="app-update-title">Atualizar sistema?</h2>
          <p id="app-update-description">
            A página será recarregada com a nova versão. Dados ainda não salvos serão perdidos.
          </p>
        </div>
        <div className="app-update-modal-actions">
          <Button variant="ghost" disabled={reloading} onClick={() => setConfirming(false)}>Continuar trabalhando</Button>
          <Button variant="primary" disabled={reloading} onClick={reload}>
            <RefreshCw size={16} aria-hidden="true" />{reloading ? 'Atualizando...' : 'Atualizar agora'}
          </Button>
        </div>
      </Modal>
    )}
  </>;
}
