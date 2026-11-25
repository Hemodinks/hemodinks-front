import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import type { PacienteFilters } from '../../appTypes';
import { listAuditoria } from '../../services';
import { DateInput } from '../../shared/components/DateInput';
import { AlertMessage, DataPanel, SelectField, TextField } from '../../shared/components/ui';
import { queryKeys } from '../../shared/queryKeys';
import { getErrorMessage, toDatePickerValue } from '../../shared/utils/formatters';
import type { AuthSession, Convenio, MedicalUserOption } from '../../types';
import { PatientFilters } from '../patients/PatientFilters';
import { emptyPacienteFilters, getPacienteFilterQuery } from '../patients/patientUtils';
import { AuditTrailTable } from './AuditTrailTable';
import { AUDIT_ACTION_OPTIONS } from './auditLabels';
import { AUDIT_PAGE_SIZES } from './AuditPagination';
import './audit.css';

type AuditExtraFilters = { search: string; acao: string; periodoInicio: string; periodoFim: string; somenteAlteracoes: boolean };
const emptyExtraFilters: AuditExtraFilters = { search: '', acao: '', periodoInicio: '', periodoFim: '', somenteAlteracoes: true };

type PatientAuditPageProps = {
  session: AuthSession;
  medicalUsers: MedicalUserOption[];
  convenios: Convenio[];
};

// Tela geral de auditoria (Administrador/SuperAdministrador): alterações de pacientes e atendimentos da
// clínica ativa, com os mesmos filtros de Pacientes - Cirurgias. A API restringe à clínica e ao perfil.
export function PatientAuditPage({ session, medicalUsers, convenios }: PatientAuditPageProps) {
  const [patientFilters, setPatientFilters] = useState<PacienteFilters>(emptyPacienteFilters);
  const [extra, setExtra] = useState<AuditExtraFilters>(emptyExtraFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(AUDIT_PAGE_SIZES[1]);

  // Situação e pendência não se aplicam (a auditoria cobre ativos e inativos): com esses valores o builder as omite.
  const filtros = {
    ...getPacienteFilterQuery({ ...patientFilters, situacao: 'ativos', pendenciaDataConsolidacao: false }),
    ...(extra.search.trim() ? { search: extra.search.trim() } : {}),
    ...(extra.acao ? { acao: extra.acao } : {}),
    ...(toDatePickerValue(extra.periodoInicio) ? { periodoInicio: toDatePickerValue(extra.periodoInicio) } : {}),
    ...(toDatePickerValue(extra.periodoFim) ? { periodoFim: toDatePickerValue(extra.periodoFim) } : {}),
    ...(extra.somenteAlteracoes ? { somenteAlteracoes: true } : {}),
  };
  const filtrosKey = JSON.stringify(filtros);
  const auditQuery = useQuery({
    queryKey: queryKeys.auditoriaGeral(session.token, page, `${pageSize}|${filtrosKey}`),
    queryFn: () => listAuditoria(session.token, page, pageSize, filtros),
    placeholderData: keepPreviousData,
    staleTime: 15 * 1000,
  });
  const data = auditQuery.data;

  // Filtro novo sempre volta para a primeira página.
  const changePatientFilters: typeof setPatientFilters = (update) => { setPage(1); setPatientFilters(update); };
  const changeExtra = (update: Partial<AuditExtraFilters>) => { setPage(1); setExtra((current) => ({ ...current, ...update })); };
  const clearFilters = () => { setPage(1); setPatientFilters(emptyPacienteFilters); setExtra(emptyExtraFilters); };

  return (
    <section className="audit-page" aria-labelledby="patient-audit-title">
      <DataPanel>
        <div className="panel-title">
          <div>
            <span className="eyebrow"><ShieldCheck size={14} aria-hidden="true" /> Pacientes - Cirurgias</span>
            <h2 id="patient-audit-title">Auditoria</h2>
            <p>Inclusões, alterações, inativações e reativações de pacientes e movimentações de atendimentos da clínica.</p>
          </div>
        </div>
      </DataPanel>

      <DataPanel>
        <PatientFilters pacienteFilters={patientFilters} medicalUsers={medicalUsers} convenios={convenios}
          isAdmin isTeam={false} showSituacao={false} onFiltersChange={changePatientFilters} onClearFilters={clearFilters}>
          <TextField className="filter-field" label="Paciente" type="search" value={extra.search} maxLength={120}
            placeholder="Nome ou CPF" onValueChange={(search) => changeExtra({ search })} />
          <SelectField className="filter-field" label="Ação" value={extra.acao} onChange={(event) => changeExtra({ acao: event.target.value })}>
            <option value="">Todas as ações</option>
            {AUDIT_ACTION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </SelectField>
          <DateInput id="audit-period-start" className="filter-field" label="Registro - de" value={extra.periodoInicio}
            max={extra.periodoFim || undefined} onChange={(periodoInicio) => changeExtra({ periodoInicio })} />
          <DateInput id="audit-period-end" className="filter-field" label="Registro - até" value={extra.periodoFim}
            min={extra.periodoInicio || undefined} onChange={(periodoFim) => changeExtra({ periodoFim })} />
          <label className="audit-only-changes filter-field">
            <input type="checkbox" checked={extra.somenteAlteracoes} onChange={(event) => changeExtra({ somenteAlteracoes: event.target.checked })} />
            Somente alterações (esconde consultas)
          </label>
        </PatientFilters>
      </DataPanel>

      <DataPanel>
        {auditQuery.isError && <AlertMessage type="error">{getErrorMessage(auditQuery.error)}</AlertMessage>}
        {auditQuery.isPending && <p role="status">Carregando auditoria...</p>}
        {data && !data.items.length && <p role="status">Nenhum registro encontrado para os filtros escolhidos.</p>}
        {data && data.items.length > 0 && (
          <AuditTrailTable items={data.items} label="Auditoria de pacientes" showPatient page={page} pageSize={pageSize}
            totalItems={data.totalItems} busy={auditQuery.isFetching} onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
        )}
      </DataPanel>
    </section>
  );
}
