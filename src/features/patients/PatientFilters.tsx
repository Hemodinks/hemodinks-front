import { X } from 'lucide-react';
import { DateInput } from '../../shared/components/DateInput';
import { Button, MultiSelectComboboxField, TextField } from '../../shared/components/ui';
import type { PatientListProps } from './patientListTypes';

type PatientFiltersProps = Pick<PatientListProps,
  'pacienteFilters' | 'medicalUsers' | 'convenios' | 'isAdmin' | 'isTeam' | 'onFiltersChange' | 'onClearFilters'
>;

export function PatientFilters({ pacienteFilters, medicalUsers, convenios, isAdmin, isTeam, onFiltersChange, onClearFilters }: PatientFiltersProps) {
  const canUseExtendedFilters = isAdmin || isTeam;
  return (
    <div className="patient-filter-grid" aria-label="Filtros de pacientes e cirurgias">
      {canUseExtendedFilters && <>
        <MultiSelectComboboxField className="filter-field" label="Cirurgião" values={pacienteFilters.medicoUserIds.map(String)}
          options={medicalUsers.map((user) => ({ value: String(user.id), label: user.nome }))}
          onValuesChange={(values) => onFiltersChange((current) => ({ ...current, medicoUserIds: values.map(Number).filter(Number.isInteger) }))}
          disabled={!medicalUsers.length} allOptionLabel={isTeam ? 'Toda a equipe' : 'Todos os cirurgiões'}
          placeholder={medicalUsers.length ? (isTeam ? 'Toda a equipe' : 'Todos os cirurgiões') : 'Nenhum médico disponível'} />
        <MultiSelectComboboxField className="filter-field" label="Convênio" values={pacienteFilters.convenioIds.map(String)}
          options={convenios.map((item) => ({ value: String(item.idConvenio), label: item.descricaoConvenio }))}
          onValuesChange={(values) => onFiltersChange((current) => ({ ...current, convenioIds: values.map(Number).filter(Number.isInteger) }))}
          disabled={!convenios.length} allOptionLabel="Todos os convênios"
          placeholder={convenios.length ? 'Todos os convênios' : 'Nenhum convênio cadastrado'} />
        <TextField className="filter-field" label="Procedimento" type="search" value={pacienteFilters.procedimento}
          onValueChange={(value) => onFiltersChange((current) => ({ ...current, procedimento: value }))} placeholder="Procedimento" />
      </>}
      <DateInput id="patient-attendance-start-date" className="filter-field" label="Data inicial do atendimento" value={pacienteFilters.dataInicio}
        max={pacienteFilters.dataFinal || undefined} onChange={(value) => onFiltersChange((current) => ({ ...current, dataInicio: value }))} />
      <DateInput id="patient-attendance-end-date" className="filter-field" label="Data final do atendimento" value={pacienteFilters.dataFinal}
        min={pacienteFilters.dataInicio || undefined} onChange={(value) => onFiltersChange((current) => ({ ...current, dataFinal: value }))} />
      <DateInput id="patient-request-start-date" className="filter-field" label="Data inicial da solicitação" value={pacienteFilters.dataSolicitacaoInicio}
        max={pacienteFilters.dataSolicitacaoFinal || undefined} onChange={(value) => onFiltersChange((current) => ({ ...current, dataSolicitacaoInicio: value }))} />
      <DateInput id="patient-request-end-date" className="filter-field" label="Data final da solicitação" value={pacienteFilters.dataSolicitacaoFinal}
        min={pacienteFilters.dataSolicitacaoInicio || undefined} onChange={(value) => onFiltersChange((current) => ({ ...current, dataSolicitacaoFinal: value }))} />
      <Button className="patient-clear-filters" onClick={onClearFilters}><X size={17} />Limpar filtros</Button>
    </div>
  );
}
