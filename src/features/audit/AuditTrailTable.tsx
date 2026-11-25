import type { AuditoriaClinicaItem } from '../../types';
import { AuditPagination } from './AuditPagination';
import {
  describeAuditActor, formatAuditDate, getAuditActionLabel, getAuditFieldLabel, getAuditValueLabel, parseAuditDetail,
} from './auditLabels';
import './audit.css';

function AuditDetail({ detalhe }: { detalhe: string | null | undefined }) {
  const parsed = parseAuditDetail(detalhe);
  if (!parsed || (!parsed.motivo && !parsed.alteracoes?.length)) return <span className="audit-detail-empty">-</span>;
  return (
    <div className="audit-detail">
      {parsed.motivo && <p className="audit-detail-reason"><strong>Motivo:</strong> {parsed.motivo}</p>}
      {parsed.alteracoes && parsed.alteracoes.length > 0 && (
        <ul className="audit-detail-changes">
          {parsed.alteracoes.map((change, index) => (
            <li key={`${change.campo}-${index}`}>
              <strong>{getAuditFieldLabel(change.campo)}:</strong>{' '}
              {change.textoAlterado
                ? <span className="audit-detail-text-changed">alterado</span>
                : <><span className="audit-detail-old">{getAuditValueLabel(change.de)}</span>
                  {' → '}<span className="audit-detail-new">{getAuditValueLabel(change.para)}</span></>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type AuditTrailTableProps = {
  items: AuditoriaClinicaItem[];
  label: string;
  showPatient?: boolean;
  page: number;
  pageSize: number;
  totalItems: number;
  busy: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export function AuditTrailTable({ items, label, showPatient = false, page, pageSize, totalItems, busy, onPageChange,
  onPageSizeChange }: AuditTrailTableProps) {
  return (
    <>
      <div className="table-wrap audit-table-wrap">
        <table className="audit-table" aria-label={label}>
          <thead>
            <tr>
              <th>Quando</th>
              {showPatient && <th>Paciente</th>}
              <th>Quem</th>
              <th>Ação</th>
              <th>Detalhes</th>
              <th>Resultado</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td data-label="Quando">{formatAuditDate(item.dataUtc)}</td>
                {showPatient && <td data-label="Paciente">{item.pacienteNome ?? (item.pacienteId ? `Paciente #${item.pacienteId}` : '-')}</td>}
                <td data-label="Quem">{describeAuditActor(item)}</td>
                <td data-label="Ação">{getAuditActionLabel(item.acao)}</td>
                <td data-label="Detalhes"><AuditDetail detalhe={item.detalhe} /></td>
                <td data-label="Resultado">
                  <span className={`status-pill ${item.sucesso ? 'ok' : 'warning'}`}>
                    {item.sucesso ? 'Sucesso' : `Negado/erro (${item.statusCode})`}
                  </span>
                </td>
                <td data-label="IP">{item.ipTruncado ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AuditPagination label={label} page={page} pageSize={pageSize} totalItems={totalItems} busy={busy}
        onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />
    </>
  );
}
