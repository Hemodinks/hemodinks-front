import type { FormEvent } from 'react';
import type { AtendimentoCirurgico } from './billingDomainTypes';
import type { AuthSession } from '../../shared/domain/sessionTypes';
import type { Convenio, OpmeFornecedor } from '../../shared/domain/clinicalContracts';
import type { RunBillingAction, SetConfirmAction } from './billingWorkflowTypes';
import { createInitialAtendimentoForm, type useAttendances } from './attendance/useAttendances';

type AttendanceState = ReturnType<typeof useAttendances>;

type AttendanceWorkflowOptions = {
  session: AuthSession;
  isMedical: boolean;
  convenios: Convenio[];
  opmeFornecedores: OpmeFornecedor[];
  attendance: AttendanceState;
  run: RunBillingAction;
  setError: (message: string) => void;
  setConfirmAction: SetConfirmAction;
};

export function useAttendanceWorkflow({
  session,
  isMedical,
  convenios,
  opmeFornecedores,
  attendance,
  run,
  setError,
  setConfirmAction,
}: AttendanceWorkflowOptions) {
  const {
    atendimentoForm,
    editingAttendanceId,
    hospitais,
    procedimentos,
    removeAttendance,
    saveAttendance,
    setAtendimentoForm,
    setCbhpmModalOpen,
    setEditingAttendanceId,
    setProcedimentos,
    setSelectedAttendance,
    setShowForm,
  } = attendance;

  const resetForm = () => {
    setEditingAttendanceId(null);
    setAtendimentoForm(createInitialAtendimentoForm(isMedical ? String(session.user.id) : ''));
    setProcedimentos([]);
    setShowForm(false);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!atendimentoForm.pacienteId) {
      setError('Selecione o paciente.');
      return;
    }
    if (!atendimentoForm.dataProcedimento) {
      setError('Informe a data da cirurgia.');
      return;
    }
    if (!atendimentoForm.medicoResponsavelId) {
      setError('Selecione o médico responsável.');
      return;
    }
    const team = [
      atendimentoForm.medicoResponsavelId,
      atendimentoForm.medicoAuxiliar1Id,
      atendimentoForm.medicoAuxiliar2Id,
    ].filter(Boolean);
    if (new Set(team).size !== team.length) {
      setError('O médico responsável e os auxiliares devem ser diferentes.');
      return;
    }
    if (!procedimentos.length) {
      setError('Adicione ao menos um procedimento ao atendimento.');
      return;
    }
    const valorGlosa = atendimentoForm.valorGlosa
      ? Number(atendimentoForm.valorGlosa.replace(',', '.'))
      : null;
    if (valorGlosa != null && valorGlosa < 0) {
      setError('O valor da glosa não pode ser negativo.');
      return;
    }
    if (valorGlosa && !atendimentoForm.motivoGlosa.trim()) {
      setError('Informe o motivo da glosa.');
      return;
    }
    const payload = {
      pacienteId: Number(atendimentoForm.pacienteId),
      dataProcedimento: atendimentoForm.dataProcedimento,
      hospitalId: atendimentoForm.hospitalId ? Number(atendimentoForm.hospitalId) : null,
      hospital: atendimentoForm.hospital.trim() || null,
      convenioId: atendimentoForm.convenioId ? Number(atendimentoForm.convenioId) : null,
      convenio: atendimentoForm.convenio.trim() || null,
      opmeFornecedorId: atendimentoForm.opmeFornecedorId
        ? Number(atendimentoForm.opmeFornecedorId)
        : null,
      opmeFornecedor: atendimentoForm.opmeFornecedor.trim() || null,
      medicoResponsavelId: Number(atendimentoForm.medicoResponsavelId),
      medicoAuxiliar1Id: atendimentoForm.medicoAuxiliar1Id
        ? Number(atendimentoForm.medicoAuxiliar1Id)
        : null,
      medicoAuxiliar2Id: atendimentoForm.medicoAuxiliar2Id
        ? Number(atendimentoForm.medicoAuxiliar2Id)
        : null,
      diagnostico: atendimentoForm.diagnostico || null,
      tratamentoMedico: atendimentoForm.tratamentoMedico || null,
      numeroAutorizacao: atendimentoForm.numeroAutorizacao || null,
      valorGlosa,
      motivoGlosa: valorGlosa ? atendimentoForm.motivoGlosa.trim() : null,
      status: atendimentoForm.status,
      procedimentos: procedimentos.map(({ porte, valorReferencia: _, ...procedure }) => ({
        ...procedure,
        cbhpmPorte: porte || null,
      })),
    };
    void run(
      async () => {
        const saved = await saveAttendance(editingAttendanceId, payload, session.token);
        resetForm();
        return saved;
      },
      editingAttendanceId ? 'Atendimento atualizado.' : 'Atendimento criado com snapshot de preço.',
    );
  };

  const edit = (item: AtendimentoCirurgico) => {
    setEditingAttendanceId(item.id);
    setAtendimentoForm({
      pacienteId: String(item.pacienteId),
      dataProcedimento: item.dataProcedimento.slice(0, 10),
      hospitalId: item.hospitalId ? String(item.hospitalId) : '',
      hospital: hospitais.find((hospital) => hospital.id === item.hospitalId)?.nome ?? '',
      convenioId: item.convenioId ? String(item.convenioId) : '',
      convenio:
        convenios.find((convenio) => convenio.idConvenio === item.convenioId)?.descricaoConvenio ??
        '',
      opmeFornecedorId: item.opmeFornecedorId ? String(item.opmeFornecedorId) : '',
      opmeFornecedor:
        opmeFornecedores.find((supplier) => supplier.idFornecedor === item.opmeFornecedorId)
          ?.fornecedor ??
        item.opmeFornecedor ??
        '',
      medicoResponsavelId: String(item.medicoResponsavelId),
      medicoAuxiliar1Id: item.medicoAuxiliar1Id ? String(item.medicoAuxiliar1Id) : '',
      medicoAuxiliar2Id: item.medicoAuxiliar2Id ? String(item.medicoAuxiliar2Id) : '',
      diagnostico: item.diagnostico ?? '',
      tratamentoMedico: item.tratamentoMedico ?? '',
      cbhpmCodigo: '',
      descricao: '',
      quantidade: '1',
      pesoPercentual: '100',
      numeroAutorizacao: item.numeroAutorizacao ?? '',
      valorGlosa: item.valorGlosa != null ? String(item.valorGlosa) : '',
      motivoGlosa: item.motivoGlosa ?? '',
      status: item.status,
    });
    setProcedimentos(
      item.procedimentos.map((procedure) => ({
        cbhpmCodigo: procedure.cbhpmCodigo ?? null,
        descricao: procedure.descricao,
        porte: procedure.cbhpmPorte ?? null,
        valorReferencia: procedure.valorReferencia ?? null,
        quantidade: procedure.quantidade,
        pesoPercentual: procedure.pesoPercentual,
      })),
    );
    setSelectedAttendance(null);
    setShowForm(true);
  };

  const confirmDelete = (item: AtendimentoCirurgico, closeAfter = false) => {
    setConfirmAction({
      title: 'Excluir atendimento',
      message: `Excluir o atendimento de ${item.paciente}? Esta ação não poderá ser desfeita.`,
      action: () => removeAttendance(item.id, session.token),
      success: 'Atendimento excluído.',
      after: closeAfter ? () => setSelectedAttendance(null) : undefined,
    });
  };

  const selectCbhpm = (item: {
    codigo?: string | null;
    procedimento: string;
    porte?: string | null;
    valorReferencia?: number | null;
  }) => {
    setProcedimentos((current) => {
      const alreadyAdded = current.some(
        (procedure) =>
          procedure.cbhpmCodigo === (item.codigo || null) &&
          procedure.descricao === item.procedimento,
      );
      if (alreadyAdded) return current;

      return [
        ...current,
        {
          cbhpmCodigo: item.codigo || null,
          descricao: item.procedimento,
          porte: item.porte ?? null,
          valorReferencia: item.valorReferencia ?? null,
          quantidade: 1,
          pesoPercentual: 100,
        },
      ];
    });
    setCbhpmModalOpen(false);
  };

  return { resetForm, submit, edit, confirmDelete, selectCbhpm };
}
