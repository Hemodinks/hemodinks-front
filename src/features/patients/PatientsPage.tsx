import { type ChangeEvent, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import type { Convenio, Hospital, OpmeFornecedor, Paciente, PacienteFormData, User } from '../../types';
import type { ModuleMode, PacienteExportFormat, PacienteExportScope, PacienteFilters } from '../../appTypes';
import { PatientForm } from './PatientForm';
import { PatientList } from './PatientList';

type PatientsPageProps = {
  moduleMode: ModuleMode;
  canCreatePatients: boolean;
  canEditPatients: boolean;
  canDeletePatients: boolean;
  patientReadOnly: boolean;
  editingPacienteId: number | null;
  editingPaciente: Paciente | null;
  pacienteFormData: PacienteFormData;
  pacienteFormError: string;
  pacienteFormLoading: boolean;
  pendingPatientFiles: File[];
  patientFileInputKey: number;
  pacientes: Paciente[];
  pacientesLoading: boolean;
  pacientesError: string;
  pacienteSuccessMessage: string;
  pacientesTotalItems: number;
  pacienteVisibleStart: number;
  pacienteVisibleEnd: number;
  pacienteCurrentPage: number;
  pacienteTotalPages: number;
  pacienteSearchTerm: string;
  pacienteFilters: PacienteFilters;
  pacienteExportLoading: PacienteExportFormat | null;
  pacienteExportScope: PacienteExportScope;
  hospitais: Hospital[];
  hospitaisError: string;
  medicalUsers: User[];
  convenios: Convenio[];
  conveniosError: string;
  opmeFornecedores: OpmeFornecedor[];
  opmeFornecedoresError: string;
  isAdmin: boolean;
  isMedical: boolean;
  sessionToken: string;
  setPacienteFormData: Dispatch<SetStateAction<PacienteFormData>>;
  setPacienteSearchTerm: (value: string) => void;
  setPacienteFilters: Dispatch<SetStateAction<PacienteFilters>>;
  setPacienteExportScope: (scope: PacienteExportScope) => void;
  setPacienteCurrentPage: (page: number | ((current: number) => number)) => void;
  closePacienteForm: () => void;
  openNewPacienteForm: () => void;
  handleSubmitPaciente: (event: FormEvent<HTMLFormElement>) => void;
  handleOpenCbhpmModal: () => void;
  handleRemovePacienteProcedimento: (index: number) => void;
  handlePacienteFilesChange: (event: ChangeEvent<HTMLInputElement>) => void;
  removePendingPatientFile: (index: number) => void;
  handleDeletePacienteArquivo: (paciente: Paciente, arquivoId: number) => void | Promise<void>;
  handleExportPacientes: (format: PacienteExportFormat) => void | Promise<void>;
  handleEditPaciente: (paciente: Paciente) => void | Promise<void>;
  handleDeletePaciente: (paciente: Paciente) => void | Promise<void>;
  handleOpenPacienteFiles: (paciente: Paciente) => void | Promise<void>;
  setSelectedPatientInfo: (paciente: Paciente) => void;
  clearPacienteFilters: () => void;
  refreshPacientes: () => void;
};

export function PatientsPage({
  moduleMode,
  canCreatePatients,
  canEditPatients,
  canDeletePatients,
  patientReadOnly,
  editingPacienteId,
  editingPaciente,
  pacienteFormData,
  pacienteFormError,
  pacienteFormLoading,
  pendingPatientFiles,
  patientFileInputKey,
  pacientes,
  pacientesLoading,
  pacientesError,
  pacienteSuccessMessage,
  pacientesTotalItems,
  pacienteVisibleStart,
  pacienteVisibleEnd,
  pacienteCurrentPage,
  pacienteTotalPages,
  pacienteSearchTerm,
  pacienteFilters,
  pacienteExportLoading,
  pacienteExportScope,
  hospitais,
  hospitaisError,
  medicalUsers,
  convenios,
  conveniosError,
  opmeFornecedores,
  opmeFornecedoresError,
  isAdmin,
  isMedical,
  sessionToken,
  setPacienteFormData,
  setPacienteSearchTerm,
  setPacienteFilters,
  setPacienteExportScope,
  setPacienteCurrentPage,
  closePacienteForm,
  openNewPacienteForm,
  handleSubmitPaciente,
  handleOpenCbhpmModal,
  handleRemovePacienteProcedimento,
  handlePacienteFilesChange,
  removePendingPatientFile,
  handleDeletePacienteArquivo,
  handleExportPacientes,
  handleEditPaciente,
  handleDeletePaciente,
  handleOpenPacienteFiles,
  setSelectedPatientInfo,
  clearPacienteFilters,
  refreshPacientes,
}: PatientsPageProps) {
  return (
    <section className="workspace patients-workspace">
      {moduleMode === 'form' ? (
        <PatientForm
          canEditPatients={canEditPatients}
          editingPacienteId={editingPacienteId}
          editingPaciente={editingPaciente}
          patientReadOnly={patientReadOnly}
          pacienteFormData={pacienteFormData}
          pacienteFormError={pacienteFormError}
          pacienteFormLoading={pacienteFormLoading}
          pendingPatientFiles={pendingPatientFiles}
          patientFileInputKey={patientFileInputKey}
          hospitais={hospitais}
          hospitaisError={hospitaisError}
          medicalUsers={medicalUsers}
          convenios={convenios}
          conveniosError={conveniosError}
          opmeFornecedores={opmeFornecedores}
          opmeFornecedoresError={opmeFornecedoresError}
          isMedical={isMedical}
          setPacienteFormData={setPacienteFormData}
          onClose={closePacienteForm}
          onSubmit={handleSubmitPaciente}
          onOpenCbhpmModal={handleOpenCbhpmModal}
          onRemovePacienteProcedimento={handleRemovePacienteProcedimento}
          onPacienteFilesChange={handlePacienteFilesChange}
          onRemovePendingPatientFile={removePendingPatientFile}
          onDeletePacienteArquivo={handleDeletePacienteArquivo}
        />
      ) : (
        <PatientList
          pacientes={pacientes}
          pacientesLoading={pacientesLoading}
          pacientesError={pacientesError}
          pacienteSuccessMessage={pacienteSuccessMessage}
          pacientesTotalItems={pacientesTotalItems}
          pacienteVisibleStart={pacienteVisibleStart}
          pacienteVisibleEnd={pacienteVisibleEnd}
          pacienteCurrentPage={pacienteCurrentPage}
          pacienteTotalPages={pacienteTotalPages}
          pacienteSearchTerm={pacienteSearchTerm}
          pacienteFilters={pacienteFilters}
          pacienteExportLoading={pacienteExportLoading}
          pacienteExportScope={pacienteExportScope}
          sessionToken={sessionToken}
          canCreatePatients={canCreatePatients}
          canEditPatients={canEditPatients}
          canDeletePatients={canDeletePatients}
          patientReadOnly={patientReadOnly}
          isAdmin={isAdmin}
          hasMedicalUsers={medicalUsers.length > 0}
          hasConvenios={convenios.length > 0}
          onSearchChange={setPacienteSearchTerm}
          onFiltersChange={setPacienteFilters}
          onClearFilters={clearPacienteFilters}
          onExportScopeChange={setPacienteExportScope}
          onPageChange={setPacienteCurrentPage}
          onRefresh={refreshPacientes}
          onOpenNewPacienteForm={openNewPacienteForm}
          onExportPacientes={handleExportPacientes}
          onEditPaciente={handleEditPaciente}
          onDeletePaciente={handleDeletePaciente}
          onOpenPacienteFiles={handleOpenPacienteFiles}
          onSelectPatientInfo={setSelectedPatientInfo}
        />
      )}
    </section>
  );
}
