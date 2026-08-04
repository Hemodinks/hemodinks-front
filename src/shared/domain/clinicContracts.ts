export type SystemSettings = {
  id: number;
  nomeEmpresa: string;
  fotoEmpresa?: string | null;
  dataCadastro: string;
  dataAtualizacao?: string | null;
};

export type UpdateSystemSettingsPayload = {
  nomeEmpresa: string;
  fotoEmpresa?: string | null;
};

export type PublicClinic = {
  id: number;
  nome: string;
  slug: string;
  fotoUrl?: string | null;
};

export type PlatformClinic = {
  id: number;
  nome: string;
  slug: string;
  fotoUrl?: string | null;
  ativa: boolean;
  plano: string;
  modulosLiberados: string[];
  assinaturaStatus: string;
  trialAte?: string | null;
  assinaturaValidaAte?: string | null;
  limiteUsuarios?: number | null;
  usuarios?: number | null;
  dataCadastro: string;
  dataAtualizacao?: string | null;
};

export type ClinicPayload = {
  nome: string;
  slug: string;
  ativa?: boolean;
  plano?: string;
  modulosLiberados?: string[];
  assinaturaStatus?: string;
  trialAte?: string | null;
  assinaturaValidaAte?: string | null;
  limiteUsuarios?: number | null;
  fotoClinica?: string | null;
  administradorNome?: string;
  administradorEmail?: string;
  administradorSenha?: string;
  administradorTelefone?: string | null;
};

export type SessionClinic = {
  clinicaId: number;
  nome: string;
  slug: string;
  userId: number;
  perfilId: number;
  perfil: string;
  modulosLiberados: string[];
  clinicaPadrao: boolean;
  usuarioClinicaId: number;
};

export type SelectClinicResponse = {
  token: string;
  usuarioGlobalId: number;
  clinica: SessionClinic;
};
