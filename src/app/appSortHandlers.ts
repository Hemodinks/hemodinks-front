import type { MedicalGroupsDomainState } from '../features/medicalGroups/useMedicalGroupsDomain';
import type { PatientsDomainState } from '../features/patients/usePatientsDomain';
import type { UsersDomainState } from '../features/users/useUsersDomain';
import { updateSort } from './appSort';

export function createAppSortHandlers(
  users: UsersDomainState,
  patients: PatientsDomainState,
  medicalGroups: MedicalGroupsDomainState,
) {
  return {
    handleUserSortChange: (field: string) => updateSort(
      field,
      users.sortBy,
      users.setCurrentPage,
      users.setSortBy,
      users.setSortDirection,
      field === 'recent' ? 'desc' : 'asc',
    ),
    handlePacienteSortChange: (field: string) => updateSort(
      field,
      patients.sortBy,
      patients.setPacienteCurrentPage,
      patients.setSortBy,
      patients.setSortDirection,
      field === 'recent' || field === 'data' ? 'desc' : 'asc',
    ),
    handleCbhpmSortChange: (field: string) => updateSort(
      field,
      patients.cbhpmSortBy,
      patients.setCbhpmCurrentPage,
      patients.setCbhpmSortBy,
      patients.setCbhpmSortDirection,
      'asc',
    ),
    handleMedicalGroupSortChange: (field: string) => updateSort(
      field,
      medicalGroups.sortBy,
      medicalGroups.setCurrentPage,
      medicalGroups.setSortBy,
      medicalGroups.setSortDirection,
      field === 'recent' ? 'desc' : 'asc',
    ),
  };
}
