// Contrato de GET /api/platform/sessoes-ativas (somente SuperAdministrador).
export type PlatformActiveSession = {
  usuarioGlobalId: number;
  nome: string;
  perfil: string;
  clinicaId: number;
  clinica: string;
  viaEquipe: boolean;
  inicio: string;
  ultimaAtividade: string;
  navegador: string;
};

export type PlatformActiveSessionsByClinic = {
  clinicaId: number;
  clinica: string;
  usuarios: number;
  sessoes: number;
};

export type PlatformActiveSessionsResponse = {
  geradoEm: string;
  janelaOciosidadeMinutos: number;
  usuariosOnline: number;
  totalSessoes: number;
  porClinica: PlatformActiveSessionsByClinic[];
  pagina: number;
  tamanhoPagina: number;
  items: PlatformActiveSession[];
  // #331: usuários sem sessão ativa com atividade na janela recente (um por usuário). Ausente em API anterior.
  janelaRecenteHoras?: number;
  recentes?: PlatformActiveSession[];
};
