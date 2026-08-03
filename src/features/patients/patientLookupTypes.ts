import type { MedicalUserOption } from '../../shared/domain/clinicalContracts';
import type { Convenio, Hospital, OpmeFornecedor } from './patientTypes';

export type PatientLookups = {
  medicalUsers: MedicalUserOption[];
  hospitais: Hospital[];
  hospitaisError: string;
  convenios: Convenio[];
  conveniosError: string;
  opmeFornecedores: OpmeFornecedor[];
  opmeFornecedoresError: string;
};
