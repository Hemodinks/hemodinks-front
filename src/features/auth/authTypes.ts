export type LicencaFeature =
  | "Dashboard.Visualizar"
  | "Pacientes.Visualizar"
  | "Pacientes.Gerenciar"
  | "Cbhpm.Consultar"
  | (string & {});

export type Licenca = {
  id?: number | null;
  userId: number;
  controleAplicavel?: boolean;
  plano?: string;
  status?: string;
  dataInicioTrial?: string | null;
  dataFimTrial?: string | null;
  dataFimLicenca?: string | null;
  featuresLiberadas?: LicencaFeature[];
  featuresEfetivas: LicencaFeature[];
  trialExpirado?: boolean;
  licencaExpirada?: boolean;
  ativa?: boolean;
  acessoCompleto?: boolean;
  diasRestantesTrial?: number;
  observacoes?: string | null;
  dataCadastro?: string | null;
  dataAtualizacao?: string | null;
};

export type LoginResponse = {
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
  licenca?: Licenca | null;
};

export type SessionUser = Pick<
  LoginResponse,
  | "id"
  | "clinicaId"
  | "clinicaSlug"
  | "nome"
  | "email"
  | "cpf"
  | "crm"
  | "crmUf"
  | "fotoPerfil"
  | "precisaTrocarSenha"
  | "perfilId"
  | "perfilNome"
  | "modulosLiberados"
  | "licenca"
>;

export type AuthSession = {
  token: string;
  user: SessionUser;
};
