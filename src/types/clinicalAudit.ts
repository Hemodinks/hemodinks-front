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
};
