import { CheckCircle2 } from 'lucide-react';
import { AlertMessage, DataPanel, ToastMessage } from '../../shared/components/ui';
import { PatientFilters } from './PatientFilters';
import { PatientListToolbar } from './PatientListToolbar';
import { PatientPagination } from './PatientPagination';
import { PatientTable } from './PatientTable';
import type { PatientListProps } from './patientListTypes';

export function PatientList(props: PatientListProps) {
  return <DataPanel data-tour="patients-list">
    <PatientListToolbar {...props}><PatientFilters {...props} /></PatientListToolbar>
    {props.pacienteSuccessMessage && <ToastMessage type="success" icon={<CheckCircle2 size={17} />}>{props.pacienteSuccessMessage}</ToastMessage>}
    {props.pacientesError && <AlertMessage type="error">{props.pacientesError}</AlertMessage>}
    <PatientTable {...props} />
    <PatientPagination {...props} />
  </DataPanel>;
}
