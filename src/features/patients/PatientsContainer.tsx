import type { ModuleMode } from '../../appTypes';
import { PatientsPage } from './PatientsPage';
import type { PatientsDomainState } from './usePatientsDomain';

type PatientsContainerProps = {
  moduleMode: ModuleMode;
  domain: PatientsDomainState;
  access: {
    canCreatePatients: boolean;
    canEditPatients: boolean;
    canDeletePatients: boolean;
    canManageObservacoes: boolean;
    patientReadOnly: boolean;
    isAdmin: boolean;
    isMedical: boolean;
  };
  sessionToken: string;
  onSortChange: (field: string) => void;
};

export function PatientsContainer({
  moduleMode,
  domain,
  access,
  sessionToken,
  onSortChange,
}: PatientsContainerProps) {
  return (
    <PatientsPage
      moduleMode={moduleMode}
      canCreatePatients={access.canCreatePatients}
      canEditPatients={access.canEditPatients}
      canDeletePatients={access.canDeletePatients}
      canManageObservacoes={access.canManageObservacoes}
      patientReadOnly={access.patientReadOnly}
      editingPacienteId={domain.editingPacienteId}
      editingPaciente={domain.editingPaciente}
      pacienteFormData={domain.pacienteFormData}
      pacienteFormError={domain.pacienteFormError}
      pacienteFormLoading={domain.pacienteFormLoading}
      pendingPatientFiles={domain.pendingPatientFiles}
      patientFileInputKey={domain.patientFileInputKey}
      pacientes={domain.paginatedPacientes}
      pacientesLoading={domain.pacientesLoading}
      pacientesError={domain.pacientesError}
      pacienteSuccessMessage={domain.pacienteSuccessMessage}
      pacientesTotalItems={domain.pacientesTotalItems}
      pacienteVisibleStart={domain.pacienteVisibleStart}
      pacienteVisibleEnd={domain.pacienteVisibleEnd}
      pacienteCurrentPage={domain.pacienteCurrentPage}
      pacienteTotalPages={domain.pacienteTotalPages}
      pacienteSearchTerm={domain.pacienteSearchTerm}
      sortBy={domain.sortBy}
      sortDirection={domain.sortDirection}
      pacienteFilters={domain.pacienteFilters}
      pacienteExportLoading={domain.pacienteExportLoading}
      pacienteExportScope={domain.pacienteExportScope}
      hospitais={domain.hospitais}
      hospitaisError={domain.hospitaisError}
      medicalUsers={domain.medicalUsers}
      convenios={domain.convenios}
      conveniosError={domain.conveniosError}
      opmeFornecedores={domain.opmeFornecedores}
      opmeFornecedoresError={domain.opmeFornecedoresError}
      isAdmin={access.isAdmin}
      isMedical={access.isMedical}
      sessionToken={sessionToken}
      setPacienteFormData={domain.setPacienteFormData}
      setPacienteSearchTerm={domain.setPacienteSearchTerm}
      setPacienteFilters={domain.setPacienteFilters}
      setPacienteExportScope={domain.setPacienteExportScope}
      setPacienteCurrentPage={domain.setPacienteCurrentPage}
      onSortChange={onSortChange}
      closePacienteForm={domain.closePacienteForm}
      openNewPacienteForm={domain.openNewPacienteForm}
      handleSubmitPaciente={domain.handleSubmitPaciente}
      handleOpenCbhpmModal={domain.handleOpenCbhpmModal}
      handleRemovePacienteProcedimento={domain.handleRemovePacienteProcedimento}
      handlePacienteFilesChange={domain.handlePacienteFilesChange}
      removePendingPatientFile={domain.removePendingPatientFile}
      handleDeletePacienteArquivo={domain.handleDeletePacienteArquivo}
      handleExportPacientes={domain.handleExportPacientes}
      handleEditPaciente={domain.handleEditPaciente}
      handleDeletePaciente={domain.handleDeletePaciente}
      handleOpenPacienteFiles={domain.handleOpenPacienteFiles}
      handleOpenPacienteObservacoes={domain.handleOpenPacienteObservacoes}
      setSelectedPatientInfo={domain.setSelectedPatientInfo}
      clearPacienteFilters={domain.clearPacienteFilters}
      refreshPacientes={domain.refreshPacientes}
    />
  );
}
