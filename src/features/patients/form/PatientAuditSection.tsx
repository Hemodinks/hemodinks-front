import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { getPacienteAuditoria } from '../../../services';
import { AlertMessage, Button } from '../../../shared/components/ui';
import { queryKeys } from '../../../shared/queryKeys';
import { getErrorMessage } from '../../../shared/utils/formatters';
import type { AuditoriaClinicaItem } from '../../../types';

const PAGE_SIZE = 20;

const ACTION_LABELS: Record<string, string> = {
  'paciente.listar': 'Consultou a lista de pacientes',
  'paciente.ler': 'Visualizou o cadastro',
  'paciente.criar': 'Cadastrou o paciente',
  'paciente.editar': 'Editou o cadastro',
  'paciente.inativar': 'Inativou o paciente',
  'paciente.reativar': 'Reativou o paciente',
  'paciente.resumo-financeiro': 'Consultou o resumo financeiro',
  'arquivo.enviar': 'Enviou arquivo',
  'arquivo.baixar': 'Baixou arquivo',
  'arquivo.excluir': 'Excluiu arquivo',
  'observacao.listar': 'Leu observações',
  'observacao.criar': 'Registrou observação',
  'observacao.marcar-lidas': 'Marcou observações como lidas',
};

export function getAuditActionLabel(action: string) {
  return ACTION_LABELS[action] ?? action;
}

// A API guarda UTC; sem fuso explicito o navegador leria como horario local.
export function formatAuditDate(value: string) {
  const iso = /[zZ]$|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pt-BR');
}

function describeActor(item: AuditoriaClinicaItem) {
  const user = item.usuarioNome ?? (item.usuarioId ? `Usuário #${item.usuarioId}` : 'Não identificado');
  if (!item.equipeOperadorId) return user;
  const operator = item.equipeOperadorNome ?? `operador #${item.equipeOperadorId}`;
  return `${user} (operador: ${operator})`;
}

type Props = { pacienteId: number; sessionToken: string };

// Trilha de acesso ao paciente (#315). So consulta a API quando a secao e aberta.
export function PatientAuditSection({ pacienteId, sessionToken }: Props) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const auditQuery = useQuery({
    queryKey: queryKeys.pacienteAuditoria(sessionToken, pacienteId, page),
    queryFn: () => getPacienteAuditoria(pacienteId, sessionToken, page, PAGE_SIZE),
    enabled: open,
    staleTime: 15 * 1000,
  });
  const data = auditQuery.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.totalItems / data.pageSize)) : 1;

  return (
    <details className="patient-audit" onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>Ver quem acessou ou alterou este paciente</summary>
      {open && <div className="patient-audit-content">
        {auditQuery.isError && <AlertMessage type="error">{getErrorMessage(auditQuery.error)}</AlertMessage>}
        {auditQuery.isPending && <p role="status">Carregando trilha de auditoria...</p>}
        {data && !data.items.length && <p role="status">Nenhum registro de acesso para este paciente.</p>}
        {data && data.items.length > 0 && <>
          <div className="table-wrap">
            <table aria-label="Trilha de auditoria do paciente">
              <thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Resultado</th><th>IP</th></tr></thead>
              <tbody>{data.items.map((item) => <tr key={item.id}>
                <td data-label="Quando">{formatAuditDate(item.dataUtc)}</td>
                <td data-label="Quem">{describeActor(item)}</td>
                <td data-label="Ação">{getAuditActionLabel(item.acao)}</td>
                <td data-label="Resultado"><span className={`status-pill ${item.sucesso ? 'ok' : 'warning'}`}>
                  {item.sucesso ? 'Sucesso' : `Negado/erro (${item.statusCode})`}</span></td>
                <td data-label="IP">{item.ipTruncado ?? '-'}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className="pagination-bar patient-audit-pagination" role="group" aria-label="Paginação da trilha de auditoria">
            <Button disabled={page <= 1 || auditQuery.isFetching} onClick={() => setPage((current) => Math.max(1, current - 1))}>Anterior</Button>
            <span>Página {page} de {totalPages}</span>
            <Button disabled={page >= totalPages || auditQuery.isFetching} onClick={() => setPage((current) => current + 1)}>Próxima</Button>
          </div>
        </>}
      </div>}
    </details>
  );
}
