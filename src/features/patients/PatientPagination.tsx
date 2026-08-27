import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton } from '../../shared/components/ui';
import type { PatientListProps } from './patientListTypes';

type PatientPaginationProps = Pick<PatientListProps,
  'pacienteVisibleStart' | 'pacienteVisibleEnd' | 'pacientesTotalItems' | 'pacienteCurrentPage' | 'pacienteTotalPages' | 'onPageChange'
>;

export function PatientPagination(props: PatientPaginationProps) {
  return <div className="pagination-bar">
    <span>{props.pacienteVisibleStart}-{props.pacienteVisibleEnd} de {props.pacientesTotalItems}</span>
    <div className="pagination-actions">
      <IconButton label="Página anterior de pacientes" onClick={() => props.onPageChange((page) => Math.max(1, page - 1))}
        disabled={props.pacienteCurrentPage === 1} title="Página anterior"><ChevronLeft size={18} /></IconButton>
      <span className="page-indicator">Página {props.pacienteCurrentPage} de {props.pacienteTotalPages}</span>
      <IconButton label="Próxima página de pacientes" onClick={() => props.onPageChange((page) => Math.min(props.pacienteTotalPages, page + 1))}
        disabled={props.pacienteCurrentPage === props.pacienteTotalPages} title="Próxima página"><ChevronRight size={18} /></IconButton>
    </div>
  </div>;
}
