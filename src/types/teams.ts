export type TeamIdentificationMode = "Nenhuma" | "Selecao" | "Pin";

export type TeamMember = {
  userId: number;
  nome: string;
  email: string;
  perfilId: number;
  operadorId: number;
  operadorAtivo: boolean;
  possuiPin: boolean;
  precisaTrocarPin: boolean;
  bloqueadoAte?: string | null;
};

export type Team = {
  id: number;
  nome: string;
  usuarioLoginId: number;
  email: string;
  modoIdentificacao: TeamIdentificationMode;
  ativa: boolean;
  membros: TeamMember[];
};

export type TeamEligibleUser = {
  usuarioGlobalId?: number | null;
  userIdNaClinica?: number | null;
  nome: string;
  email: string;
  perfilId: number;
  perfilNome: string;
  origemClinica: string;
  cadastradoNaClinica: boolean;
};

export type CreateTeamPayload = {
  nome: string;
  email: string;
  senha: string;
  telefone?: string | null;
  modoIdentificacao: TeamIdentificationMode;
};
