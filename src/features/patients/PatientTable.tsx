import { ChevronLeft, ChevronRight, Eye, FileText, Info, MessageSquareText, Pencil, Trash2 } from 'lucide-react';
import { IconButton } from '../../shared/components/ui';
import { SortableTableHeader } from '../../shared/components/SortableTableHeader';
import { scrollListCarousel } from '../../shared/utils/carousel';
import { formatPersonName, toDisplayDate } from '../../shared/utils/formatters';
import type { PatientListProps } from './patientListTypes';

type PatientTableProps = Pick<PatientListProps,
  | 'pacientes' | 'pacientesLoading' | 'sortBy' | 'sortDirection' | 'sessionToken' | 'canEditPatients'
  | 'canDeletePatients' | 'canManageObservacoes' | 'patientReadOnly' | 'onSortChange' | 'onEditPaciente'
  | 'onDeletePaciente' | 'onOpenPacienteFiles' | 'onOpenPacienteObservacoes' | 'onSelectPatientInfo'
>;

export function PatientTable(props: PatientTableProps) {
  const patientActionLabel = props.patientReadOnly || !props.canEditPatients ? 'Visualizar' : 'Editar';
  const sortHeader = (field: string, label: string) => <SortableTableHeader field={field} label={label} activeField={props.sortBy}
    direction={props.sortDirection} onSortChange={props.onSortChange} />;
  return <div className="carousel-shell">
    <button type="button" className="carousel-nav carousel-nav-left" onClick={(event) => scrollListCarousel(event, 'previous')}
      aria-label="Voltar no carrossel de pacientes" title="Voltar no carrossel"><ChevronLeft size={20} /></button>
    <div className="table-wrap list-carousel-wrap patients-carousel-wrap"><table className="patients-table">
      <thead><tr>
        {sortHeader('nome', 'Paciente')}<th>Ações</th>{sortHeader('data', 'Data da solicitação')}
        {sortHeader('dataAtendimento', 'Cirurgias Consolidadas')}<th>Info</th>{sortHeader('medico', 'Cirurgião')}
        {sortHeader('status', 'Status Pago')}{sortHeader('arquivos', 'Arquivos')}<th>Obs.</th>
      </tr></thead>
      <tbody>{props.pacientesLoading
        ? <tr><td colSpan={9} className="empty-row">Carregando pacientes...</td></tr>
        : props.pacientes.length ? props.pacientes.map((paciente) => {
          const unreadObservations = paciente.observacoesNaoLidasCount ?? 0;
          const hasUnreadObservations = unreadObservations > 0;
          const patientDisplayName = formatPersonName(paciente.nomePaciente);
          const fileCount = paciente.arquivosCount ?? paciente.arquivos.length;
          return <tr key={paciente.id}>
            <td data-label="Paciente"><div className="name-cell"><span>{patientDisplayName}</span></div></td>
            <td data-label="Ações"><div className="row-actions">
              <IconButton label={`${patientActionLabel} ${patientDisplayName}`} tone="muted" onClick={() => void props.onEditPaciente(paciente)} title={patientActionLabel}>
                {props.patientReadOnly || !props.canEditPatients ? <Eye size={17} /> : <Pencil size={17} />}</IconButton>
              {props.canDeletePatients && <IconButton label={`Excluir ${patientDisplayName}`} tone="danger" onClick={() => void props.onDeletePaciente(paciente)} title="Excluir"><Trash2 size={17} /></IconButton>}
            </div></td>
            <td data-label="Data da solicitação">{toDisplayDate(paciente.data) || '-'}</td>
            <td data-label="Cirurgias Consolidadas">{toDisplayDate(paciente.dataAtendimento || '') || '-'}</td>
            <td data-label="Info"><button type="button" className="status-info-button" title="Ver informações adicionais"
              aria-label={`Informações adicionais de ${patientDisplayName}`} onClick={() => props.onSelectPatientInfo(paciente)}><Info size={18} /></button></td>
            <td data-label="Cirurgião">{formatPersonName(paciente.medico) || '-'}</td>
            <td data-label="Status Pago"><span className={`status-pill ${paciente.statusPago ? 'ok' : 'warning'}`}>{paciente.statusPago ? 'Pago' : 'Pendente'}</span></td>
            <td data-label="Arquivos">{fileCount > 0
              ? <button type="button" className="attachment-count attachment-button" onClick={() => void props.onOpenPacienteFiles(paciente)}
                title="Ver arquivos anexos" aria-label={`Arquivos anexos de ${patientDisplayName}`}><FileText size={15} />{fileCount}</button>
              : <span className="attachment-count"><FileText size={15} />0</span>}</td>
            <td data-label="Observações">{props.canManageObservacoes && !props.patientReadOnly
              ? <button type="button" className={`patient-observation-button${hasUnreadObservations ? ' has-unread-observations' : ''}`}
                onClick={() => void props.onOpenPacienteObservacoes(paciente)} title="Abrir observações" aria-label={`Observações de ${patientDisplayName}`}>
                <MessageSquareText size={16} /><span className="patient-observation-count">{unreadObservations}</span></button>
              : <span className={`attachment-count patient-observation-count${hasUnreadObservations ? ' has-unread-observations' : ''}`}>
                <MessageSquareText size={15} />{unreadObservations}</span>}</td>
          </tr>;
        }) : <tr><td colSpan={9} className="empty-row">Nenhum paciente encontrado.</td></tr>}
      </tbody>
    </table></div>
    <button type="button" className="carousel-nav carousel-nav-right" onClick={(event) => scrollListCarousel(event, 'next')}
      aria-label="Avançar no carrossel de pacientes" title="Avançar no carrossel"><ChevronRight size={20} /></button>
  </div>;
}
