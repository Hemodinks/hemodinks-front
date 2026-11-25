// Item de GET /api/auditoria-clinica (#315). Nomes resolvidos pela API na consulta; ids quando o usuario nao existe mais.
export type AuditoriaClinicaItem = {
  id: number;
  dataUtc: string;
  usuarioId: number | null;
  equipeOperadorId: number | null;
  usuarioNome?: string | null;
  equipeOperadorNome?: string | null;
  acao: string;
  recurso: string;
  recursoId: string | null;
  statusCode: number;
  sucesso: boolean;
  ipTruncado: string | null;
  // Paciente afetado (tambem em acoes de atendimento) e detalhe em JSON (motivo ou antes/depois).
  pacienteId?: number | null;
  pacienteNome?: string | null;
  detalhe?: string | null;
};

// Conteudo de `detalhe`: texto livre clinico vem so como textoAlterado, sem valores.
export type AuditoriaAlteracao = { campo: string; de?: string | null; para?: string | null; textoAlterado?: boolean };
export type AuditoriaDetalhe = { motivo?: string; alteracoes?: AuditoriaAlteracao[] };

export type AuditoriaConfiguracao = { auditarAtendimentos: boolean };
