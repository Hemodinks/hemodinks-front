import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { getPacienteAuditoria } from '../../../services';
import { AlertMessage } from '../../../shared/components/ui';
import { queryKeys } from '../../../shared/queryKeys';
import { getErrorMessage } from '../../../shared/utils/formatters';
import { AuditTrailTable } from '../../audit/AuditTrailTable';

export { formatAuditDate, getAuditActionLabel } from '../../audit/auditLabels';

const PAGE_SIZE = 20;

type Props = { pacienteId: number; sessionToken: string };

// Aba "Trilha de auditoria" da ficha (#315): acessos, alterações, inativações e atendimentos do paciente.
// Só é montada quando a aba é aberta, então só então consulta a API.
export function PatientAuditSection({ pacienteId, sessionToken }: Props) {
  const [page, setPage] = useState(1);
  const auditQuery = useQuery({
    queryKey: queryKeys.pacienteAuditoria(sessionToken, pacienteId, page),
    queryFn: () => getPacienteAuditoria(pacienteId, sessionToken, page, PAGE_SIZE),
    staleTime: 15 * 1000,
  });
  const data = auditQuery.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.totalItems / data.pageSize)) : 1;

  return (
    <div className="patient-audit-content">
      {auditQuery.isError && <AlertMessage type="error">{getErrorMessage(auditQuery.error)}</AlertMessage>}
      {auditQuery.isPending && <p role="status">Carregando trilha de auditoria...</p>}
      {data && !data.items.length && <p role="status">Nenhum registro de acesso para este paciente.</p>}
      {data && data.items.length > 0 && (
        <AuditTrailTable items={data.items} label="Trilha de auditoria do paciente" page={page} totalPages={totalPages}
          busy={auditQuery.isFetching} onPageChange={setPage} />
      )}
    </div>
  );
}
