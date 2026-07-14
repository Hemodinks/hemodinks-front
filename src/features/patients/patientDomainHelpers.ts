import {
  ALLOWED_PATIENT_FILE_TYPES,
  findConvenioByDescription,
  findHospitalByName,
  findMedicalUserByName,
  findOpmeFornecedorByName,
  MAX_PATIENT_FILE_BYTES,
} from '../../shared/utils/formatters';
import type {
  Convenio,
  Hospital,
  MedicalUserOption,
  OpmeFornecedor,
  PacienteFormData,
} from '../../types';
import { toPacientePayload } from './patientUtils';

export const LIST_CACHE_TIME_MS = 20 * 1000;
export const LOOKUP_CACHE_TIME_MS = 30 * 60 * 1000;

export function getInvalidPatientFileMessage(files: File[]) {
  const invalidFile = files.find((file) => !ALLOWED_PATIENT_FILE_TYPES.has(file.type) || file.size > MAX_PATIENT_FILE_BYTES);

  return invalidFile
    ? 'Use PDF, DOC, DOCX, JPG, JPEG, PNG, XLS, XLSX, TXT, CSV, PPT ou PPTX de ate 10 MB.'
    : '';
}

export function resolveMedicalSelection(
  medicalUsers: MedicalUserOption[],
  userId: number | null,
  nome: string,
) {
  const trimmedName = nome.trim();
  const selectedUser = userId != null
    ? medicalUsers.find((user) => user.id === userId)
    : findMedicalUserByName(medicalUsers, trimmedName);

  return {
    selectedUser,
    trimmedName,
    hasScopedSelection: Boolean(trimmedName && userId != null && !selectedUser),
  };
}

type BuildPatientPayloadWithLookupsOptions = {
  pacienteFormData: PacienteFormData;
  medicalUsers: MedicalUserOption[];
  hospitais: Hospital[];
  convenios: Convenio[];
  opmeFornecedores: OpmeFornecedor[];
};

export function buildPatientPayloadWithLookups({
  pacienteFormData,
  medicalUsers,
  hospitais,
  convenios,
  opmeFornecedores,
}: BuildPatientPayloadWithLookupsOptions) {
  const selectedMedico = resolveMedicalSelection(
    medicalUsers,
    pacienteFormData.medicoUserId,
    pacienteFormData.medico,
  );
  const selectedMedicoAuxiliar1 = resolveMedicalSelection(
    medicalUsers,
    pacienteFormData.medicoAuxiliar1UserId,
    pacienteFormData.medicoAuxiliar1,
  );
  const selectedMedicoAuxiliar2 = resolveMedicalSelection(
    medicalUsers,
    pacienteFormData.medicoAuxiliar2UserId,
    pacienteFormData.medicoAuxiliar2,
  );
  const selectedHospital = pacienteFormData.hospitalId != null
    ? hospitais.find((hospital) => hospital.id === pacienteFormData.hospitalId)
    : findHospitalByName(hospitais, pacienteFormData.hospital);
  const selectedConvenio = pacienteFormData.convenioId != null
    ? convenios.find((convenio) => convenio.idConvenio === pacienteFormData.convenioId)
    : findConvenioByDescription(convenios, pacienteFormData.convenio);
  const selectedOpmeFornecedor = pacienteFormData.opmeFornecedorId != null
    ? opmeFornecedores.find((fornecedor) => fornecedor.idFornecedor === pacienteFormData.opmeFornecedorId)
    : findOpmeFornecedorByName(opmeFornecedores, pacienteFormData.opmeFornecedor);

  return {
    selectedMedico,
    selectedMedicoAuxiliar1,
    selectedMedicoAuxiliar2,
    payload: toPacientePayload({
      ...pacienteFormData,
      medicoUserId: selectedMedico.selectedUser?.id ?? pacienteFormData.medicoUserId,
      medico: selectedMedico.selectedUser?.nome ?? selectedMedico.trimmedName,
      medicoAuxiliar1UserId: selectedMedicoAuxiliar1.selectedUser?.id ?? pacienteFormData.medicoAuxiliar1UserId,
      medicoAuxiliar1: selectedMedicoAuxiliar1.selectedUser?.nome ?? selectedMedicoAuxiliar1.trimmedName,
      medicoAuxiliar2UserId: selectedMedicoAuxiliar2.selectedUser?.id ?? pacienteFormData.medicoAuxiliar2UserId,
      medicoAuxiliar2: selectedMedicoAuxiliar2.selectedUser?.nome ?? selectedMedicoAuxiliar2.trimmedName,
      hospitalId: selectedHospital?.id ?? null,
      hospital: selectedHospital?.nome ?? pacienteFormData.hospital,
      convenioId: selectedConvenio?.idConvenio ?? null,
      convenio: selectedConvenio?.descricaoConvenio ?? pacienteFormData.convenio,
      opmeFornecedorId: selectedOpmeFornecedor?.idFornecedor ?? null,
      opmeFornecedor: selectedOpmeFornecedor?.fornecedor ?? pacienteFormData.opmeFornecedor,
    }),
  };
}
