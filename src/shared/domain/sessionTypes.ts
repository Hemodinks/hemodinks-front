export type LicenseFeature =
  | 'Dashboard.Visualizar'
  | 'Pacientes.Visualizar'
  | 'Pacientes.Gerenciar'
  | 'Cbhpm.Consultar'
  | (string & {});

export type SessionLicense = {
  id?: number | null;
  userId: number;
  controleAplicavel?: boolean;
  plano?: string;
  status?: string;
  dataInicioTrial?: string | null;
  dataFimTrial?: string | null;
  dataFimLicenca?: string | null;
  featuresLiberadas?: LicenseFeature[];
  featuresEfetivas: LicenseFeature[];
  trialExpirado?: boolean;
  licencaExpirada?: boolean;
  ativa?: boolean;
  acessoCompleto?: boolean;
  diasRestantesTrial?: number;
  observacoes?: string | null;
  dataCadastro?: string | null;
  dataAtualizacao?: string | null;
};

export type LoginSessionResponse = {
  id: number;
  usuarioGlobalId?: number;
  clinicaId?: number;
  clinicaSlug?: string | null;
  nome: string;
  email: string;
  cpf?: string | null;
  crm?: string | null;
  crmUf?: string | null;
  token: string;
  fotoPerfil?: string | null;
  precisaTrocarSenha: boolean;
  perfilId: number;
  perfilNome: string;
  modulosLiberados?: string[];
  licenca?: SessionLicense | null;
};

export type SessionUser = Pick<
  LoginSessionResponse,
  | 'id'
  | 'clinicaId'
  | 'clinicaSlug'
  | 'nome'
  | 'email'
  | 'cpf'
  | 'crm'
  | 'crmUf'
  | 'fotoPerfil'
  | 'precisaTrocarSenha'
  | 'perfilId'
  | 'perfilNome'
  | 'modulosLiberados'
  | 'licenca'
>;

export type AuthSession = {
  token: string;
  user: SessionUser;
};
