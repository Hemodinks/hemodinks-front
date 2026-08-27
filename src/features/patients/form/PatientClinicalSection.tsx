import type { Dispatch, SetStateAction } from 'react';
import type { Convenio, Hospital, OpmeFornecedor, PacienteFormData } from '../../../types';
import { AlertMessage, ComboboxField } from '../../../shared/components/ui';
import {
  findConvenioByDescription,
  findHospitalByName,
  findOpmeFornecedorByName,
  formatPersonName,
  MAX_NAME_LENGTH,
} from '../../../shared/utils/formatters';

export type MedicalTeamField = 'medico' | 'medicoAuxiliar1' | 'medicoAuxiliar2';

type Props = {
  formData: PacienteFormData;
  setFormData: Dispatch<SetStateAction<PacienteFormData>>;
  formReadOnly: boolean;
  hospitais: Hospital[];
  hospitaisError: string;
  convenios: Convenio[];
  conveniosError: string;
  opmeFornecedores: OpmeFornecedor[];
  opmeFornecedoresError: string;
  medicalUsersAvailable: boolean;
  getMedicalOptions: (field: MedicalTeamField) => string[];
  updateMedicalTeamMember: (field: MedicalTeamField, value: string) => void;
};

export function PatientClinicalSection({
  formData,
  setFormData,
  formReadOnly,
  hospitais,
  hospitaisError,
  convenios,
  conveniosError,
  opmeFornecedores,
  opmeFornecedoresError,
  medicalUsersAvailable,
  getMedicalOptions,
  updateMedicalTeamMember,
}: Props) {
  return (
    <div className="patient-form-clinical-grid">
      <div className="patient-form-clinical-column">
        <div className="patient-form-slot">
          <ComboboxField
            label="Convênio"
            value={formData.convenio}
            options={convenios.map((convenio) => convenio.descricaoConvenio)}
            onValueChange={(value) => {
              const convenio = value.slice(0, MAX_NAME_LENGTH);
              const selectedConvenio = findConvenioByDescription(convenios, convenio);
              setFormData((current) => ({ ...current, convenioId: selectedConvenio?.idConvenio ?? null, convenio }));
            }}
            disabled={formReadOnly}
            maxLength={MAX_NAME_LENGTH}
            placeholder={convenios.length ? 'Selecione ou digite o convênio' : 'Digite o convênio'}
            noOptionsLabel="Novo convênio: será cadastrado ao salvar."
          />
          {conveniosError && <AlertMessage type="error">{conveniosError}</AlertMessage>}
        </div>
        <div className="patient-form-slot">
          <ComboboxField
            label="Hospital"
            value={formData.hospital}
            options={hospitais.map((hospital) => hospital.nome)}
            onValueChange={(value) => {
              const hospital = value.slice(0, MAX_NAME_LENGTH);
              const selectedHospital = findHospitalByName(hospitais, hospital);
              setFormData((current) => ({ ...current, hospitalId: selectedHospital?.id ?? null, hospital }));
            }}
            disabled={formReadOnly}
            maxLength={MAX_NAME_LENGTH}
            placeholder={hospitais.length ? 'Selecione ou digite o hospital' : 'Digite o hospital'}
            noOptionsLabel="Novo hospital: será cadastrado ao salvar."
            required
          />
          {hospitaisError && <AlertMessage type="error">{hospitaisError}</AlertMessage>}
        </div>
        <div className="patient-form-slot">
          <ComboboxField
            label="Fornecedor OPME"
            value={formData.opmeFornecedor}
            options={opmeFornecedores.map((fornecedor) => fornecedor.fornecedor)}
            onValueChange={(value) => {
              const opmeFornecedor = value.slice(0, MAX_NAME_LENGTH);
              const selectedFornecedor = findOpmeFornecedorByName(opmeFornecedores, opmeFornecedor);
              setFormData((current) => ({ ...current, opmeFornecedorId: selectedFornecedor?.idFornecedor ?? null, opmeFornecedor }));
            }}
            maxLength={MAX_NAME_LENGTH}
            placeholder={opmeFornecedores.length ? 'Selecione ou digite o fornecedor OPME' : 'Digite o fornecedor OPME'}
            noOptionsLabel="Novo fornecedor: será cadastrado ao salvar."
          />
          {opmeFornecedoresError && <AlertMessage type="error">{opmeFornecedoresError}</AlertMessage>}
        </div>
      </div>
      <div className="patient-form-clinical-column">
        <div className="patient-form-slot">
          <ComboboxField
            label="Cirurgião"
            value={formatPersonName(formData.medico)}
            options={getMedicalOptions('medico')}
            onValueChange={(value) => updateMedicalTeamMember('medico', value)}
            disabled={formReadOnly || (!medicalUsersAvailable && !formData.medico)}
            placeholder={medicalUsersAvailable ? 'Digite para buscar um cirurgião' : 'Nenhum médico cadastrado'}
          />
        </div>
        <div className="patient-form-slot">
          <ComboboxField
            label="Médico auxiliar 1"
            value={formatPersonName(formData.medicoAuxiliar1)}
            options={getMedicalOptions('medicoAuxiliar1')}
            onValueChange={(value) => updateMedicalTeamMember('medicoAuxiliar1', value)}
            disabled={formReadOnly || (!medicalUsersAvailable && !formData.medicoAuxiliar1)}
            placeholder={medicalUsersAvailable ? 'Digite para buscar um médico auxiliar' : 'Nenhum médico cadastrado'}
          />
        </div>
        <div className="patient-form-slot">
          <ComboboxField
            label="Médico auxiliar 2"
            value={formatPersonName(formData.medicoAuxiliar2)}
            options={getMedicalOptions('medicoAuxiliar2')}
            onValueChange={(value) => updateMedicalTeamMember('medicoAuxiliar2', value)}
            disabled={formReadOnly || (!medicalUsersAvailable && !formData.medicoAuxiliar2)}
            placeholder={medicalUsersAvailable ? 'Digite para buscar um médico auxiliar' : 'Nenhum médico cadastrado'}
          />
        </div>
      </div>
    </div>
  );
}
