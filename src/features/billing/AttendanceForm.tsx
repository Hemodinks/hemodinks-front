import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { Save, X } from 'lucide-react';
import { Button, ComboboxField, SelectField, TextField } from '../../shared/components/ui';
import type {
  Convenio,
  MedicalUserOption,
  OpmeFornecedor,
  Paciente,
} from '../../shared/domain/clinicalContracts';
import type { AtendimentoFormState, AtendimentoProcedureDraft } from './billingPageTypes';
import { AttendanceProceduresField } from './AttendanceSectionParts';

type AttendanceFormProps = {
  editingId: number | null;
  form: AtendimentoFormState;
  procedimentos: AtendimentoProcedureDraft[];
  pacientes: Paciente[];
  hospitais: Array<{ id: number; nome: string }>;
  convenios: Convenio[];
  opmeFornecedores: OpmeFornecedor[];
  medicalUsers: MedicalUserOption[];
  isMedical: boolean;
  loading: boolean;
  setForm: Dispatch<SetStateAction<AtendimentoFormState>>;
  setProcedimentos: Dispatch<SetStateAction<AtendimentoProcedureDraft[]>>;
  onOpenCbhpm: () => void;
  onSubmit: (event: FormEvent) => void;
  onCancelEditing: () => void;
};

export function AttendanceForm({
  editingId,
  form,
  procedimentos,
  pacientes,
  hospitais,
  convenios,
  opmeFornecedores,
  medicalUsers,
  isMedical,
  loading,
  setForm,
  setProcedimentos,
  onOpenCbhpm,
  onSubmit,
  onCancelEditing,
}: AttendanceFormProps) {
  return (
    <form className="billing-filter-grid billing-attendance-form" onSubmit={onSubmit}>
      <SelectField
        label="Paciente"
        value={form.pacienteId}
        required
        onChange={(event) => setForm((current) => ({ ...current, pacienteId: event.target.value }))}
      >
        <option value="">Selecione</option>
        {pacientes.map((paciente) => (
          <option key={paciente.id} value={paciente.id}>
            {paciente.nomePaciente}
          </option>
        ))}
      </SelectField>
      <TextField
        label="Data da cirurgia"
        type="date"
        value={form.dataProcedimento}
        required
        onValueChange={(dataProcedimento) =>
          setForm((current) => ({ ...current, dataProcedimento }))
        }
      />
      <ComboboxField
        label="Hospital"
        value={form.hospital}
        options={hospitais.map((item) => item.nome)}
        placeholder="Não informado"
        noOptionsLabel="Digite para cadastrar um novo hospital."
        onValueChange={(value) => {
          const selected = hospitais.find(
            (item) => item.nome.localeCompare(value.trim(), 'pt-BR', { sensitivity: 'base' }) === 0,
          );
          setForm((current) => ({
            ...current,
            hospitalId: selected ? String(selected.id) : '',
            hospital: value,
          }));
        }}
      />
      <ComboboxField
        label="Fornecedor OPME"
        value={form.opmeFornecedor}
        options={opmeFornecedores.map((item) => item.fornecedor)}
        placeholder="Não informado"
        noOptionsLabel="Digite para cadastrar um novo fornecedor OPME."
        onValueChange={(value) => {
          const selected = opmeFornecedores.find(
            (item) =>
              item.fornecedor.localeCompare(value.trim(), 'pt-BR', {
                sensitivity: 'base',
              }) === 0,
          );
          setForm((current) => ({
            ...current,
            opmeFornecedorId: selected ? String(selected.idFornecedor) : '',
            opmeFornecedor: value,
          }));
        }}
      />
      <ComboboxField
        label="Convênio"
        value={form.convenio}
        options={convenios.map((item) => item.descricaoConvenio)}
        placeholder="Particular"
        noOptionsLabel="Digite para cadastrar um novo convênio."
        onValueChange={(value) => {
          const selected = convenios.find(
            (item) =>
              item.descricaoConvenio.localeCompare(value.trim(), 'pt-BR', {
                sensitivity: 'base',
              }) === 0,
          );
          setForm((current) => ({
            ...current,
            convenioId: selected ? String(selected.idConvenio) : '',
            convenio: value,
          }));
        }}
      />
      <SelectField
        label="Médico responsável"
        value={form.medicoResponsavelId}
        required
        disabled={isMedical}
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            medicoResponsavelId: event.target.value,
          }))
        }
      >
        <option value="">Selecione</option>
        {medicalUsers.map((user) => (
          <option key={user.id} value={user.id}>
            {user.nome}
          </option>
        ))}
      </SelectField>
      <SelectField
        label="Médico auxiliar 1"
        value={form.medicoAuxiliar1Id}
        onChange={(event) =>
          setForm((current) => ({ ...current, medicoAuxiliar1Id: event.target.value }))
        }
      >
        <option value="">Não informado</option>
        {medicalUsers
          .filter((user) => String(user.id) !== form.medicoResponsavelId)
          .map((user) => (
            <option key={user.id} value={user.id}>
              {user.nome}
            </option>
          ))}
      </SelectField>
      <SelectField
        label="Médico auxiliar 2"
        value={form.medicoAuxiliar2Id}
        onChange={(event) =>
          setForm((current) => ({ ...current, medicoAuxiliar2Id: event.target.value }))
        }
      >
        <option value="">Não informado</option>
        {medicalUsers
          .filter(
            (user) =>
              String(user.id) !== form.medicoResponsavelId &&
              String(user.id) !== form.medicoAuxiliar1Id,
          )
          .map((user) => (
            <option key={user.id} value={user.id}>
              {user.nome}
            </option>
          ))}
      </SelectField>
      <TextField
        label="Diagnóstico"
        value={form.diagnostico}
        onValueChange={(diagnostico) => setForm((current) => ({ ...current, diagnostico }))}
      />
      <TextField
        label="Tratamento médico"
        value={form.tratamentoMedico}
        onValueChange={(tratamentoMedico) =>
          setForm((current) => ({ ...current, tratamentoMedico }))
        }
      />
      <AttendanceProceduresField
        procedimentos={procedimentos}
        setProcedimentos={setProcedimentos}
        onOpenCbhpm={onOpenCbhpm}
      />
      <TextField
        label="Autorização"
        className="billing-attendance-authorization"
        value={form.numeroAutorizacao}
        onValueChange={(numeroAutorizacao) =>
          setForm((current) => ({ ...current, numeroAutorizacao }))
        }
      />
      <SelectField
        label="Status"
        className="billing-attendance-status"
        value={form.status}
        onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
      >
        {['Planejado', 'Autorizado', 'Realizado', 'Cancelado'].map((status) => (
          <option key={status}>{status}</option>
        ))}
      </SelectField>
      <div className="billing-attendance-glosa">
        <TextField
          label="Valor da glosa"
          type="number"
          min="0"
          step="0.01"
          value={form.valorGlosa}
          onValueChange={(valorGlosa) => setForm((current) => ({ ...current, valorGlosa }))}
        />
        <TextField
          label="Motivo da glosa"
          value={form.motivoGlosa}
          required={Number(form.valorGlosa) > 0}
          onValueChange={(motivoGlosa) => setForm((current) => ({ ...current, motivoGlosa }))}
        />
      </div>
      <div className="billing-form-actions">
        <Button variant="primary" type="submit" disabled={loading}>
          <Save size={16} />
          {editingId ? 'Atualizar atendimento' : 'Salvar atendimento'}
        </Button>
        {editingId && (
          <Button variant="danger-ghost" type="button" onClick={onCancelEditing}>
            <X size={16} /> Cancelar edição
          </Button>
        )}
      </div>
    </form>
  );
}
