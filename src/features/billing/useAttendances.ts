import { useState } from 'react';
import type { AtendimentoCirurgico } from './billingDomainTypes';
import type { Paciente } from '../../shared/domain/clinicalContracts';
import {
  createAtendimento,
  deleteAtendimento,
  getAtendimentos,
  getHospitais,
  getPacientes,
  updateAtendimento,
} from '../../services';
import type { AtendimentoPayload } from '../../services/financeiroService';
import type { AtendimentoFormState, AtendimentoProcedureDraft } from './billingPageTypes';

export function createInitialAtendimentoForm(medicoResponsavelId = ''): AtendimentoFormState {
  return {
    pacienteId: '',
    dataProcedimento: '',
    hospitalId: '',
    hospital: '',
    convenioId: '',
    convenio: '',
    opmeFornecedorId: '',
    opmeFornecedor: '',
    medicoResponsavelId,
    medicoAuxiliar1Id: '',
    medicoAuxiliar2Id: '',
    diagnostico: '',
    tratamentoMedico: '',
    cbhpmCodigo: '',
    descricao: '',
    quantidade: '1',
    pesoPercentual: '100',
    numeroAutorizacao: '',
    valorGlosa: '',
    motivoGlosa: '',
    status: 'Planejado',
  };
}

export function useAttendances(medicoResponsavelId = '') {
  const [atendimentos, setAtendimentos] = useState<AtendimentoCirurgico[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [hospitais, setHospitais] = useState<Array<{ id: number; nome: string }>>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAttendanceId, setEditingAttendanceId] = useState<number | null>(null);
  const [atendimentoForm, setAtendimentoForm] = useState(() =>
    createInitialAtendimentoForm(medicoResponsavelId),
  );
  const [procedimentos, setProcedimentos] = useState<AtendimentoProcedureDraft[]>([]);
  const [selectedAttendance, setSelectedAttendance] = useState<AtendimentoCirurgico | null>(null);
  const [cbhpmModalOpen, setCbhpmModalOpen] = useState(false);
  const loadAttendances = async (token: string) => {
    const [items, patientPage, hospitalItems] = await Promise.all([
      getAtendimentos(token),
      getPacientes(token, { page: 1, pageSize: 100 }),
      getHospitais(token),
    ]);
    setAtendimentos(items);
    setPacientes(patientPage.items);
    setHospitais(hospitalItems);
  };
  const saveAttendance = (id: number | null, payload: AtendimentoPayload, token: string) =>
    id ? updateAtendimento(id, payload, token) : createAtendimento(payload, token);
  const removeAttendance = (id: number, token: string) => deleteAtendimento(id, token);

  return {
    atendimentos,
    setAtendimentos,
    pacientes,
    setPacientes,
    hospitais,
    setHospitais,
    showForm,
    setShowForm,
    editingAttendanceId,
    setEditingAttendanceId,
    atendimentoForm,
    setAtendimentoForm,
    procedimentos,
    setProcedimentos,
    selectedAttendance,
    setSelectedAttendance,
    cbhpmModalOpen,
    setCbhpmModalOpen,
    loadAttendances,
    saveAttendance,
    removeAttendance,
  };
}
