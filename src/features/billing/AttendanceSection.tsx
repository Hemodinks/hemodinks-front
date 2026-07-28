import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { Plus } from 'lucide-react';
import { Button, DataPanel } from '../../shared/components/ui';
import type { AtendimentoCirurgico } from './billingDomainTypes';
import type {
  Convenio,
  MedicalUserOption,
  OpmeFornecedor,
  Paciente,
} from '../../shared/domain/clinicalContracts';
import type { AtendimentoFormState, AtendimentoProcedureDraft } from './billingPageTypes';
import { AttendanceForm } from './AttendanceForm';
import { AttendancesTable } from './AttendanceSectionParts';

type AttendanceSectionProps = {
  editingId: number | null;
  showForm: boolean;
  form: AtendimentoFormState;
  procedimentos: AtendimentoProcedureDraft[];
  pacientes: Paciente[];
  hospitais: Array<{ id: number; nome: string }>;
  convenios: Convenio[];
  opmeFornecedores: OpmeFornecedor[];
  medicalUsers: MedicalUserOption[];
  isMedical: boolean;
  loading: boolean;
  atendimentos: AtendimentoCirurgico[];
  setForm: Dispatch<SetStateAction<AtendimentoFormState>>;
  setProcedimentos: Dispatch<SetStateAction<AtendimentoProcedureDraft[]>>;
  onToggleForm: () => void;
  onOpenCbhpm: () => void;
  onSubmit: (event: FormEvent) => void;
  onCancelEditing: () => void;
  onSelect: (item: AtendimentoCirurgico) => void;
  onEdit: (item: AtendimentoCirurgico) => void;
  onDelete: (item: AtendimentoCirurgico) => void;
};

export function AttendanceSection(props: AttendanceSectionProps) {
  return (
    <>
      <DataPanel>
        <div className="billing-section-heading">
          <div>
            <span className="eyebrow">Origem clínica</span>
            <h3>Atendimentos cirúrgicos</h3>
          </div>
          {!props.editingId && (
            <Button variant="primary" onClick={props.onToggleForm}>
              <Plus size={16} /> Novo atendimento
            </Button>
          )}
        </div>
        {props.showForm && (
          <AttendanceForm
            editingId={props.editingId}
            form={props.form}
            procedimentos={props.procedimentos}
            pacientes={props.pacientes}
            hospitais={props.hospitais}
            convenios={props.convenios}
            opmeFornecedores={props.opmeFornecedores}
            medicalUsers={props.medicalUsers}
            isMedical={props.isMedical}
            loading={props.loading}
            setForm={props.setForm}
            setProcedimentos={props.setProcedimentos}
            onOpenCbhpm={props.onOpenCbhpm}
            onSubmit={props.onSubmit}
            onCancelEditing={props.onCancelEditing}
          />
        )}
      </DataPanel>
      <AttendancesTable
        atendimentos={props.atendimentos}
        onSelect={props.onSelect}
        onEdit={props.onEdit}
        onDelete={props.onDelete}
      />
    </>
  );
}
