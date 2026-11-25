import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, History } from 'lucide-react';
import { useState } from 'react';
import { getAuditoriaConfiguracao, updateAuditoriaConfiguracao } from '../../services';
import { AlertMessage, DataPanel, ToastMessage } from '../../shared/components/ui';
import { queryKeys } from '../../shared/queryKeys';
import { getErrorMessage } from '../../shared/utils/formatters';
import type { AuthSession } from '../../types';

// Opções → Configurações (Administrador/SuperAdministrador): liga o registro de alterações (antes/depois)
// de pacientes e atendimentos na trilha. Inativações e reativações são sempre auditadas. Vale para a clínica ativa.
export function AuditSettingsPanel({ session }: { session: AuthSession }) {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState('');
  const configQuery = useQuery({
    queryKey: queryKeys.auditoriaConfiguracao(session.token),
    queryFn: () => getAuditoriaConfiguracao(session.token),
  });
  const mutation = useMutation({
    mutationFn: (auditarAtendimentos: boolean) => updateAuditoriaConfiguracao(session.token, { auditarAtendimentos }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.auditoriaConfiguracao(session.token), data);
      setSuccess(data.auditarAtendimentos
        ? 'Auditoria de atendimentos ativada para a clínica.'
        : 'Auditoria de atendimentos desativada para a clínica.');
    },
  });
  const enabled = configQuery.data?.auditarAtendimentos ?? false;
  const busy = configQuery.isPending || mutation.isPending;

  return (
    <DataPanel className="system-settings-panel">
      <div className="settings-section-heading">
        <span className="settings-section-icon" aria-hidden="true"><History size={19} /></span>
        <div>
          <span className="eyebrow">Auditoria</span>
          <h3>Auditoria de atendimentos</h3>
        </div>
      </div>
      <p>
        Inativações e reativações de pacientes são sempre registradas, com o motivo. Ative para registrar também
        cada alteração em pacientes e atendimentos (consolidação, pagamento, valores, glosa, hospital, convênio,
        cirurgião, auxiliares, fornecedor), com o valor antes e depois. Textos clínicos aparecem só como “alterado”.
      </p>
      {success && <ToastMessage type="success" icon={<CheckCircle2 size={17} />}>{success}</ToastMessage>}
      {configQuery.isError && <AlertMessage type="error">{getErrorMessage(configQuery.error)}</AlertMessage>}
      {mutation.isError && <AlertMessage type="error">{getErrorMessage(mutation.error)}</AlertMessage>}
      <label className="audit-settings-toggle">
        <input type="checkbox" role="switch" checked={enabled} disabled={busy || configQuery.isError}
          onChange={(event) => { setSuccess(''); mutation.mutate(event.target.checked); }} />
        Auditar alterações de pacientes e atendimentos
      </label>
    </DataPanel>
  );
}
