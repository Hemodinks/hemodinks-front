export type MedicalUserOption = {
  id: number;
  nome: string;
  email: string;
};

export type Hospital = {
  id: number;
  nome: string;
};

export type Convenio = {
  idConvenio: number;
  descricaoConvenio: string;
};

export type OpmeFornecedor = {
  idFornecedor: number;
  fornecedor: string;
};

export type CbhpmGeral = {
  id: number;
  codigo: string;
  procedimento: string;
  porte?: string | null;
  custoOperacional?: number | null;
  valorReferencia?: number | null;
  capitulo?: string | null;
  grupo?: string | null;
  paginaPdf?: number | null;
};

export type PacienteProcedimento = {
  id?: number;
  cbhpmCodigo?: string | null;
  cbhpmPorte?: string | null;
  procedimento: string;
  valorReferencia?: number | null;
  ordem?: number | null;
};

export type PacienteArquivo = {
  id: number;
  nomeOriginal: string;
  contentType: string;
  tamanhoBytes: number;
  url: string;
  dataUpload: string;
};

export type PacienteFaturamento = {
  id: number;
  pacienteId: number;
  honorariosCirurgiao?: number | null;
  honorariosAuxiliares?: number | null;
  honorariosAnestesista?: number | null;
  anestesistaFaturadoSeparado: boolean;
  anestesista?: string | null;
  codigoTussCbhpmAmb?: string | null;
  porteCirurgicoAnestesico?: string | null;
  guiaAutorizacaoConvenio?: string | null;
  guiaInternacaoOuSadt?: string | null;
  opmeMateriaisEspeciais?: string | null;
  tissXmlStatus?: string | null;
  valorGlosa?: number | null;
  glosaStatus?: string | null;
  recursoGlosa?: string | null;
  conferenciaPagamentoRealizada: boolean;
  repasseMedico?: number | null;
  repasseMedicoObservacao?: string | null;
  tipoFaturamentoParticular?: string | null;
  reciboNotaContrato?: string | null;
  observacoes?: string | null;
  dataCadastro: string;
  dataAtualizacao?: string | null;
  competenciaInicio?: string | null;
  competenciaFinal?: string | null;
};

export type Paciente = {
  id: number;
  userId: number;
  data?: string | null;
  dataCadastro?: string | null;
  dataCriacao?: string | null;
  dataAtualizacao?: string | null;
  dataAlteracao?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  modifiedAt?: string | null;
  nomePaciente: string;
  diagnostico?: string | null;
  tratamentoMedico?: string | null;
  hospitalId?: number | null;
  hospital?: string | null;
  medicoUserId?: number | null;
  medico?: string | null;
  medicoAuxiliar1UserId?: number | null;
  medicoAuxiliar1?: string | null;
  medicoAuxiliar2UserId?: number | null;
  medicoAuxiliar2?: string | null;
  convenioId?: number | null;
  convenio?: string | null;
  opmeFornecedorId?: number | null;
  opmeFornecedor?: string | null;
  cbhpmCodigo?: string | null;
  cbhpmPorte?: string | null;
  procedimento?: string | null;
  procedimentos?: PacienteProcedimento[];
  autorizacao?: string | null;
  pagamento?: string | null;
  repasseGlosa?: string | null;
  statusPago: boolean;
  cpf?: string | null;
  email: string | null;
  telefone: string | null;
  fotoPerfil?: string | null;
  dataNascimento?: string | null;
  ativo: boolean;
  arquivosCount: number;
  observacoesNaoLidasCount?: number;
  faturamento?: PacienteFaturamento | null;
  arquivos: PacienteArquivo[];
};

export type PublicClinic = {
  id: number;
  nome: string;
  slug: string;
  fotoUrl?: string | null;
};

export type PacienteFinanceiroResumo = {
  valorApresentado: number;
  valorGlosado: number;
  valorReconhecido: number;
  valorRecebido: number;
  saldoAberto: number;
  statusFinanceiro: string;
  origemDados: 'Normalizado' | 'Legado';
  avisos: string[];
};
