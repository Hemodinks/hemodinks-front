import { useAppUpdate } from '../hooks/useAppUpdate';
import { useConfirmationDialog } from './ConfirmationDialog';
import { Button } from './ui';
import './app-update.css';

export function AppUpdateNotice() {
  const available = useAppUpdate();
  const { confirmAction, confirmationDialog } = useConfirmationDialog();
  if (!available) return null;

  return <>
    <div className="app-update-notice" role="status">
      <span>Uma nova versão do sistema está disponível. Salve seu trabalho antes de atualizar.</span>
      <Button variant="primary" onClick={() => confirmAction({
        tone: 'update',
        title: 'Atualizar sistema?',
        message: 'A página será recarregada. Dados ainda não salvos serão perdidos.',
        confirmLabel: 'Atualizar agora',
        cancelLabel: 'Continuar trabalhando',
        onConfirm: () => window.location.reload(),
      })}>Atualizar sistema</Button>
    </div>
    <div className="app-update-dialog">{confirmationDialog}</div>
  </>;
}
