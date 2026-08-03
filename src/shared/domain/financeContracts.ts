export type AtendimentoStatus = 'Planejado' | 'Autorizado' | 'Realizado' | 'Cancelado';

export type AtendimentoArquivo = {
  id: number;
  nomeOriginal: string;
  contentType: string;
  tamanhoBytes: number;
  url: string;
  dataUpload: string;
};

export type AtendimentoProcedimento = {
  id: number;
  cbhpmCodigo?: string | null;
  cbhpmPorte?: string | null;
  descricao: string;
  quantidade: number;
  pesoPercentual: number;
  valorReferencia?: number | null;
  valorNegociado?: number | null;
  ordem: number;
};

export type AtendimentoCirurgico = {
  id: number;
  pacienteId: number;
  paciente: string;
  dataProcedimento: string;
  hospitalId?: number | null;
  convenioId?: number | null;
  opmeFornecedorId?: number | null;
  opmeFornecedor?: string | null;
  medicoResponsavelId: number;
  medicoAuxiliar1Id?: number | null;
  medicoAuxiliar2Id?: number | null;
  diagnostico?: string | null;
  tratamentoMedico?: string | null;
  numeroAutorizacao?: string | null;
  valorGlosa?: number | null;
  motivoGlosa?: string | null;
  observacao?: string | null;
  status: AtendimentoStatus;
  dataCadastro?: string | null;
  dataAtualizacao?: string | null;
  procedimentos: AtendimentoProcedimento[];
  arquivos?: AtendimentoArquivo[];
};

export type FaturamentoStatus =
  | 'Rascunho'
  | 'ProntoParaEnvio'
  | 'Enviado'
  | 'EmAnalise'
  | 'GlosadoParcial'
  | 'GlosadoTotal'
  | 'Aprovado'
  | 'ParcialmentePago'
  | 'Pago'
  | 'Cancelado';

export type Faturamento = {
  id: number;
  atendimentoCirurgicoId: number;
  pacienteId: number;
  paciente: string;
  convenioId?: number | null;
  numeroGuia?: string | null;
  numeroLote?: string | null;
  competencia: string;
  dataEnvio?: string | null;
  dataRetorno?: string | null;
  valorApresentado: number;
  valorGlosado: number;
  valorGlosaRecuperada: number;
  valorReconhecido: number;
  status: FaturamentoStatus;
  observacao?: string | null;
  dataCadastro?: string | null;
  dataAtualizacao?: string | null;
  rowVersion: string;
  itens: Array<{
    id: number;
    atendimentoProcedimentoId?: number | null;
    codigo?: string | null;
    descricao: string;
    quantidade: number;
    pesoPercentual: number;
    valorUnitario: number;
    valorApresentado: number;
    valorGlosado: number;
    valorAprovado: number;
    status: string;
    ordem: number;
  }>;
  glosas: Array<{
    id: number;
    faturamentoItemId?: number | null;
    codigoMotivo?: string | null;
    descricaoMotivo: string;
    valorGlosado: number;
    dataGlosa: string;
    status: string;
    observacao?: string | null;
    recursos: Array<{
      id: number;
      dataEnvio?: string | null;
      justificativa: string;
      valorRecorrido: number;
      dataResposta?: string | null;
      valorRecuperado: number;
      status: string;
      observacao?: string | null;
    }>;
  }>;
};

export type Recebimento = {
  id: number;
  dataRecebimento: string;
  valorRecebido: number;
  formaRecebimento: string;
  referenciaBancaria?: string | null;
  documentoComprovante?: string | null;
  estornado: boolean;
  dataEstorno?: string | null;
  motivoEstorno?: string | null;
};

export type ContaReceber = {
  id: number;
  faturamentoId: number;
  pacienteId: number;
  paciente: string;
  convenioId?: number | null;
  numeroDocumento: string;
  descricao: string;
  competencia: string;
  dataEmissao: string;
  dataVencimento: string;
  valorOriginal: number;
  valorAjustado: number;
  valorRecebido: number;
  saldoAberto: number;
  status: string;
  observacao?: string | null;
  dataCadastro?: string | null;
  dataAtualizacao?: string | null;
  rowVersion: string;
  recebimentos: Recebimento[];
};

export type ConvenioProcedimentoPreco = {
  id: number;
  convenioId: number;
  cbhpmCodigo: string;
  valorNegociado: number;
  percentualPrincipal: number;
  percentualAuxiliar1: number;
  percentualAuxiliar2: number;
  vigenciaInicio: string;
  vigenciaFinal?: string | null;
  ativo: boolean;
};

export type FinanceiroResumo = {
  valorApresentado: number;
  valorGlosado: number;
  valorRecuperado: number;
  valorReconhecido: number;
  valorRecebido: number;
  saldoAberto: number;
  valorVencido: number;
  recebimentosPeriodo: number;
  titulosVencidos: number;
  porCompetencia: Array<{
    competencia: string;
    apresentado: number;
    reconhecido: number;
    recebido: number;
    saldoAberto: number;
  }>;
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
