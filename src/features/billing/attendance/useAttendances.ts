import { useState, type SetStateAction } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AtendimentoCirurgico } from '../billingDomainTypes';
import type { Paciente } from '../../../shared/domain/clinicalContracts';
import {
  createAtendimento,
  deleteAtendimento,
  getAtendimentos,
  getHospitais,
  getPacientes,
  updateAtendimento,
} from '../../../services';
import type { AtendimentoPayload } from '../../../services/financeiroService';
import type { AtendimentoFormState, AtendimentoProcedureDraft } from '../billingPageTypes';
import { queryKeys } from '../../../shared/queryKeys';

type AttendanceWorkspaceData = {
  atendimentos: AtendimentoCirurgico[];
  pacientes: Paciente[];
  hospitais: Array<{ id: number; nome: string }>;
};

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
    observacao: '',
    status: 'Planejado',
  };
}

export function useAttendances(medicoResponsavelId = '', token = '') {
  const queryClient = useQueryClient();
  const workspaceQuery = useQuery({
    queryKey: queryKeys.billingAttendances(token),
    queryFn: async (): Promise<AttendanceWorkspaceData> => {
      const [atendimentos, patientPage, hospitais] = await Promise.all([
        getAtendimentos(token),
        getPacientes(token, { page: 1, pageSize: 100 }),
        getHospitais(token),
      ]);
      return { atendimentos, pacientes: patientPage.items, hospitais };
    },
    enabled: false,
  });
  const workspace: AttendanceWorkspaceData = workspaceQuery.data ?? {
    atendimentos: [],
    pacientes: [],
    hospitais: [],
  };
  const updateWorkspace = <K extends keyof AttendanceWorkspaceData>(
    key: K,
    value: SetStateAction<AttendanceWorkspaceData[K]>,
  ) => {
    queryClient.setQueryData<AttendanceWorkspaceData>(
      queryKeys.billingAttendances(token),
      (current) => {
        const base = current ?? workspace;
        const nextValue =
          typeof value === 'function'
            ? (value as (previous: AttendanceWorkspaceData[K]) => AttendanceWorkspaceData[K])(
                base[key],
              )
            : value;
        return { ...base, [key]: nextValue };
      },
    );
  };
  const setAtendimentos = (value: SetStateAction<AtendimentoCirurgico[]>) =>
    updateWorkspace('atendimentos', value);
  const setPacientes = (value: SetStateAction<Paciente[]>) => updateWorkspace('pacientes', value);
  const setHospitais = (value: SetStateAction<Array<{ id: number; nome: string }>>) =>
    updateWorkspace('hospitais', value);
  const [showForm, setShowForm] = useState(false);
  const [editingAttendanceId, setEditingAttendanceId] = useState<number | null>(null);
  const [atendimentoForm, setAtendimentoForm] = useState(() =>
    createInitialAtendimentoForm(medicoResponsavelId),
  );
  const [procedimentos, setProcedimentos] = useState<AtendimentoProcedureDraft[]>([]);
  const [selectedAttendance, setSelectedAttendance] = useState<AtendimentoCirurgico | null>(null);
  const [cbhpmModalOpen, setCbhpmModalOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const loadAttendances = async (_token: string) => {
    const result = await workspaceQuery.refetch();
    if (result.error) {
      throw result.error;
    }
  };
  const saveAttendance = (id: number | null, payload: AtendimentoPayload, token: string) =>
    id ? updateAtendimento(id, payload, token) : createAtendimento(payload, token);
  const removeAttendance = (id: number, token: string) => deleteAtendimento(id, token);

  return {
    atendimentos: workspace.atendimentos,
    setAtendimentos,
    pacientes: workspace.pacientes,
    setPacientes,
    hospitais: workspace.hospitais,
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
    pendingFiles,
    setPendingFiles,
    fileInputKey,
    setFileInputKey,
    loadAttendances,
    saveAttendance,
    removeAttendance,
  };
}
