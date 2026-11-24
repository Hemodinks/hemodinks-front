export type CbhpmListQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  codigo?: string;
  procedimento?: string;
  porte?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
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
