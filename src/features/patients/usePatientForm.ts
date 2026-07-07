import { useMemo, useState } from 'react';
import type { Paciente, PacienteFormData } from '../../types';
import { emptyPacienteForm, getPacienteFormData } from './patientUtils';

export function usePatientForm(pacientes: Paciente[]) {
  const [pacienteFormData, setPacienteFormData] = useState<PacienteFormData>(emptyPacienteForm);
  const [editingPacienteId, setEditingPacienteId] = useState<number | null>(null);
  const [editingPacienteDetails, setEditingPacienteDetails] = useState<Paciente | null>(null);
  const [pacienteFormLoading, setPacienteFormLoading] = useState(false);
  const [pacienteFormError, setPacienteFormError] = useState('');
  const [patientFileInputKey, setPatientFileInputKey] = useState(0);
  const [patientPhotoInputKey, setPatientPhotoInputKey] = useState(0);
  const [pendingPatientFiles, setPendingPatientFiles] = useState<File[]>([]);

  const editingPaciente = useMemo(
    () => editingPacienteDetails ?? pacientes.find((paciente) => paciente.id === editingPacienteId) ?? null,
    [editingPacienteDetails, editingPacienteId, pacientes],
  );

  const resetPacienteForm = () => {
    setPacienteFormData(emptyPacienteForm);
    setEditingPacienteId(null);
    setEditingPacienteDetails(null);
    setPacienteFormError('');
    setPendingPatientFiles([]);
    setPatientFileInputKey((key) => key + 1);
    setPatientPhotoInputKey((key) => key + 1);
  };

  const applyPacienteToForm = (paciente: Paciente) => {
    setEditingPacienteId(paciente.id);
    setEditingPacienteDetails(paciente);
    setPacienteFormData(getPacienteFormData(paciente));
    setPatientFileInputKey((key) => key + 1);
    setPatientPhotoInputKey((key) => key + 1);
  };

  return {
    pacienteFormData,
    setPacienteFormData,
    editingPacienteId,
    setEditingPacienteId,
    editingPacienteDetails,
    setEditingPacienteDetails,
    editingPaciente,
    pacienteFormLoading,
    setPacienteFormLoading,
    pacienteFormError,
    setPacienteFormError,
    patientFileInputKey,
    patientPhotoInputKey,
    setPatientPhotoInputKey,
    pendingPatientFiles,
    setPendingPatientFiles,
    resetPacienteForm,
    applyPacienteToForm,
  };
}
