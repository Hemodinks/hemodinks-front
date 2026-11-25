import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { getPacienteAuditoria } from '../../../services';
import { AlertMessage } from '../../../shared/components/ui';
import { queryKeys } from '../../../shared/queryKeys';
import { getErrorMessage } from '../../../shared/utils/formatters';
import { AuditTrailTable } from '../../audit/AuditTrailTable';
import { AUDIT_PAGE_SIZES } from '../../audit/AuditPagination';

export { formatAuditDate, getAuditActionLabel } from '../../audit/auditLabels';

type Props = { pacienteId: number; sessionToken: string };

// Aba "Trilha de auditoria" da ficha (#315): acessos, alterações, inativações e atendimentos do paciente.
// Só é montada quando a aba é aberta, então só então consulta a API.
export function PatientAuditSection({ pacienteId, sessionToken }: Props) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(AUDIT_PAGE_SIZES[1]);
  const auditQuery = useQuery({
    queryKey: queryKeys.pacienteAuditoria(sessionToken, pacienteId, page, pageSize),
    queryFn: () => getPacienteAuditoria(pacienteId, sessionToken, page, pageSize),
    placeholderData: keepPreviousData,
    staleTime: 15 * 1000,
  });
  const data = auditQuery.data;

  return (
    <div className="patient-audit-content">
      {auditQuery.isError && <AlertMessage type="error">{getErrorMessage(auditQuery.error)}</AlertMessage>}
      {auditQuery.isPending && <p role="status">Carregando trilha de auditoria...</p>}
      {data && !data.items.length && <p role="status">Nenhum registro de acesso para este paciente.</p>}
      {data && data.items.length > 0 && (
        <AuditTrailTable items={data.items} label="Trilha de auditoria do paciente" page={page} pageSize={pageSize}
          totalItems={data.totalItems} busy={auditQuery.isFetching} onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
      )}
    </div>
  );
}
